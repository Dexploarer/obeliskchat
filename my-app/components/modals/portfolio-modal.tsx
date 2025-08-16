"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrendingUpIcon, TrendingDownIcon, WalletIcon, DollarSignIcon, SearchIcon, RefreshCwIcon, SendIcon, ArrowRightLeftIcon, CoinsIcon, ExternalLinkIcon } from "lucide-react"
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { SOLANA_CONFIG } from "@/lib/solana-config"

interface PortfolioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Asset {
  symbol: string
  amount: string
  value: string
  change: string
  address?: string
  decimals?: number
}

interface Portfolio {
  totalValue: string
  change24h: string
  changePercent: string
  assets: Asset[]
  walletAddress?: string
}

export function PortfolioModal({ open, onOpenChange }: PortfolioModalProps) {
  const [walletAddress, setWalletAddress] = useState("")
  const [portfolio, setPortfolio] = useState<Portfolio>({
    totalValue: "$0.00",
    change24h: "$0.00",
    changePercent: "0%",
    assets: [],
    walletAddress: ""
  })
  const [loading, setLoading] = useState(false)
  const [inputAddress, setInputAddress] = useState("")
  
  // Load saved wallet address
  useEffect(() => {
    const saved = localStorage.getItem('portfolio-wallet')
    if (saved) {
      setWalletAddress(saved)
      setInputAddress(saved)
    }
  }, [])
  
  // Fetch portfolio when wallet address changes or modal opens
  useEffect(() => {
    if (open && walletAddress) {
      fetchPortfolio(walletAddress)
    }
  }, [open, walletAddress])
  
  const fetchPortfolio = async (address: string) => {
    setLoading(true)
    try {
      const connection = new Connection(SOLANA_CONFIG.rpcUrl[SOLANA_CONFIG.network])
      const pubkey = new PublicKey(address)
      
      // Get SOL balance
      const balance = await connection.getBalance(pubkey)
      const solBalance = balance / LAMPORTS_PER_SOL
      
      // Mock token prices (in production, fetch from CoinGecko)
      const solPrice = Math.random() * 150 + 50 // $50-200
      const solValue = solBalance * solPrice
      
      // Mock other token balances (in production, fetch SPL token accounts)
      const mockAssets: Asset[] = [
        { 
          symbol: "SOL", 
          amount: solBalance.toFixed(4), 
          value: `$${solValue.toFixed(2)}`, 
          change: `${(Math.random() * 20 - 10).toFixed(1)}%`,
          address: "So11111111111111111111111111111111111111112"
        }
      ]
      
      // Add some mock SPL tokens randomly
      if (Math.random() > 0.3) {
        mockAssets.push({
          symbol: "USDC",
          amount: (Math.random() * 5000).toFixed(2),
          value: `$${(Math.random() * 5000).toFixed(2)}`,
          change: "0%",
          address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        })
      }
      
      if (Math.random() > 0.5) {
        mockAssets.push({
          symbol: "BONK",
          amount: (Math.random() * 1000000000).toFixed(0),
          value: `$${(Math.random() * 1000).toFixed(2)}`,
          change: `${(Math.random() * 30 - 10).toFixed(1)}%`,
          address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
        })
      }
      
      // Calculate total value
      const totalValue = mockAssets.reduce((sum, asset) => {
        const value = parseFloat(asset.value.replace('$', '').replace(',', ''))
        return sum + value
      }, 0)
      
      setPortfolio({
        totalValue: `$${totalValue.toFixed(2)}`,
        change24h: `$${(totalValue * 0.05).toFixed(2)}`,
        changePercent: `+${(Math.random() * 10).toFixed(2)}%`,
        assets: mockAssets,
        walletAddress: address
      })
    } catch (error) {
      console.error('Failed to fetch portfolio:', error)
      setPortfolio({
        totalValue: "$0.00",
        change24h: "$0.00",
        changePercent: "0%",
        assets: [],
        walletAddress: address
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleAddressSubmit = () => {
    if (inputAddress) {
      try {
        new PublicKey(inputAddress) // Validate address
        setWalletAddress(inputAddress)
        localStorage.setItem('portfolio-wallet', inputAddress)
      } catch {
        // Invalid address - you could show an error here
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="h-5 w-5" />
            Portfolio
          </DialogTitle>
          <DialogDescription>
            Your Solana wallet portfolio overview
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!walletAddress ? (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <WalletIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium">Enter Wallet Address</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    View portfolio for any Solana wallet
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Solana wallet address..."
                    value={inputAddress}
                    onChange={(e) => setInputAddress(e.target.value)}
                  />
                  <Button onClick={handleAddressSubmit}>
                    <SearchIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">
                  Wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPortfolio(walletAddress)}
                    disabled={loading}
                  >
                    <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(`${SOLANA_CONFIG.explorerUrl[SOLANA_CONFIG.network]}/address/${walletAddress}`, '_blank')
                    }}
                  >
                    <ExternalLinkIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWalletAddress("")
                      setInputAddress("")
                      localStorage.removeItem('portfolio-wallet')
                    }}
                  >
                    Change
                  </Button>
                </div>
              </div>
              
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                    <p className="text-3xl font-bold mt-1">{portfolio.totalValue}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {portfolio.changePercent.startsWith('+') ? (
                        <TrendingUpIcon className="h-4 w-4 text-green-600" />
                      ) : portfolio.changePercent === "0%" ? null : (
                        <TrendingDownIcon className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        portfolio.changePercent.startsWith('+') ? 'text-green-600' : 
                        portfolio.changePercent === "0%" ? 'text-gray-600' : 'text-red-600'
                      }`}>
                        {portfolio.change24h}
                      </span>
                      <Badge variant="outline" className={`${
                        portfolio.changePercent.startsWith('+') ? 'text-green-600 border-green-600' : 
                        portfolio.changePercent === "0%" ? 'text-gray-600 border-gray-600' : 'text-red-600 border-red-600'
                      }`}>
                        {portfolio.changePercent}
                      </Badge>
                    </div>
                  </div>
                  <DollarSignIcon className="h-12 w-12 text-purple-600 opacity-50" />
                </div>
              </Card>
            </>
          )}

          {walletAddress && (
            <div className="space-y-3">
              <h3 className="font-semibold">Assets</h3>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading portfolio...</p>
                </div>
              ) : portfolio.assets.length === 0 ? (
                <Card className="p-8 text-center">
                  <WalletIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No assets found</p>
                </Card>
              ) : (
                portfolio.assets.map((asset) => (
                  <Card key={asset.symbol} className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {asset.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium">{asset.symbol}</p>
                          <p className="text-sm text-muted-foreground">{asset.amount}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold">{asset.value}</p>
                          <div className="flex items-center gap-1 justify-end">
                            {asset.change.startsWith("+") ? (
                              <TrendingUpIcon className="h-3 w-3 text-green-600" />
                            ) : asset.change === "0%" ? null : (
                              <TrendingDownIcon className="h-3 w-3 text-red-600" />
                            )}
                            <span className={
                              asset.change.startsWith("+") ? "text-green-600 text-sm" : 
                              asset.change === "0%" ? "text-gray-500 text-sm" : "text-red-600 text-sm"
                            }>
                              {asset.change}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              // Open send dialog or create Blink for transfer
                              if (asset.address) {
                                const blinkUrl = `${window.location.origin}/api/actions/transfer?to=&amount=`
                                navigator.clipboard.writeText(blinkUrl)
                              }
                            }}
                          >
                            <SendIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              // Open swap interface
                              if (asset.address) {
                                window.open(`https://jup.ag/swap/${asset.symbol}-USDC`, '_blank')
                              }
                            }}
                          >
                            <ArrowRightLeftIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}