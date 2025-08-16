"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BotIcon, 
  PlusIcon, 
  TrashIcon, 
  CopyIcon, 
  ExternalLinkIcon,
  PlayIcon,
  EditIcon,
  ShareIcon,
  SettingsIcon,
  EyeIcon,
  CodeIcon,
  GlobeIcon,
  ShieldIcon,
  BarChart3Icon,
  RefreshCwIcon,
  SendIcon,
  ArrowRightLeftIcon,
  CoinsIcon,
  ImageIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  QrCodeIcon
} from "lucide-react"
import { blinksService } from "@/lib/blinks-service"
import { ActionType } from "@/lib/blinks-types"

interface BlinksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface BlinkAction {
  id: string
  type: ActionType
  label: string
  href: string
  parameters: Array<{
    name: string
    label: string
    type?: string
    required?: boolean
    pattern?: string
  }>
}

interface BlinkConfig {
  id?: string
  title: string
  description: string
  icon: string
  label?: string
  actions: BlinkAction[]
  endpoint: string
  network: "mainnet-beta" | "devnet" | "testnet"
  customization: {
    primaryColor: string
    secondaryColor: string
    fontFamily: string
    borderRadius: string
  }
  security: {
    corsEnabled: boolean
    allowedDomains: string[]
    requireWalletConnection: boolean
  }
  createdAt?: string
}

const DEFAULT_BLINK_CONFIG: BlinkConfig = {
  title: "",
  description: "",
  icon: "",
  label: "",
  actions: [],
  endpoint: "",
  network: "devnet",
  customization: {
    primaryColor: "#9945FF",
    secondaryColor: "#14F195",
    fontFamily: "system-ui",
    borderRadius: "8px"
  },
  security: {
    corsEnabled: true,
    allowedDomains: [],
    requireWalletConnection: true
  }
}

// Predefined Actions templates
const ACTION_TEMPLATES = [
  {
    type: ActionType.TRANSFER,
    label: "Transfer SOL",
    icon: SendIcon,
    endpoint: "/api/actions/transfer",
    parameters: [
      { name: "to", label: "Recipient Address", type: "text", required: true },
      { name: "amount", label: "Amount (SOL)", type: "number", required: true }
    ]
  },
  {
    type: ActionType.SWAP,
    label: "Token Swap",
    icon: ArrowRightLeftIcon,
    endpoint: "/api/actions/swap",
    parameters: [
      { name: "fromToken", label: "From Token", type: "text", required: true },
      { name: "toToken", label: "To Token", type: "text", required: true },
      { name: "amount", label: "Amount", type: "number", required: true }
    ]
  },
  {
    type: ActionType.STAKE,
    label: "Stake SOL",
    icon: CoinsIcon,
    endpoint: "/api/actions/stake",
    parameters: [
      { name: "validator", label: "Validator Address", type: "text", required: true },
      { name: "amount", label: "Amount (SOL)", type: "number", required: true }
    ]
  },
  {
    type: ActionType.MINT_NFT,
    label: "Mint NFT",
    icon: ImageIcon,
    endpoint: "/api/actions/nft?action=mint",
    parameters: [
      { name: "name", label: "NFT Name", type: "text", required: true },
      { name: "symbol", label: "Symbol", type: "text", required: true },
      { name: "uri", label: "Metadata URI", type: "text", required: true }
    ]
  }
]

export function BlinksModal({ open, onOpenChange }: BlinksModalProps) {
  const [activeTab, setActiveTab] = useState("create")
  const [blinkConfig, setBlinkConfig] = useState<BlinkConfig>(DEFAULT_BLINK_CONFIG)
  const [savedBlinks, setSavedBlinks] = useState<BlinkConfig[]>([])
  const [previewMode, setPreviewMode] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showQRCode, setShowQRCode] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string>("")  

  // Load saved blinks from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('solana-blinks')
    if (saved) {
      try {
        setSavedBlinks(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load saved blinks:', error)
      }
    }
  }, [])

  // Save blinks to localStorage when savedBlinks changes
  useEffect(() => {
    localStorage.setItem('solana-blinks', JSON.stringify(savedBlinks))
  }, [savedBlinks])

  const handleConfigChange = (field: string, value: any) => {
    setBlinkConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCustomizationChange = (field: string, value: any) => {
    setBlinkConfig(prev => ({
      ...prev,
      customization: {
        ...prev.customization,
        [field]: value
      }
    }))
  }

  const handleSecurityChange = (field: string, value: any) => {
    setBlinkConfig(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [field]: value
      }
    }))
  }

  const addAction = () => {
    const newAction: BlinkAction = {
      id: `action-${Date.now()}`,
      type: ActionType.CUSTOM,
      label: "New Action",
      href: `${blinkConfig.endpoint}?action=new&amount={amount}`,
      parameters: [
        {
          name: "amount",
          label: "Amount",
          type: "number",
          required: true
        }
      ]
    }
    setBlinkConfig(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }))
  }

  const addTemplateAction = (template: typeof ACTION_TEMPLATES[0]) => {
    const baseUrl = window.location.origin
    const newAction: BlinkAction = {
      id: `action-${Date.now()}`,
      type: template.type,
      label: template.label,
      href: `${baseUrl}${template.endpoint}?${template.parameters.map(p => `${p.name}={${p.name}}`).join('&')}`,
      parameters: template.parameters
    }
    setBlinkConfig(prev => ({
      ...prev,
      actions: [...prev.actions, newAction],
      endpoint: prev.endpoint || `${baseUrl}${template.endpoint}`
    }))
  }

  const removeAction = (actionId: string) => {
    setBlinkConfig(prev => ({
      ...prev,
      actions: prev.actions.filter(action => action.id !== actionId)
    }))
  }

  const updateAction = (actionId: string, field: string, value: any) => {
    setBlinkConfig(prev => ({
      ...prev,
      actions: prev.actions.map(action => 
        action.id === actionId 
          ? { ...action, [field]: value }
          : action
      )
    }))
  }

  const saveBlink = () => {
    const newBlink = {
      ...blinkConfig,
      id: `blink-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    setSavedBlinks(prev => [...prev, newBlink])
    // Reset form
    setBlinkConfig(DEFAULT_BLINK_CONFIG)
  }

  const loadBlink = (blink: BlinkConfig) => {
    setBlinkConfig(blink)
    setActiveTab("create")
  }

  const deleteBlink = (blinkId: string) => {
    setSavedBlinks(prev => prev.filter(blink => blink.id !== blinkId))
  }

  const generateBlinkUrl = async () => {
    setIsGenerating(true)
    try {
      const blinkUrl = blinksService.generateBlinkUrl(blinkConfig.endpoint)
      setGeneratedUrl(blinkUrl)
      await navigator.clipboard.writeText(blinkUrl)
      // Show success feedback
      setTestResult({ success: true, message: "Blink URL copied to clipboard!" })
      setTimeout(() => setTestResult(null), 3000)
    } catch (error) {
      setTestResult({ success: false, message: "Failed to generate URL" })
    } finally {
      setIsGenerating(false)
    }
  }

  const testBlink = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      // Test the endpoint
      const response = await fetch(blinkConfig.endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.icon && data.title && data.description) {
          setTestResult({ success: true, message: "Blink endpoint is working correctly!" })
        } else {
          setTestResult({ success: false, message: "Invalid response format from endpoint" })
        }
      } else {
        setTestResult({ success: false, message: `Endpoint returned status ${response.status}` })
      }
    } catch (error) {
      setTestResult({ success: false, message: "Failed to connect to endpoint" })
    } finally {
      setIsTesting(false)
    }
  }

  const networkOptions = [
    { value: "mainnet-beta", label: "Mainnet", color: "bg-green-500" },
    { value: "devnet", label: "Devnet", color: "bg-yellow-500" },
    { value: "testnet", label: "Testnet", color: "bg-blue-500" }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BotIcon className="h-5 w-5" />
            Solana Blinks Manager
          </DialogTitle>
          <DialogDescription>
            Create, customize, and manage your Solana Blinks for seamless blockchain interactions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="customize" className="flex items-center gap-2">
              <EyeIcon className="h-4 w-4" />
              Customize
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" />
              Manage
            </TabsTrigger>
          </TabsList>

          {/* Create Blink Tab */}
          <TabsContent value="create" className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                  <CardDescription>
                    Configure the core details for your Blink
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium">Title *</label>
                    <Input
                      id="title"
                      placeholder="My Awesome Blink"
                      value={blinkConfig.title}
                      onChange={(e) => handleConfigChange('title', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">Description *</label>
                    <Textarea
                      id="description"
                      placeholder="A description of what this Blink does"
                      value={blinkConfig.description}
                      onChange={(e) => handleConfigChange('description', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="icon" className="text-sm font-medium">Icon URL *</label>
                    <Input
                      id="icon"
                      placeholder="https://example.com/icon.png"
                      value={blinkConfig.icon}
                      onChange={(e) => handleConfigChange('icon', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Must be an absolute URL</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="label" className="text-sm font-medium">Default Label</label>
                    <Input
                      id="label"
                      placeholder="Click to interact"
                      value={blinkConfig.label}
                      onChange={(e) => handleConfigChange('label', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Network & Endpoint Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Network Configuration</CardTitle>
                  <CardDescription>
                    Set up your Solana network and API endpoint
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="network" className="text-sm font-medium">Network</label>
                    <Select value={blinkConfig.network} onValueChange={(value) => handleConfigChange('network', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {networkOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${option.color}`} />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="endpoint" className="text-sm font-medium">API Endpoint *</label>
                    <Input
                      id="endpoint"
                      placeholder="https://your-api.com/actions/vault"
                      value={blinkConfig.endpoint}
                      onChange={(e) => handleConfigChange('endpoint', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your Actions-compliant API endpoint
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">CORS Headers</p>
                      <p className="text-xs text-muted-foreground">
                        Enable Cross-Origin Resource Sharing
                      </p>
                    </div>
                    <Switch 
                      checked={blinkConfig.security.corsEnabled}
                      onCheckedChange={(checked) => handleSecurityChange('corsEnabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Action Templates</CardTitle>
                <CardDescription>
                  Add pre-configured Solana Actions to your Blink
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {ACTION_TEMPLATES.map((template) => {
                    const Icon = template.icon
                    return (
                      <Button
                        key={template.type}
                        variant="outline"
                        className="h-auto flex-col py-3"
                        onClick={() => addTemplateAction(template)}
                      >
                        <Icon className="h-6 w-6 mb-2" />
                        <span className="text-xs">{template.label}</span>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Actions Configuration */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Actions Configuration</CardTitle>
                  <CardDescription>
                    Define the interactive buttons and their parameters
                  </CardDescription>
                </div>
                <Button onClick={addAction} size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Custom
                </Button>
              </CardHeader>
              <CardContent>
                {blinkConfig.actions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BotIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No actions configured yet</p>
                    <p className="text-sm">Add your first action to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blinkConfig.actions.map((action, index) => (
                      <Card key={action.id} className="border-l-4 border-l-primary">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Action {index + 1}</Badge>
                              <Badge variant="secondary">{action.type || 'custom'}</Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAction(action.id)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Button Label</label>
                              <Input
                                placeholder="Deposit SOL"
                                value={action.label}
                                onChange={(e) => updateAction(action.id, 'label', e.target.value)}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Action URL Pattern</label>
                              <Input
                                placeholder="?action=deposit&amount={amount}"
                                value={action.href}
                                onChange={(e) => updateAction(action.id, 'href', e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <label className="text-sm font-medium mb-2 block">Parameters</label>
                            <div className="space-y-2">
                              {action.parameters.map((param, paramIndex) => (
                                <div key={paramIndex} className="flex items-center gap-2 p-2 bg-muted rounded">
                                  <Input
                                    placeholder="Parameter name"
                                    value={param.name}
                                    className="flex-1"
                                    onChange={(e) => {
                                      const newParams = [...action.parameters]
                                      newParams[paramIndex].name = e.target.value
                                      updateAction(action.id, 'parameters', newParams)
                                    }}
                                  />
                                  <Input
                                    placeholder="Label"
                                    value={param.label}
                                    className="flex-1"
                                    onChange={(e) => {
                                      const newParams = [...action.parameters]
                                      newParams[paramIndex].label = e.target.value
                                      updateAction(action.id, 'parameters', newParams)
                                    }}
                                  />
                                  <Select
                                    value={param.type || 'text'}
                                    onValueChange={(value) => {
                                      const newParams = [...action.parameters]
                                      newParams[paramIndex].type = value
                                      updateAction(action.id, 'parameters', newParams)
                                    }}
                                  >
                                    <SelectTrigger className="w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">Text</SelectItem>
                                      <SelectItem value="number">Number</SelectItem>
                                      <SelectItem value="email">Email</SelectItem>
                                      <SelectItem value="url">URL</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              {testResult && (
                <div className={`flex items-center gap-2 text-sm ${
                  testResult.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {testResult.success ? (
                    <CheckCircleIcon className="h-4 w-4" />
                  ) : (
                    <AlertCircleIcon className="h-4 w-4" />
                  )}
                  {testResult.message}
                </div>
              )}
              <div className="flex gap-2 ml-auto">
                <Button 
                  variant="outline"
                  onClick={testBlink}
                  disabled={!blinkConfig.endpoint || isTesting}
                >
                  {isTesting ? (
                    <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlayIcon className="h-4 w-4 mr-2" />
                  )}
                  Test Endpoint
                </Button>
                <Button 
                  onClick={saveBlink}
                  disabled={!blinkConfig.title || !blinkConfig.description || !blinkConfig.endpoint}
                  className="min-w-32"
                >
                  Save Blink
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Visual Customization Tab */}
          <TabsContent value="customize" className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Color Customization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Color Scheme</CardTitle>
                  <CardDescription>
                    Customize the visual appearance of your Blink
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="primaryColor" className="text-sm font-medium">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={blinkConfig.customization.primaryColor}
                        onChange={(e) => handleCustomizationChange('primaryColor', e.target.value)}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={blinkConfig.customization.primaryColor}
                        onChange={(e) => handleCustomizationChange('primaryColor', e.target.value)}
                        placeholder="#9945FF"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="secondaryColor" className="text-sm font-medium">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={blinkConfig.customization.secondaryColor}
                        onChange={(e) => handleCustomizationChange('secondaryColor', e.target.value)}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={blinkConfig.customization.secondaryColor}
                        onChange={(e) => handleCustomizationChange('secondaryColor', e.target.value)}
                        placeholder="#14F195"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="fontFamily" className="text-sm font-medium">Font Family</label>
                    <Select 
                      value={blinkConfig.customization.fontFamily} 
                      onValueChange={(value) => handleCustomizationChange('fontFamily', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system-ui">System UI</SelectItem>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="monospace">Monospace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="borderRadius" className="text-sm font-medium">Border Radius</label>
                    <Select 
                      value={blinkConfig.customization.borderRadius} 
                      onValueChange={(value) => handleCustomizationChange('borderRadius', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">Square (0px)</SelectItem>
                        <SelectItem value="4px">Small (4px)</SelectItem>
                        <SelectItem value="8px">Medium (8px)</SelectItem>
                        <SelectItem value="12px">Large (12px)</SelectItem>
                        <SelectItem value="16px">XL (16px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Live Preview</CardTitle>
                  <CardDescription>
                    See how your Blink will appear to users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="border rounded-lg p-4 bg-gradient-to-br from-background to-muted"
                    style={{ 
                      borderRadius: blinkConfig.customization.borderRadius,
                      fontFamily: blinkConfig.customization.fontFamily 
                    }}
                  >
                    {blinkConfig.icon && (
                      <img 
                        src={blinkConfig.icon} 
                        alt="Blink icon"
                        className="w-12 h-12 rounded mb-3"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                    <h3 className="font-semibold text-lg mb-2">
                      {blinkConfig.title || "Your Blink Title"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {blinkConfig.description || "Your Blink description will appear here"}
                    </p>
                    <div className="space-y-2">
                      {blinkConfig.actions.length > 0 ? (
                        blinkConfig.actions.map((action) => (
                          <Button
                            key={action.id}
                            className="w-full"
                            style={{ 
                              backgroundColor: blinkConfig.customization.primaryColor,
                              borderRadius: blinkConfig.customization.borderRadius 
                            }}
                          >
                            {action.label}
                          </Button>
                        ))
                      ) : (
                        <Button 
                          className="w-full"
                          style={{ 
                            backgroundColor: blinkConfig.customization.primaryColor,
                            borderRadius: blinkConfig.customization.borderRadius 
                          }}
                        >
                          {blinkConfig.label || "Default Action"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="advanced" className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldIcon className="h-5 w-5" />
                    Security Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure security and access controls
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Require Wallet Connection</p>
                      <p className="text-xs text-muted-foreground">
                        Users must connect wallet before interaction
                      </p>
                    </div>
                    <Switch 
                      checked={blinkConfig.security.requireWalletConnection}
                      onCheckedChange={(checked) => handleSecurityChange('requireWalletConnection', checked)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="allowedDomains" className="text-sm font-medium">Allowed Domains</label>
                    <Textarea
                      id="allowedDomains"
                      placeholder="example.com&#10;yourdomain.io"
                      value={blinkConfig.security.allowedDomains.join('\n')}
                      onChange={(e) => handleSecurityChange('allowedDomains', e.target.value.split('\n').filter(Boolean))}
                    />
                    <p className="text-xs text-muted-foreground">
                      One domain per line. Leave empty for no restrictions.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Integration Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GlobeIcon className="h-5 w-5" />
                    Platform Integration
                  </CardTitle>
                  <CardDescription>
                    Configure platform-specific settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">X (Twitter) Optimization</label>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Auto-unfurl on X</p>
                        <p className="text-xs text-muted-foreground">
                          Enable automatic Blink display on X.com
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Discord Integration</label>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Discord Bot Expansion</p>
                        <p className="text-xs text-muted-foreground">
                          Allow bots to expand Blinks into buttons
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dial.to Registration</label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <ExternalLinkIcon className="h-4 w-4 mr-2" />
                        Register with Dial.to
                      </Button>
                      <Button variant="outline" size="sm">
                        <CodeIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Register your Blink for proper unfurling support
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manage & Test Tab */}
          <TabsContent value="manage" className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Saved Blinks */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Saved Blinks</CardTitle>
                    <CardDescription>
                      Manage your created Blinks
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{savedBlinks.length}</Badge>
                </CardHeader>
                <CardContent>
                  {savedBlinks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BotIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No saved Blinks yet</p>
                      <p className="text-sm">Create your first Blink to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedBlinks.map((blink) => (
                        <Card key={blink.id} className="border border-border">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{blink.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {blink.description}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {blink.network}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {blink.actions.length} actions
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => loadBlink(blink)}
                                >
                                  <EditIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const blinkUrl = `https://dial.to/?action=solana-action:${encodeURIComponent(blink.endpoint)}`
                                    navigator.clipboard.writeText(blinkUrl)
                                  }}
                                >
                                  <CopyIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => blink.id && deleteBlink(blink.id)}
                                >
                                  <TrashIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Testing Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Testing & Tools</CardTitle>
                  <CardDescription>
                    Test and share your Blinks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Generate Blink URL</label>
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={generateBlinkUrl}
                        disabled={!blinkConfig.endpoint || isGenerating}
                        className="flex-1"
                      >
                        {isGenerating ? (
                          <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ShareIcon className="h-4 w-4 mr-2" />
                        )}
                        {isGenerating ? 'Generating...' : 'Generate & Copy URL'}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowQRCode(!showQRCode)}
                        disabled={!generatedUrl}
                      >
                        <QrCodeIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    {generatedUrl && (
                      <div className="p-2 bg-muted rounded text-xs break-all">
                        {generatedUrl}
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Testing Tools</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={testBlink}
                          disabled={!blinkConfig.endpoint || isTesting}
                        >
                          {isTesting ? (
                            <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <PlayIcon className="h-4 w-4 mr-2" />
                          )}
                          Test Actions
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('https://www.blinks.xyz/inspector', '_blank')}
                        >
                          <ExternalLinkIcon className="h-4 w-4 mr-2" />
                          Blinks Inspector
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Performance</label>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Response Time</span>
                          <Badge variant="secondary">~245ms</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Success Rate</span>
                          <Badge variant="secondary">98.5%</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Total Clicks</span>
                          <Badge variant="secondary">1,247</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}