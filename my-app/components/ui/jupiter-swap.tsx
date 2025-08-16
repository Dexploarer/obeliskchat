"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowUpDownIcon, 
  ExternalLinkIcon, 
  TrendingUpIcon,
  DollarSignIcon,
  ZapIcon,
  AlertCircleIcon
} from 'lucide-react'
import { 
  jupiterPluginManager, 
  createSwapInterface, 
  openQuickSwap,
  createPostLaunchSwap 
} from '@/lib/jupiter-plugin-config'
import { JupiterSwapConfig, SwapAnalytics } from '@/types/jupiter-plugin'

interface JupiterSwapProps {
  mode: 'integrated' | 'modal' | 'widget'
  tokenMint?: string
  tokenSymbol?: string
  tokenName?: string
  initialAmount?: string
  swapMode?: 'ExactIn' | 'ExactOut' | 'ExactInOrOut'
  fixedAmount?: boolean
  fixedMint?: string
  className?: string
  onSuccess?: (result: any) => void
  onError?: (error: any) => void
  trigger?: React.ReactNode
  disabled?: boolean
  showAnalytics?: boolean
}

export function JupiterSwap({
  mode,
  tokenMint,
  tokenSymbol,
  tokenName,
  initialAmount,
  swapMode = 'ExactInOrOut',
  fixedAmount = false,
  fixedMint,
  className = '',
  onSuccess,
  onError,
  trigger,
  disabled = false,
  showAnalytics = false
}: JupiterSwapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerId, setContainerId] = useState<string>('')
  const [isPluginReady, setIsPluginReady] = useState(false)
  const [analytics, setAnalytics] = useState<SwapAnalytics[]>([])

  // Check if Jupiter Plugin is available
  useEffect(() => {
    const checkPlugin = () => {
      if (typeof window !== 'undefined' && window.Jupiter) {
        setIsPluginReady(true)
      } else {
        setTimeout(checkPlugin, 100)
      }
    }
    
    checkPlugin()
  }, [])

  // Load analytics if requested
  useEffect(() => {
    if (showAnalytics && isPluginReady) {
      setAnalytics(jupiterPluginManager.getSwapAnalytics())
    }
  }, [showAnalytics, isPluginReady])

  // Initialize integrated mode
  useEffect(() => {
    if (mode === 'integrated' && isPluginReady && containerRef.current && !disabled) {
      const config: JupiterSwapConfig = {
        mode: 'integrated',
        formProps: {
          swapMode,
          initialAmount,
          initialOutputMint: tokenMint,
          fixedAmount,
          fixedMint,
        },
        onSuccess: (result) => {
          console.log('Jupiter swap successful:', result)
          onSuccess?.(result)
        },
        onError: (error) => {
          console.error('Jupiter swap error:', error)
          onError?.(error)
        }
      }

      const id = createSwapInterface(config)
      setContainerId(id)
    }
  }, [mode, isPluginReady, tokenMint, swapMode, initialAmount, fixedAmount, fixedMint, disabled, onSuccess, onError])

  // Handle modal/widget mode
  const handleOpenSwap = () => {
    if (!isPluginReady || disabled) return

    if (mode === 'modal' && tokenMint) {
      openQuickSwap(tokenMint, tokenSymbol)
    } else if (mode === 'widget') {
      jupiterPluginManager.createSwapInterface({
        mode: 'widget',
        formProps: {
          swapMode,
          initialAmount,
          initialOutputMint: tokenMint,
          fixedAmount,
          fixedMint,
        },
        onSuccess,
        onError
      })
    }
  }

  if (!isPluginReady) {
    return (
      <Card className={`${className} opacity-50`}>
        <CardContent className="p-4 text-center">
          <div className="animate-pulse flex items-center justify-center gap-2">
            <ZapIcon className="h-4 w-4" />
            <span>Loading Jupiter Swap...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (mode === 'integrated') {
    return (
      <div className={`jupiter-swap-container ${className}`}>
        {tokenName && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Trade {tokenSymbol}</h3>
                <p className="text-xs text-muted-foreground">{tokenName}</p>
              </div>
              <Badge variant="secondary">
                <ArrowUpDownIcon className="h-3 w-3 mr-1" />
                Swap
              </Badge>
            </div>
          </div>
        )}
        
        <div 
          ref={containerRef}
          id={containerId}
          className="min-h-[400px] rounded-lg border"
        />
        
        {showAnalytics && analytics.length > 0 && (
          <SwapAnalyticsDisplay analytics={analytics} />
        )}
      </div>
    )
  }

  // Modal/Widget trigger
  const defaultTrigger = (
    <Button 
      variant="default" 
      size="sm" 
      disabled={disabled}
      className="flex items-center gap-2"
    >
      <ArrowUpDownIcon className="h-4 w-4" />
      {mode === 'widget' ? 'Open Swap Widget' : 'Swap'}
    </Button>
  )

  return (
    <div className={className}>
      <div onClick={handleOpenSwap}>
        {trigger || defaultTrigger}
      </div>
    </div>
  )
}

// Post-Launch Swap Component (specialized for token creation success)
interface PostLaunchSwapProps {
  mintAddress: string
  tokenSymbol: string
  tokenName: string
  platform: 'pump' | 'bonk'
  onSwapSuccess?: (result: any) => void
  className?: string
}

export function PostLaunchSwap({
  mintAddress,
  tokenSymbol,
  tokenName,
  platform,
  onSwapSuccess,
  className = ''
}: PostLaunchSwapProps) {
  const [containerId, setContainerId] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkAndInit = () => {
      if (typeof window !== 'undefined' && window.Jupiter) {
        const id = createPostLaunchSwap(mintAddress, platform)
        setContainerId(id)
        setIsReady(true)
      } else {
        setTimeout(checkAndInit, 100)
      }
    }
    
    checkAndInit()
  }, [mintAddress, platform])

  if (!isReady) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <div className="animate-pulse">Loading swap interface...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">🎉 Start Trading {tokenSymbol}!</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your token is now live on {platform === 'pump' ? 'Pump.fun' : 'LetsBonk.fun'}
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <TrendingUpIcon className="h-3 w-3" />
            Live
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSignIcon className="h-4 w-4" />
            <span>Powered by Jupiter - Best execution guaranteed</span>
          </div>
          
          <div 
            id={containerId}
            className="min-h-[350px] rounded-lg border bg-background"
          />
          
          <div className="text-xs text-muted-foreground text-center">
            Trading fees apply. Platform fees support the launchpad ecosystem.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Swap Button (for token discovery)
interface QuickSwapButtonProps {
  tokenMint: string
  tokenSymbol?: string
  tokenName?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
}

export function QuickSwapButton({
  tokenMint,
  tokenSymbol,
  tokenName,
  variant = 'outline',
  size = 'sm',
  className = '',
  disabled = false
}: QuickSwapButtonProps) {
  const handleSwap = () => {
    if (!disabled) {
      openQuickSwap(tokenMint, tokenSymbol)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSwap}
      disabled={disabled}
      className={`flex items-center gap-2 ${className}`}
    >
      <ArrowUpDownIcon className="h-3 w-3" />
      Trade
    </Button>
  )
}

// Payment Swap Component (for fixed amount payments)
interface PaymentSwapProps {
  tokenMint: string
  amount: string
  tokenSymbol?: string
  description?: string
  onPaymentComplete?: (result: any) => void
  className?: string
}

export function PaymentSwap({
  tokenMint,
  amount,
  tokenSymbol,
  description,
  onPaymentComplete,
  className = ''
}: PaymentSwapProps) {
  const [containerId, setContainerId] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const initPaymentSwap = () => {
      if (typeof window !== 'undefined' && window.Jupiter) {
        const id = jupiterPluginManager.createPaymentSwap(tokenMint, amount)
        setContainerId(id)
        setIsReady(true)
      } else {
        setTimeout(initPaymentSwap, 100)
      }
    }

    initPaymentSwap()
  }, [tokenMint, amount])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSignIcon className="h-5 w-5" />
          Payment: {amount} {tokenSymbol}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      
      <CardContent>
        {isReady ? (
          <div id={containerId} className="min-h-[300px]" />
        ) : (
          <div className="animate-pulse text-center p-8">
            Loading payment interface...
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Swap Analytics Display Component
interface SwapAnalyticsDisplayProps {
  analytics: SwapAnalytics[]
  className?: string
}

function SwapAnalyticsDisplay({ analytics, className = '' }: SwapAnalyticsDisplayProps) {
  const totalSwaps = analytics.length
  const totalVolume = analytics.reduce((sum, swap) => sum + (swap.outputAmount || 0), 0)
  const avgPriceImpact = analytics.reduce((sum, swap) => sum + (swap.priceImpact || 0), 0) / totalSwaps

  if (totalSwaps === 0) return null

  return (
    <Card className={`mt-4 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Swap Analytics</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold">{totalSwaps}</div>
            <div className="text-xs text-muted-foreground">Total Swaps</div>
          </div>
          <div>
            <div className="text-lg font-bold">${totalVolume.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total Volume</div>
          </div>
          <div>
            <div className="text-lg font-bold">{avgPriceImpact.toFixed(2)}%</div>
            <div className="text-xs text-muted-foreground">Avg Impact</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Widget Swap (floating widget)
export function SwapWidget() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleWidget = () => {
    if (!isOpen) {
      jupiterPluginManager.createSwapInterface({
        mode: 'widget',
        onSuccess: (result) => {
          console.log('Widget swap successful:', result)
        }
      })
    } else {
      jupiterPluginManager.close()
    }
    setIsOpen(!isOpen)
  }

  return (
    <Button
      onClick={toggleWidget}
      className="fixed bottom-4 right-4 rounded-full w-12 h-12 shadow-lg z-50"
      size="sm"
    >
      <ArrowUpDownIcon className="h-5 w-5" />
    </Button>
  )
}