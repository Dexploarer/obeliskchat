"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  SearchIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon,
  TrendingUpIcon,
  UsersIcon,
  DollarSignIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  FlameIcon
} from 'lucide-react'
import { JupiterTokenData } from '@/lib/jupiter-token-types'
import { solanaService } from '@/lib/solana-service'
import { QuickSwapButton } from '@/components/ui/jupiter-swap'

interface TokenSelectorProps {
  onTokenSelect: (token: JupiterTokenData) => void
  placeholder?: string
  showVerifiedOnly?: boolean
  showMetrics?: boolean
  maxResults?: number
}

export function TokenSelector({ 
  onTokenSelect, 
  placeholder = "Search tokens by symbol, name, or mint address...",
  showVerifiedOnly = false,
  showMetrics = true,
  maxResults = 10
}: TokenSelectorProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<JupiterTokenData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState<JupiterTokenData | null>(null)
  const [showResults, setShowResults] = useState(false)

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([])
        setShowResults(false)
        return
      }

      setIsLoading(true)
      try {
        const searchResult = await solanaService.searchTokens(searchQuery, maxResults)
        
        let filteredResults = searchResult.tokens
        
        if (showVerifiedOnly) {
          filteredResults = filteredResults.filter(token => token.isVerified)
        }
        
        setResults(filteredResults)
        setShowResults(true)
      } catch (error) {
        console.error('Token search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [maxResults, showVerifiedOnly]
  )

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  const handleTokenSelect = (token: JupiterTokenData) => {
    setSelectedToken(token)
    setQuery(`${token.symbol} - ${token.name}`)
    setShowResults(false)
    onTokenSelect(token)
  }

  const getRiskColor = (organicScore: number) => {
    if (organicScore >= 70) return 'text-green-600'
    if (organicScore >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRiskBadgeColor = (organicScore: number) => {
    if (organicScore >= 70) return 'bg-green-100 text-green-800'
    if (organicScore >= 40) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
    return num.toFixed(2)
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(results.length > 0)}
          className="pl-10 pr-4"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {results.map((token) => (
              <div
                key={token.id}
                className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                onClick={() => handleTokenSelect(token)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {token.icon && (
                          <img 
                            src={token.icon} 
                            alt={token.symbol}
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <span className="font-semibold">{token.symbol}</span>
                        {token.isVerified && (
                          <ShieldCheckIcon className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      
                      <Badge 
                        variant="secondary" 
                        className={getRiskBadgeColor(token.organicScore)}
                      >
                        {token.organicScoreLabel.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate">{token.name}</p>
                    
                    {showMetrics && (
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div className="flex items-center gap-1">
                          <DollarSignIcon className="h-3 w-3" />
                          <span>${token.usdPrice.toFixed(6)}</span>
                          <span className={token.stats24h.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ({token.stats24h.priceChange >= 0 ? '+' : ''}{token.stats24h.priceChange.toFixed(2)}%)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <UsersIcon className="h-3 w-3" />
                          <span>{formatNumber(token.holderCount)} holders</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <TrendingUpIcon className="h-3 w-3" />
                          <span>MCap: ${formatNumber(token.mcap)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <FlameIcon className="h-3 w-3" />
                          <span className={getRiskColor(token.organicScore)}>
                            Score: {token.organicScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )}

                    {token.tags && token.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {token.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {token.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{token.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 ml-2">
                    {token.cexes && token.cexes.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {token.cexes.length} CEX
                      </Badge>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <div onClick={(e) => e.stopPropagation()}>
                        <QuickSwapButton
                          tokenMint={token.id}
                          tokenSymbol={token.symbol}
                          tokenName={token.name}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-auto px-2"
                        />
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`https://solscan.io/token/${token.id}`, '_blank')
                        }}
                      >
                        <ExternalLinkIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {showResults && results.length === 0 && query.length >= 2 && !isLoading && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50">
          <CardContent className="p-4 text-center text-muted-foreground">
            No tokens found for "{query}"
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Token Discovery Component
interface TokenDiscoveryProps {
  category: 'trending' | 'recent' | 'verified' | 'top-organic'
  onTokenSelect: (token: JupiterTokenData) => void
  limit?: number
  interval?: '5m' | '1h' | '6h' | '24h'
}

export function TokenDiscovery({ 
  category, 
  onTokenSelect, 
  limit = 10,
  interval = '24h' 
}: TokenDiscoveryProps) {
  const [tokens, setTokens] = useState<JupiterTokenData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTokens = async () => {
      setIsLoading(true)
      try {
        let result
        
        switch (category) {
          case 'trending':
            result = await solanaService.getTrendingTokens(interval, limit)
            break
          case 'recent':
            result = await solanaService.getRecentTokens(limit)
            break
          case 'verified':
            result = await solanaService.getVerifiedTokens(limit)
            break
          case 'top-organic':
            result = await solanaService.getTrendingTokens(interval, limit)
            break
        }
        
        setTokens(result?.tokens || [])
      } catch (error) {
        console.error('Failed to load tokens:', error)
        setTokens([])
      } finally {
        setIsLoading(false)
      }
    }

    loadTokens()
  }, [category, limit, interval])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tokens.map((token) => (
        <Card key={token.id} className="cursor-pointer hover:bg-muted transition-colors">
          <CardContent className="p-3" onClick={() => onTokenSelect(token)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {token.icon && (
                  <img 
                    src={token.icon} 
                    alt={token.symbol}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{token.symbol}</span>
                    {token.isVerified && (
                      <ShieldCheckIcon className="h-4 w-4 text-blue-500" />
                    )}
                    <Badge 
                      variant="secondary" 
                      className={
                        token.organicScore >= 70 ? 'bg-green-100 text-green-800' :
                        token.organicScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {token.organicScoreLabel}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{token.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-semibold">${token.usdPrice.toFixed(6)}</p>
                  <p className={`text-sm ${token.stats24h.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {token.stats24h.priceChange >= 0 ? '+' : ''}{token.stats24h.priceChange.toFixed(2)}%
                  </p>
                </div>
                
                <div onClick={(e) => e.stopPropagation()}>
                  <QuickSwapButton
                    tokenMint={token.id}
                    tokenSymbol={token.symbol}
                    tokenName={token.name}
                    size="sm"
                    className="ml-2"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}