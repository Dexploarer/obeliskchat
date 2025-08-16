"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUpIcon, 
  TrendingDownIcon,
  DollarSignIcon,
  ArrowUpDownIcon,
  BarChart3Icon,
  PieChartIcon,
  ActivityIcon,
  RefreshCwIcon,
  CalendarIcon,
  FilterIcon,
  DownloadIcon
} from 'lucide-react'
import { JupiterSwap, SwapAnalyticsDisplay } from '@/components/ui/jupiter-swap'
import { TokenSelector } from '@/components/ui/token-selector'
import { JupiterTokenData } from '@/lib/jupiter-token-types'
import { RevenueTrackingService, RevenueMetrics } from '@/lib/revenue-tracking'
import { Connection } from '@solana/web3.js'
import { SOLANA_CONFIG } from '@/lib/solana-config'

interface TradingDashboardProps {
  defaultToken?: JupiterTokenData
  className?: string
}

export function TradingDashboard({ defaultToken, className = '' }: TradingDashboardProps) {
  const [selectedToken, setSelectedToken] = useState<JupiterTokenData | null>(defaultToken || null)
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [activeTab, setActiveTab] = useState('swap')
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('24h')

  // Load revenue metrics
  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoadingMetrics(true)
      try {
        const connection = new Connection(SOLANA_CONFIG.rpcUrl[SOLANA_CONFIG.network])
        const revenueService = new RevenueTrackingService(connection)
        
        let timeframeFilter
        const now = Date.now()
        
        switch (timeframe) {
          case '24h':
            timeframeFilter = { start: now - 24 * 60 * 60 * 1000, end: now }
            break
          case '7d':
            timeframeFilter = { start: now - 7 * 24 * 60 * 60 * 1000, end: now }
            break
          case '30d':
            timeframeFilter = { start: now - 30 * 24 * 60 * 60 * 1000, end: now }
            break
          default:
            timeframeFilter = undefined
        }
        
        const metrics = revenueService.getRevenueMetrics(timeframeFilter)
        setRevenueMetrics(metrics)
      } catch (error) {
        console.error('Failed to load revenue metrics:', error)
      } finally {
        setIsLoadingMetrics(false)
      }
    }

    loadMetrics()
  }, [timeframe])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
    return num.toFixed(0)
  }

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trading Dashboard</h2>
          <p className="text-muted-foreground">
            Advanced trading interface with Jupiter integration
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FilterIcon className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Revenue Metrics Cards */}
      {revenueMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(revenueMetrics.platformRevenue)}
                  </p>
                </div>
                <DollarSignIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {timeframe.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Swaps</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(revenueMetrics.totalSwaps)}
                  </p>
                </div>
                <ArrowUpDownIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  Avg: {formatCurrency(revenueMetrics.averageSwapSize)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Volume</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(revenueMetrics.totalVolume)}
                  </p>
                </div>
                <BarChart3Icon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  Fees: {formatCurrency(revenueMetrics.totalFees)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Jupiter Share</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(revenueMetrics.jupiterRevenue)}
                  </p>
                </div>
                <PieChartIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  20% of fees
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeframe Selector */}
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1">
          {(['24h', '7d', '30d', 'all'] as const).map((period) => (
            <Button
              key={period}
              variant={timeframe === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe(period)}
            >
              {period === 'all' ? 'All Time' : period.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Trading Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="swap">Advanced Swap</TabsTrigger>
          <TabsTrigger value="discovery">Token Discovery</TabsTrigger>
          <TabsTrigger value="analytics">Revenue Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="swap" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Token Selector */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Token</CardTitle>
                </CardHeader>
                <CardContent>
                  <TokenSelector
                    onTokenSelect={setSelectedToken}
                    showVerifiedOnly={false}
                    showMetrics={true}
                    maxResults={8}
                  />
                  
                  {selectedToken && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {selectedToken.icon && (
                          <img 
                            src={selectedToken.icon} 
                            alt={selectedToken.symbol}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="font-semibold">{selectedToken.symbol}</span>
                        <Badge 
                          variant="secondary"
                          className={
                            selectedToken.organicScore >= 70 ? 'bg-green-100 text-green-800' :
                            selectedToken.organicScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }
                        >
                          {selectedToken.organicScoreLabel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedToken.name}</p>
                      <div className="mt-2 text-sm">
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span className="font-medium">${selectedToken.usdPrice.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>24h Change:</span>
                          <span className={selectedToken.stats24h.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {selectedToken.stats24h.priceChange >= 0 ? '+' : ''}{selectedToken.stats24h.priceChange.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Holders:</span>
                          <span className="font-medium">{formatNumber(selectedToken.holderCount)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Swap Interface */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Jupiter Swap Interface</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedToken ? (
                    <JupiterSwap
                      mode="integrated"
                      tokenMint={selectedToken.id}
                      tokenSymbol={selectedToken.symbol}
                      tokenName={selectedToken.name}
                      swapMode="ExactInOrOut"
                      onSuccess={(result) => {
                        console.log('✅ Advanced swap completed:', result)
                      }}
                      onError={(error) => {
                        console.error('❌ Advanced swap failed:', error)
                      }}
                      showAnalytics={true}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-96 text-muted-foreground">
                      <div className="text-center">
                        <ArrowUpDownIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a token to start trading</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="discovery" className="space-y-4">
          <TokenDiscoveryDashboard />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <RevenueAnalyticsDashboard metrics={revenueMetrics} isLoading={isLoadingMetrics} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Token Discovery Dashboard Component
function TokenDiscoveryDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5" />
            Trending Tokens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* TokenDiscovery component would go here */}
            <p className="text-muted-foreground text-center py-8">
              Token discovery integration coming soon...
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-muted-foreground text-center py-8">
              Activity feed integration coming soon...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Revenue Analytics Dashboard Component
interface RevenueAnalyticsDashboardProps {
  metrics: RevenueMetrics | null
  isLoading: boolean
}

function RevenueAnalyticsDashboard({ metrics, isLoading }: RevenueAnalyticsDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <BarChart3Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No revenue data available</p>
      </div>
    )
  }

  const topTokens = Object.entries(metrics.revenueByToken)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)

  const recentDays = Object.entries(metrics.revenueByDay)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .slice(0, 7)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Tokens by Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Top Tokens by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topTokens.map(([token, revenue], index) => (
              <div key={token} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                    {index + 1}
                  </Badge>
                  <span className="font-medium">{token}</span>
                </div>
                <span className="text-green-600 font-semibold">
                  ${revenue.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentDays.map(([date, revenue]) => (
              <div key={date} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm">{new Date(date).toLocaleDateString()}</span>
                <span className="text-green-600 font-semibold">
                  ${revenue.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}