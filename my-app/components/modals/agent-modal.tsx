"use client"

import React, { useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { BotIcon, SettingsIcon, BrainIcon, ZapIcon } from "lucide-react"

interface AgentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgentModal({ open, onOpenChange }: AgentModalProps) {
  const [agentMode, setAgentMode] = useState("assistant")
  const [autoSuggest, setAutoSuggest] = useState(true)
  const [contextWindow, setContextWindow] = useState("8192")
  const [temperature, setTemperature] = useState("0.7")
  const [systemPrompt, setSystemPrompt] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BotIcon className="h-5 w-5" />
            Agent Configuration
          </DialogTitle>
          <DialogDescription>
            Configure AI agent behavior and capabilities
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="behavior" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="behavior" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Agent Mode</label>
                <Select value={agentMode} onValueChange={setAgentMode}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assistant">Assistant Mode</SelectItem>
                    <SelectItem value="creative">Creative Mode</SelectItem>
                    <SelectItem value="analytical">Analytical Mode</SelectItem>
                    <SelectItem value="coding">Coding Mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">System Prompt</label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter custom instructions for the agent..."
                  className="mt-1 h-32"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-suggestions</p>
                  <p className="text-sm text-muted-foreground">
                    Provide helpful suggestions during conversation
                  </p>
                </div>
                <Switch checked={autoSuggest} onCheckedChange={setAutoSuggest} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="capabilities" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ZapIcon className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Web Search</p>
                      <p className="text-sm text-muted-foreground">
                        Search the web for current information
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BrainIcon className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Code Execution</p>
                      <p className="text-sm text-muted-foreground">
                        Run and test code snippets
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SettingsIcon className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Tool Integration</p>
                      <p className="text-sm text-muted-foreground">
                        Use external tools and APIs
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Temperature</label>
                <div className="flex items-center gap-3 mt-1">
                  <Input
                    type="number"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    min="0"
                    max="2"
                    step="0.1"
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    Controls randomness (0 = focused, 2 = creative)
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Context Window</label>
                <Select value={contextWindow} onValueChange={setContextWindow}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4096">4,096 tokens</SelectItem>
                    <SelectItem value="8192">8,192 tokens</SelectItem>
                    <SelectItem value="16384">16,384 tokens</SelectItem>
                    <SelectItem value="32768">32,768 tokens</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button className="w-full">Save Configuration</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}