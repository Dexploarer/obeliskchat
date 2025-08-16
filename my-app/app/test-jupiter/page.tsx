"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ZapIcon, 
  CheckCircleIcon, 
  AlertCircleIcon, 
  ExternalLinkIcon,
  RefreshCwIcon,
  TestTubeIcon,
  DollarSignIcon
} from 'lucide-react'
import { 
  JupiterSwap, 
  PostLaunchSwap, 
  QuickSwapButton, 
  PaymentSwap,
  SwapWidget 
} from '@/components/ui/jupiter-swap'
import { TradingDashboard } from '@/components/ui/trading-dashboard'
import { RevenueAnalytics } from '@/components/ui/revenue-analytics'
import { jupiterPluginManager, JUPITER_PLUGIN_CONFIG } from '@/lib/jupiter-plugin-config'

export default function TestJupiterPage() {
  const [pluginStatus, setPluginStatus] = useState<{
    available: boolean
    initialized: boolean
    analytics: any
  } | null>(null)
  const [testResults, setTestResults] = useState<Array<{
    test: string
    status: 'pending' | 'success' | 'error'
    message: string
  }>>([])

  useEffect(() => {
    checkPluginStatus()
  }, [])

  const checkPluginStatus = () => {
    const status = jupiterPluginManager.getStatus()
    setPluginStatus(status)
  }

  const runTests = async () => {
    const tests = [
      {
        name: 'Jupiter Plugin Availability',
        test: () => typeof window !== 'undefined' && !!window.Jupiter
      },
      {
        name: 'Referral Account Configuration',
        test: () => !!process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT
      },
      {
        name: 'Fee Configuration',
        test: () => !!process.env.NEXT_PUBLIC_JUPITER_REFERRAL_FEE && 
                   parseInt(process.env.NEXT_PUBLIC_JUPITER_REFERRAL_FEE) === 50
      },
      {
        name: 'Plugin Manager Initialization',
        test: () => jupiterPluginManager.isAvailable()
      }
    ]

    const results = []
    
    for (const { name, test } of tests) {
      try {
        const passed = await test()
        results.push({
          test: name,
          status: passed ? 'success' : 'error' as const,
          message: passed ? 'Passed' : 'Failed'
        })
      } catch (error) {
        results.push({
          test: name,
          status: 'error' as const,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    setTestResults(results)
  }

  const testSwap = (result: any) => {
    console.log('🧪 Test swap completed:', result)
    alert('Test swap completed! Check console for details.')
  }

  const testSwapError = (error: any) => {
    console.error('🧪 Test swap failed:', error)
    alert('Test swap failed! Check console for details.')
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <TestTubeIcon className="h-8 w-8" />
          Jupiter Integration Test Suite
        </h1>
        <p className="text-muted-foreground">
          Test and verify Jupiter Plugin integration functionality
        </p>
      </div>

      {/* Plugin Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ZapIcon className="h-5 w-5" />
            Plugin Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Available:</span>
              {pluginStatus?.available ? (
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircleIcon className="h-4 w-4 text-red-600" />
              )}
              <span className={pluginStatus?.available ? 'text-green-600' : 'text-red-600'}>
                {pluginStatus?.available ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Initialized:</span>
              {pluginStatus?.initialized ? (
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircleIcon className="h-4 w-4 text-yellow-600" />
              )}
              <span className={pluginStatus?.initialized ? 'text-green-600' : 'text-yellow-600'}>
                {pluginStatus?.initialized ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">Referral Account:</span>
              {JUPITER_PLUGIN_CONFIG.referral.account ? (
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircleIcon className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs font-mono">
                {JUPITER_PLUGIN_CONFIG.referral.account ? 
                  `${JUPITER_PLUGIN_CONFIG.referral.account.slice(0, 8)}...` : 
                  'Not set'
                }
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">Fee Rate:</span>
              <Badge variant="secondary">
                {JUPITER_PLUGIN_CONFIG.referral.fee / 100}%
              </Badge>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={checkPluginStatus} variant="outline" size="sm">
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
            <Button onClick={runTests} variant="outline" size="sm">
              <TestTubeIcon className="h-4 w-4 mr-2" />
              Run Tests
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-semibold">Test Results:</h4>
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">{result.test}</span>
                  <div className="flex items-center gap-2">
                    {result.status === 'success' ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircleIcon className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-xs ${
                      result.status === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {result.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Component Tests */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Swap</TabsTrigger>
          <TabsTrigger value="post-launch">Post-Launch</TabsTrigger>
          <TabsTrigger value="quick-swap">Quick Swap</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Jupiter Swap Component</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Integrated Mode */}
                <div>
                  <h4 className="font-semibold mb-2">Integrated Mode</h4>
                  <JupiterSwap
                    mode="integrated"
                    tokenMint="So11111111111111111111111111111111111111112" // SOL
                    tokenSymbol="SOL"
                    tokenName="Solana"
                    swapMode="ExactInOrOut"
                    onSuccess={testSwap}
                    onError={testSwapError}
                    showAnalytics={false}
                  />
                </div>

                {/* Modal Triggers */}
                <div>
                  <h4 className="font-semibold mb-4">Modal & Widget Modes</h4>
                  <div className="space-y-4">
                    <JupiterSwap
                      mode="modal"
                      tokenMint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC
                      tokenSymbol="USDC"
                      tokenName="USD Coin"
                      trigger={
                        <Button className="w-full">
                          <DollarSignIcon className="h-4 w-4 mr-2" />
                          Open USDC Swap Modal
                        </Button>
                      }
                      onSuccess={testSwap}
                      onError={testSwapError}
                    />

                    <JupiterSwap
                      mode="widget"
                      trigger={
                        <Button variant="outline" className="w-full">
                          <ZapIcon className="h-4 w-4 mr-2" />
                          Open Swap Widget
                        </Button>
                      }
                      onSuccess={testSwap}
                      onError={testSwapError}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="post-launch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Post-Launch Swap Component</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PostLaunchSwap
                  mintAddress="So11111111111111111111111111111111111111112"
                  tokenSymbol="TEST"
                  tokenName="Test Token"
                  platform="pump"
                  onSwapSuccess={testSwap}
                />
                
                <PostLaunchSwap
                  mintAddress="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  tokenSymbol="BONK"
                  tokenName="Bonk Token"
                  platform="bonk"
                  onSwapSuccess={testSwap}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick-swap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Swap Buttons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickSwapButton
                  tokenMint="So11111111111111111111111111111111111111112"
                  tokenSymbol="SOL"
                  tokenName="Solana"
                  variant="default"
                />
                
                <QuickSwapButton
                  tokenMint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  tokenSymbol="USDC"
                  tokenName="USD Coin"
                  variant="outline"
                />
                
                <QuickSwapButton
                  tokenMint="Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
                  tokenSymbol="USDT"
                  tokenName="Tether USD"
                  variant="ghost"
                />
                
                <QuickSwapButton
                  tokenMint="mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"
                  tokenSymbol="mSOL"
                  tokenName="Marinade SOL"
                  variant="secondary"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Swap Component</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentSwap
                tokenMint="So11111111111111111111111111111111111111112"
                amount="0.1"
                tokenSymbol="SOL"
                description="Test payment of 0.1 SOL"
                onPaymentComplete={testSwap}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <TradingDashboard />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <RevenueAnalytics 
            showExportButton={true}
            autoRefresh={false}
          />
        </TabsContent>
      </Tabs>

      {/* Floating Widget */}
      <SwapWidget />
    </div>
  )
}