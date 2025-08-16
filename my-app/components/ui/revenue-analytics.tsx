"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  DollarSignIcon,
  TrendingUpIcon,
  PieChartIcon,
  BarChart3Icon,
  DownloadIcon,
  RefreshCwIcon,
  CalendarIcon,
  UsersIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ActivityIcon
} from 'lucide-react'
import { RevenueTrackingService, RevenueMetrics, SwapFeeEvent } from '@/lib/revenue-tracking'
import { Connection } from '@solana/web3.js'
import { SOLANA_CONFIG } from '@/lib/solana-config'

interface RevenueAnalyticsProps {
  className?: string
  showExportButton?: boolean
  autoRefresh?: boolean
  refreshInterval?: number // in seconds
}

export function RevenueAnalytics({ 
  className = '', 
  showExportButton = true,
  autoRefresh = false,
  refreshInterval = 30
}: RevenueAnalyticsProps) {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [recentEvents, setRecentEvents] = useState<SwapFeeEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [revenueService, setRevenueService] = useState<RevenueTrackingService | null>(null)

  // Initialize revenue service
  useEffect(() => {
    const connection = new Connection(SOLANA_CONFIG.rpcUrl[SOLANA_CONFIG.network])
    const service = new RevenueTrackingService(connection)
    setRevenueService(service)
  }, [])

  // Load data
  const loadData = async () => {
    if (!revenueService) return
    
    setIsLoading(true)
    try {
      const allMetrics = revenueService.getRevenueMetrics()
      setMetrics(allMetrics)
      
      // Get recent events (last 24 hours)
      const now = Date.now()
      const yesterday = now - 24 * 60 * 60 * 1000
      const recentMetrics = revenueService.getRevenueMetrics({ start: yesterday, end: now })
      
      // This would normally come from the service, but we'll simulate it
      const mockRecentEvents: SwapFeeEvent[] = [
        {
          signature: 'mock1',
          timestamp: now - 1000 * 60 * 30, // 30 minutes ago
          tokenMint: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          swapValue: 1250.75,
          feeAmount: 6.25,
          platformShare: 5.0,
          jupiterShare: 1.25
        },
        {
          signature: 'mock2',
          timestamp: now - 1000 * 60 * 45, // 45 minutes ago
          tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          tokenSymbol: 'USDC',
          swapValue: 850.30,
          feeAmount: 4.25,
          platformShare: 3.4,
          jupiterShare: 0.85
        }
      ]
      setRecentEvents(mockRecentEvents)
      
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load revenue data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [revenueService])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(loadData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, revenueService])

  const exportData = () => {
    if (!revenueService) return

    const data = revenueService.exportRevenueData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jupiter-revenue-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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

  const getRevenueGrowth = () => {
    if (!metrics) return 0
    
    // Mock calculation - in real implementation, compare with previous period
    const dailyAverage = metrics.platformRevenue / Math.max(1, Object.keys(metrics.revenueByDay).length)
    return Math.random() * 20 - 10 // Mock: -10% to +10%
  }

  if (isLoading && !metrics) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const growth = getRevenueGrowth()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Revenue Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {showExportButton && (
            <Button variant="outline" size="sm" onClick={exportData}>
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(metrics.platformRevenue)}
                    </p>
                    <div className="flex items-center mt-1">
                      {growth >= 0 ? (
                        <ArrowUpIcon className="h-3 w-3 text-green-600" />
                      ) : (
                        <ArrowDownIcon className="h-3 w-3 text-red-600" />
                      )}
                      <span className={`text-xs ml-1 ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(growth).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <DollarSignIcon className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Swaps</p>
                    <p className="text-2xl font-bold">{formatNumber(metrics.totalSwaps)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg: {formatCurrency(metrics.averageSwapSize)}
                    </p>
                  </div>
                  <BarChart3Icon className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Volume Traded</p>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.totalVolume)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fees: {formatCurrency(metrics.totalFees)}
                    </p>
                  </div>
                  <TrendingUpIcon className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue Share</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Us: 80%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span>Jupiter: 20%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <PieChartIcon className="h-8 w-8 text-orange-600" />
                </div>
                <Progress 
                  value={80} 
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Tokens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Tokens by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.revenueByToken)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([token, revenue], index) => (
                      <div key={token} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                            {index + 1}
                          </Badge>
                          <span className="font-medium">{token}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-green-600 font-semibold text-sm">
                            {formatCurrency(revenue)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {((revenue / metrics.platformRevenue) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ActivityIcon className="h-4 w-4" />
                  Recent Swap Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentEvents.map((event, index) => (
                    <div key={event.signature} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {event.tokenSymbol}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="text-green-600 font-semibold text-sm">
                          +{formatCurrency(event.platformShare)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Swap: {formatCurrency(event.swapValue)} • 
                        Fee: {formatCurrency(event.feeAmount)} • 
                        Jupiter: {formatCurrency(event.jupiterShare)}
                      </div>
                    </div>
                  ))}
                  
                  {recentEvents.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <ActivityIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(metrics.platformRevenue)}
                  </div>
                  <div className="text-sm text-muted-foreground">Platform Revenue (80%)</div>
                  <Progress value={80} className="mt-2" />
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(metrics.jupiterRevenue)}
                  </div>
                  <div className="text-sm text-muted-foreground">Jupiter Revenue (20%)</div>
                  <Progress value={20} className="mt-2" />
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(metrics.totalFees)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Fees Collected</div>
                  <Progress value={100} className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}