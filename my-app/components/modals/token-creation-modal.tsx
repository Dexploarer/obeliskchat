"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoinsIcon, InfoIcon, ShieldIcon, RocketIcon, CheckCircleIcon, AlertCircleIcon, ExternalLinkIcon, UploadIcon, RefreshCwIcon, FlameIcon, TrendingUpIcon } from "lucide-react"
import { SOLANA_CONFIG } from "@/lib/solana-config"
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { PlatformSelector } from "@/components/ui/platform-selector"
import { LaunchpadPlatform, PLATFORM_CONFIGS, calculateFees } from "@/lib/launchpad-types"
import { createPumpService } from "@/lib/pump-service"
import { createBonkService } from "@/lib/bonk-service"
import { PostLaunchSwap } from "@/components/ui/jupiter-swap"

interface TokenCreationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TokenCreationModal({ open, onOpenChange }: TokenCreationModalProps) {
  const [tokenName, setTokenName] = useState("")
  const [tokenSymbol, setTokenSymbol] = useState("")
  const [totalSupply, setTotalSupply] = useState("")
  const [decimals, setDecimals] = useState("9")
  const [description, setDescription] = useState("")
  const [mintAuthority, setMintAuthority] = useState(true)
  const [freezeAuthority, setFreezeAuthority] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string; signature?: string; mintAddress?: string } | null>(null)
  const [estimatedCost, setEstimatedCost] = useState("0.01")
  const [activeTab, setActiveTab] = useState("platform")
  const [selectedPlatform, setSelectedPlatform] = useState<LaunchpadPlatform>('pump')
  const [initialBuyAmount, setInitialBuyAmount] = useState("0.1")
  const [liquidityAmount, setLiquidityAmount] = useState("0.5")
  const [slippage, setSlippage] = useState("1")
  
  // Estimate deployment cost based on platform
  useEffect(() => {
    const calculateCost = async () => {
      try {
        const platformConfig = PLATFORM_CONFIGS[selectedPlatform]
        let baseCost = platformConfig.requirements.minSol
        
        if (selectedPlatform === 'pump') {
          baseCost += parseFloat(initialBuyAmount) || 0.1
        } else if (selectedPlatform === 'bonk') {
          baseCost += parseFloat(liquidityAmount) || 0.5
        }
        
        // Add network fees
        baseCost += 0.01
        
        setEstimatedCost(baseCost.toFixed(4))
      } catch (error) {
        console.error('Failed to estimate cost:', error)
        setEstimatedCost("0.1")
      }
    }
    
    if (open) {
      calculateCost()
    }
  }, [open, selectedPlatform, initialBuyAmount, liquidityAmount])
  
  const handleDeploy = async () => {
    setIsDeploying(true)
    setDeployResult(null)
    
    try {
      // Validate inputs
      if (!tokenName || !tokenSymbol) {
        throw new Error("Please fill in all required fields")
      }
      
      const connection = new Connection(SOLANA_CONFIG.rpcUrl[SOLANA_CONFIG.network])
      
      // Prepare launch parameters
      const launchParams = {
        platform: selectedPlatform,
        metadata: {
          name: tokenName,
          symbol: tokenSymbol,
          description: description || `${tokenName} token launched on ${selectedPlatform === 'pump' ? 'Pump.fun' : 'LetsBonk.fun'}`,
          image: imageUrl,
          website: websiteUrl
        },
        supply: totalSupply ? parseInt(totalSupply) : undefined,
        decimals: parseInt(decimals),
        initialBuy: selectedPlatform === 'pump' ? parseFloat(initialBuyAmount) : undefined,
        liquidityAmount: selectedPlatform === 'bonk' ? parseFloat(liquidityAmount) : undefined,
        slippage: parseFloat(slippage),
        priorityFee: 0.00001
      }
      
      let result
      
      if (selectedPlatform === 'pump') {
        const pumpService = createPumpService(connection)
        result = await pumpService.createToken(launchParams)
      } else {
        const bonkService = createBonkService(connection)
        result = await bonkService.createToken(launchParams)
      }
      
      if (result.success) {
        setDeployResult({
          success: true,
          message: result.message,
          signature: result.signature,
          mintAddress: result.mintAddress
        })
        // Switch to deploy tab to show result
        setActiveTab("deploy")
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      setDeployResult({
        success: false,
        message: error.message || "Failed to deploy token"
      })
    } finally {
      setIsDeploying(false)
    }
  }
  
  const resetForm = () => {
    setTokenName("")
    setTokenSymbol("")
    setTotalSupply("")
    setDecimals("9")
    setDescription("")
    setImageUrl("")
    setWebsiteUrl("")
    setMintAuthority(true)
    setFreezeAuthority(false)
    setDeployResult(null)
    setActiveTab("platform")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CoinsIcon className="h-5 w-5" />
            Token Creation
          </DialogTitle>
          <DialogDescription>
            Create your own SPL token on Solana
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="platform">Platform</TabsTrigger>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="advanced">Settings</TabsTrigger>
            <TabsTrigger value="deploy">Deploy</TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="mt-4">
            <PlatformSelector 
              value={selectedPlatform} 
              onChange={setSelectedPlatform}
              showComparison={true}
            />
            
            {selectedPlatform === 'pump' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <TrendingUpIcon className="h-4 w-4" />
                    Initial Dev Buy (SOL)
                  </label>
                  <Input
                    type="number"
                    value={initialBuyAmount}
                    onChange={(e) => setInitialBuyAmount(e.target.value)}
                    placeholder="0.1"
                    min="0.02"
                    max="10"
                    step="0.01"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your initial purchase to start the bonding curve
                  </p>
                </div>
              </div>
            )}
            
            {selectedPlatform === 'bonk' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FlameIcon className="h-4 w-4" />
                    Initial Liquidity (SOL)
                  </label>
                  <Input
                    type="number"
                    value={liquidityAmount}
                    onChange={(e) => setLiquidityAmount(e.target.value)}
                    placeholder="0.5"
                    min="0.1"
                    max="100"
                    step="0.1"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Liquidity to add to Raydium pool (30% of fees will be burned to BONK)
                  </p>
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <label className="text-sm font-medium">Slippage Tolerance (%)</label>
              <Input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                placeholder="1"
                min="0.1"
                max="10"
                step="0.1"
                className="mt-1"
              />
            </div>
          </TabsContent>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Token Name</label>
              <Input
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g., My Awesome Token"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Token Symbol</label>
              <Input
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., MAT"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Total Supply</label>
              <Input
                value={totalSupply}
                onChange={(e) => setTotalSupply(e.target.value)}
                placeholder="e.g., 1000000000"
                type="number"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your token's purpose..."
                className="mt-1 h-24"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="metadata" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Token Logo URL</label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: 512x512px PNG or SVG
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Website URL</label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourtoken.com"
                className="mt-1"
              />
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <UploadIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Metadata Storage</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Token metadata will be stored on Arweave for permanent decentralized storage.
                    This ensures your token information is always available.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Decimals</label>
              <Input
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}
                placeholder="9"
                type="number"
                min="0"
                max="9"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {selectedPlatform === 'pump' ? 'Pump.fun uses 6 decimals' : 'Standard is 9 decimals for SPL tokens'}
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Mint Authority</p>
                  <p className="text-sm text-muted-foreground">
                    Allow minting new tokens after creation
                  </p>
                </div>
                <Switch checked={mintAuthority} onCheckedChange={setMintAuthority} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Freeze Authority</p>
                  <p className="text-sm text-muted-foreground">
                    Allow freezing token accounts
                  </p>
                </div>
                <Switch checked={freezeAuthority} onCheckedChange={setFreezeAuthority} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="deploy" className="space-y-4 mt-4">
            {deployResult ? (
              <div className={`border rounded-lg p-4 ${
                deployResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {deployResult.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${
                      deployResult.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {deployResult.message}
                    </p>
                    {deployResult.signature && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Transaction: {deployResult.signature}</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto mt-1"
                          onClick={() => {
                            const explorerUrl = `${SOLANA_CONFIG.explorerUrl[SOLANA_CONFIG.network]}/tx/${deployResult.signature}`
                            window.open(explorerUrl, '_blank')
                          }}
                        >
                          View on Explorer
                          <ExternalLinkIcon className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Ready to Deploy on {selectedPlatform === 'pump' ? 'Pump.fun' : 'LetsBonk.fun'}</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Estimated cost: {estimatedCost} SOL
                    </p>
                    {selectedPlatform === 'pump' && (
                      <p className="text-xs text-blue-700 mt-1">
                        Includes {initialBuyAmount} SOL initial buy • No upfront liquidity
                      </p>
                    )}
                    {selectedPlatform === 'bonk' && (
                      <p className="text-xs text-blue-700 mt-1">
                        Includes {liquidityAmount} SOL liquidity • 30% fees burn to BONK
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Platform:</span>
                <span className="font-medium flex items-center gap-1">
                  {selectedPlatform === 'pump' ? (
                    <><TrendingUpIcon className="h-3 w-3" /> Pump.fun</>
                  ) : (
                    <><FlameIcon className="h-3 w-3 text-orange-500" /> LetsBonk.fun</>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Token Name:</span>
                <span className="font-medium">{tokenName || "Not set"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Token Symbol:</span>
                <span className="font-medium">{tokenSymbol || "Not set"}</span>
              </div>
              {selectedPlatform === 'pump' ? (
                <div className="flex justify-between text-sm">
                  <span>Initial Buy:</span>
                  <span className="font-medium">{initialBuyAmount} SOL</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span>Initial Liquidity:</span>
                  <span className="font-medium">{liquidityAmount} SOL</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Decimals:</span>
                <span className="font-medium">{selectedPlatform === 'pump' ? '6' : decimals}</span>
              </div>
            </div>

            {deployResult?.success ? (
              <div className="space-y-4">
                {deployResult.mintAddress && (
                  <PostLaunchSwap
                    mintAddress={deployResult.mintAddress}
                    tokenSymbol={tokenSymbol}
                    tokenName={tokenName}
                    platform={selectedPlatform}
                    onSwapSuccess={(result) => {
                      console.log('🎉 Post-launch swap completed:', result);
                    }}
                    className="mb-4"
                  />
                )}
                <Button 
                  className="w-full" 
                  size="lg"
                  variant="outline"
                  onClick={resetForm}
                >
                  Create Another Token
                </Button>
              </div>
            ) : (
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleDeploy}
                disabled={isDeploying || !tokenName || !tokenSymbol || !totalSupply}
              >
                {isDeploying ? (
                  <>
                    <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <RocketIcon className="h-4 w-4 mr-2" />
                    Deploy Token
                  </>
                )}
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}