"use client"

import React from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  RocketIcon, 
  TrendingUpIcon, 
  FlameIcon, 
  DollarSignIcon,
  ZapIcon,
  ShieldCheckIcon,
  UsersIcon,
  InfoIcon
} from 'lucide-react'
import { LaunchpadPlatform, PLATFORM_CONFIGS } from '@/lib/launchpad-types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PlatformSelectorProps {
  value: LaunchpadPlatform
  onChange: (value: LaunchpadPlatform) => void
  showComparison?: boolean
}

export function PlatformSelector({ value, onChange, showComparison = true }: PlatformSelectorProps) {
  const platforms = Object.values(PLATFORM_CONFIGS)

  return (
    <div className="space-y-4">
      <RadioGroup value={value} onValueChange={(val) => onChange(val as LaunchpadPlatform)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => (
            <Card 
              key={platform.id} 
              className={`cursor-pointer transition-all ${
                value === platform.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onChange(platform.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value={platform.id} id={platform.id} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={platform.id} className="text-base font-semibold cursor-pointer">
                        {platform.name}
                      </Label>
                      {platform.id === 'pump' && (
                        <Badge variant="secondary">
                          <TrendingUpIcon className="h-3 w-3 mr-1" />
                          Bonding Curve
                        </Badge>
                      )}
                      {platform.id === 'bonk' && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          <FlameIcon className="h-3 w-3 mr-1" />
                          BONK Burn
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {platform.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="flex items-center text-xs">
                        <DollarSignIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span>Min: {platform.requirements.minSol} SOL</span>
                      </div>
                      <div className="flex items-center text-xs">
                        <ZapIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span>Fee: {platform.fees.trading}%</span>
                      </div>
                    </div>

                    {platform.id === 'pump' && (
                      <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                        <RocketIcon className="h-3 w-3 mr-1" />
                        Graduates to Raydium at $69K
                      </div>
                    )}

                    {platform.id === 'bonk' && (
                      <div className="flex items-center text-xs text-orange-600 dark:text-orange-400">
                        <ShieldCheckIcon className="h-3 w-3 mr-1" />
                        Instant Raydium + Jupiter
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </RadioGroup>

      {showComparison && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <InfoIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              <h3 className="font-semibold">Platform Comparison</h3>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="font-medium">Feature</div>
                <div className="font-medium text-center">Pump.fun</div>
                <div className="font-medium text-center">LetsBonk.fun</div>
              </div>
              
              <div className="border-t pt-2 space-y-2">
                <ComparisonRow 
                  feature="Initial Liquidity"
                  pump="Not Required"
                  bonk="Required (0.1+ SOL)"
                />
                <ComparisonRow 
                  feature="Trading Fee"
                  pump="0.5%"
                  bonk="0.25%"
                />
                <ComparisonRow 
                  feature="Platform Fee"
                  pump="0%"
                  bonk="1% (30% burned)"
                />
                <ComparisonRow 
                  feature="DEX Integration"
                  pump="After $69K"
                  bonk="Immediate"
                />
                <ComparisonRow 
                  feature="Graduation Rate"
                  pump="0.8%"
                  bonk="1.02%"
                  highlight="bonk"
                />
                <ComparisonRow 
                  feature="Starting Price"
                  pump="$0 (Bonding)"
                  bonk="Market Price"
                />
                <ComparisonRow 
                  feature="Best For"
                  pump="Fair Launch"
                  bonk="Quick Liquidity"
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-start space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <UsersIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Community Tip</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="text-xs text-muted-foreground">
                  <strong>Pro Tip:</strong> Use Pump.fun for fair launches with organic growth and Price Index tracking. 
                  Choose LetsBonk.fun for immediate liquidity, BONK ecosystem benefits (30% fee burn), and AI token RAY rewards.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ComparisonRow({ 
  feature, 
  pump, 
  bonk, 
  highlight 
}: { 
  feature: string
  pump: string
  bonk: string
  highlight?: 'pump' | 'bonk'
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-muted-foreground">{feature}</div>
      <div className={`text-center ${highlight === 'pump' ? 'font-semibold text-primary' : ''}`}>
        {pump}
      </div>
      <div className={`text-center ${highlight === 'bonk' ? 'font-semibold text-orange-600 dark:text-orange-400' : ''}`}>
        {bonk}
      </div>
    </div>
  )
}