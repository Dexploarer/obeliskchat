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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { SearchIcon, TrendingUpIcon, TrendingDownIcon, DollarSignIcon, StarIcon, ArrowRightLeftIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react"

interface TokenSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Token {
  symbol: string
  name: string
  price: string
  change: string
  mcap: string
  trending: "up" | "down"
  address?: string
  volume24h?: string
  logoURI?: string
}

export function TokenSearchModal({ open, onOpenChange }: TokenSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  
  // Default popular tokens
  const defaultTokens: Token[] = [
    { symbol: "SOL", name: "Solana", price: "$0.00", change: "0%", mcap: "$0", trending: "up", address: "So11111111111111111111111111111111111111112" },
    { symbol: "USDC", name: "USD Coin", price: "$1.00", change: "0%", mcap: "$0", trending: "up", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
    { symbol: "BONK", name: "Bonk", price: "$0.00", change: "0%", mcap: "$0", trending: "up", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
    { symbol: "JUP", name: "Jupiter", price: "$0.00", change: "0%", mcap: "$0", trending: "up", address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
    { symbol: "RAY", name: "Raydium", price: "$0.00", change: "0%", mcap: "$0", trending: "up", address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R" },
  ]
  
  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favorite-tokens')
    if (saved) {
      setFavorites(JSON.parse(saved))
    }
  }, [])
  
  // Fetch real token prices
  useEffect(() => {
    if (open) {
      fetchTokenPrices()
    }
  }, [open])
  
  const fetchTokenPrices = async () => {
    setLoading(true)
    try {
      // In production, you would fetch from CoinGecko or similar API
      // For now, using mock data with random prices
      const updatedTokens = defaultTokens.map(token => ({
        ...token,
        price: `$${(Math.random() * 100).toFixed(2)}`,
        change: `${(Math.random() * 20 - 10).toFixed(1)}%`,
        mcap: `$${(Math.random() * 10).toFixed(1)}B`,
        trending: Math.random() > 0.5 ? 'up' : 'down' as "up" | "down",
        volume24h: `$${(Math.random() * 100).toFixed(1)}M`
      }))
      setTokens(updatedTokens)
    } catch (error) {
      console.error('Failed to fetch token prices:', error)
      setTokens(defaultTokens)
    } finally {
      setLoading(false)
    }
  }
  
  const toggleFavorite = (symbol: string) => {
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(f => f !== symbol)
      : [...favorites, symbol]
    setFavorites(newFavorites)
    localStorage.setItem('favorite-tokens', JSON.stringify(newFavorites))
  }

  const filteredTokens = tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    // Sort favorites first
    const aFav = favorites.includes(a.symbol) ? 1 : 0
    const bFav = favorites.includes(b.symbol) ? 1 : 0
    return bFav - aFav
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5" />
            Token Search
          </DialogTitle>
          <DialogDescription>
            Search and explore Solana tokens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by token name or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchTokenPrices}
              disabled={loading}
            >
              <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading token data...</p>
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="text-center py-8">
                <SearchIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No tokens found</p>
              </div>
            ) : (
              filteredTokens.map((token) => (
                <Card key={token.symbol} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {token.symbol.slice(0, 2)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                          onClick={() => toggleFavorite(token.symbol)}
                        >
                          <StarIcon className={`h-3 w-3 ${favorites.includes(token.symbol) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        </Button>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{token.symbol}</span>
                          <span className="text-sm text-muted-foreground">{token.name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">MCap: {token.mcap}</span>
                          {token.volume24h && (
                            <span className="text-xs text-muted-foreground">Vol: {token.volume24h}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">{token.price}</p>
                        <div className="flex items-center gap-1 justify-end">
                          {token.trending === "up" ? (
                            <TrendingUpIcon className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDownIcon className="h-3 w-3 text-red-600" />
                          )}
                          <span className={`text-sm ${token.trending === "up" ? "text-green-600" : "text-red-600"}`}>
                            {token.change}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            // Open swap interface
                            if (token.address) {
                              window.open(`https://jup.ag/swap/SOL-${token.address}`, '_blank')
                            }
                          }}
                        >
                          <ArrowRightLeftIcon className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            // Open explorer
                            if (token.address) {
                              window.open(`https://explorer.solana.com/address/${token.address}`, '_blank')
                            }
                          }}
                        >
                          <ExternalLinkIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}