"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  ServerIcon,
  PlusIcon,
  RefreshCwIcon,
  WrenchIcon,
  DatabaseIcon,
  GlobeIcon,
  CodeIcon,
  FileIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseIcon,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MCPServerConfig {
  id: string
  name: string
  description: string
  type: "stdio" | "sse" | "http"
  command?: string
  args?: string[]
  url?: string
  enabled: boolean
  category: string
  version?: string
  author?: string
  tools?: string[]
}

interface MCPToolsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categoryIcons = {
  "file-management": FileIcon,
  development: CodeIcon,
  "web-scraping": GlobeIcon,
  database: DatabaseIcon,
  productivity: WrenchIcon,
  communication: ServerIcon,
}

const categoryColors = {
  "file-management": "bg-blue-100 text-blue-800",
  development: "bg-green-100 text-green-800",
  "web-scraping": "bg-purple-100 text-purple-800",
  database: "bg-orange-100 text-orange-800",
  productivity: "bg-indigo-100 text-indigo-800",
  communication: "bg-pink-100 text-pink-800",
}

export function MCPToolsModal({ open, onOpenChange }: MCPToolsModalProps) {
  const [servers, setServers] = useState<MCPServerConfig[]>([])
  const [enabledServers, setEnabledServers] = useState<MCPServerConfig[]>([])
  const [tools, setTools] = useState<Record<string, any>>({})
  const [health, setHealth] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [addServerOpen, setAddServerOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // New server form state
  const [newServer, setNewServer] = useState<Partial<MCPServerConfig>>({
    name: "",
    description: "",
    type: "stdio",
    command: "",
    args: [],
    url: "",
    category: "productivity",
  })

  useEffect(() => {
    if (open) {
      initializeAndFetch()
    }
  }, [open])

  const initializeAndFetch = async () => {
    try {
      await fetchServers()
      await fetchTools()
      await fetchHealth()
    } catch (error) {
      console.error("Failed to initialize MCP:", error)
      setLoading(false)
    }
  }

  const fetchServers = async () => {
    try {
      const response = await fetch("/api/mcp")
      const data = await response.json()
      setServers(data.servers || [])
      setEnabledServers(data.servers?.filter((s: MCPServerConfig) => s.enabled) || [])
    } catch (error) {
      console.error("Failed to fetch servers:", error)
    }
  }

  const fetchTools = async () => {
    try {
      const response = await fetch("/api/mcp?action=tools")
      const data = await response.json()
      setTools(data.tools || {})
    } catch (error) {
      console.error("Failed to fetch tools:", error)
    }
  }

  const fetchHealth = async () => {
    try {
      const response = await fetch("/api/mcp?action=health")
      const data = await response.json()
      setHealth(data.health || {})
    } catch (error) {
      console.error("Failed to fetch health:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleServer = async (serverId: string, enabled: boolean) => {
    try {
      const action = enabled ? "enable" : "disable"
      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, serverId }),
      })

      if (response.ok) {
        await fetchServers()
        await fetchTools()
        await fetchHealth()
      }
    } catch (error) {
      console.error(`Failed to ${enabled ? "enable" : "disable"} server:`, error)
    }
  }

  const addServer = async () => {
    try {
      const config: MCPServerConfig = {
        ...newServer,
        id: newServer.name?.toLowerCase().replace(/\s+/g, "-") || "",
        enabled: false,
        args: newServer.type === "stdio" ? newServer.command?.split(" ").slice(1) || [] : [],
      } as MCPServerConfig

      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", config }),
      })

      if (response.ok) {
        await fetchServers()
        setAddServerOpen(false)
        setNewServer({
          name: "",
          description: "",
          type: "stdio",
          command: "",
          args: [],
          url: "",
          category: "productivity",
        })
      }
    } catch (error) {
      console.error("Failed to add server:", error)
    }
  }

  const removeServer = async (serverId: string) => {
    try {
      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", serverId }),
      })

      if (response.ok) {
        await fetchServers()
        await fetchTools()
        await fetchHealth()
      }
    } catch (error) {
      console.error("Failed to remove server:", error)
    }
  }

  const refreshData = async () => {
    setLoading(true)
    await Promise.all([fetchServers(), fetchTools(), fetchHealth()])
    setLoading(false)
  }

  const filteredServers = servers.filter((server) => {
    const matchesCategory = selectedCategory === "all" || server.category === selectedCategory
    const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         server.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const categories = Array.from(new Set(servers.map(s => s.category)))

  const getServerStatus = (serverId: string) => {
    if (!enabledServers.find(s => s.id === serverId)) return "disabled"
    return health[serverId] ? "connected" : "error"
  }

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "connected":
        return <CheckCircleIcon className="size-4 text-green-600" />
      case "error":
        return <XCircleIcon className="size-4 text-red-600" />
      case "disabled":
        return <PauseIcon className="size-4 text-gray-400" />
      default:
        return <PauseIcon className="size-4 text-gray-400" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <div className="p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">MCP Tools</DialogTitle>
                <DialogDescription>
                  Manage Model Context Protocol servers and tools
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={refreshData} variant="outline" size="sm">
                  <RefreshCwIcon className="size-4 mr-2" />
                  Refresh
                </Button>
                <Dialog open={addServerOpen} onOpenChange={setAddServerOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <PlusIcon className="size-4 mr-2" />
                      Add Server
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add MCP Server</DialogTitle>
                      <DialogDescription>
                        Configure a new Model Context Protocol server
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          value={newServer.name || ""}
                          onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                          placeholder="Server name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          value={newServer.description || ""}
                          onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
                          placeholder="Server description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Type</label>
                          <select
                            value={newServer.type || "stdio"}
                            onChange={(e) => setNewServer({ ...newServer, type: e.target.value as any })}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="stdio">stdio</option>
                            <option value="sse">SSE</option>
                            <option value="http">HTTP</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Category</label>
                          <select
                            value={newServer.category || "productivity"}
                            onChange={(e) => setNewServer({ ...newServer, category: e.target.value })}
                            className="w-full p-2 border rounded-md"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {newServer.type === "stdio" && (
                        <div>
                          <label className="text-sm font-medium">Command</label>
                          <Input
                            value={newServer.command || ""}
                            onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                            placeholder="npx @modelcontextprotocol/server-filesystem"
                          />
                        </div>
                      )}
                      {(newServer.type === "sse" || newServer.type === "http") && (
                        <div>
                          <label className="text-sm font-medium">URL</label>
                          <Input
                            value={newServer.url || ""}
                            onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                            placeholder="https://api.example.com/mcp"
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddServerOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addServer}>Add Server</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="h-[60vh]">
          <div className="px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Tabs defaultValue="servers" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="servers">Servers ({servers.length})</TabsTrigger>
                  <TabsTrigger value="tools">Tools ({Object.keys(tools).length})</TabsTrigger>
                  <TabsTrigger value="health">Health Status</TabsTrigger>
                </TabsList>

                <TabsContent value="servers" className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      placeholder="Search servers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64"
                    />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="p-2 border rounded-md"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredServers.map((server) => {
                      const status = getServerStatus(server.id)
                      const CategoryIcon = categoryIcons[server.category as keyof typeof categoryIcons] || WrenchIcon

                      return (
                        <Card key={server.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <CategoryIcon className="size-5 text-muted-foreground" />
                              <div>
                                <h3 className="font-medium">{server.name}</h3>
                                <p className="text-sm text-muted-foreground">{server.description}</p>
                              </div>
                            </div>
                            <StatusIcon status={status} />
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={categoryColors[server.category as keyof typeof categoryColors] || "bg-gray-100 text-gray-800"}>
                                {server.category}
                              </Badge>
                              <Badge variant="outline">{server.type}</Badge>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={server.enabled}
                                onCheckedChange={(checked) => toggleServer(server.id, checked)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeServer(server.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>

                          {server.tools && server.tools.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground mb-2">Available tools:</p>
                              <div className="flex flex-wrap gap-1">
                                {server.tools.slice(0, 3).map((tool) => (
                                  <Badge key={tool} variant="secondary" className="text-xs">
                                    {tool}
                                  </Badge>
                                ))}
                                {server.tools.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{server.tools.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="tools" className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(tools).map(([toolName, tool]) => (
                      <Card key={toolName} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{toolName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {tool.description || "No description available"}
                            </p>
                          </div>
                          <WrenchIcon className="size-4 text-muted-foreground" />
                        </div>
                      </Card>
                    ))}
                  </div>
                  {Object.keys(tools).length === 0 && (
                    <div className="text-center py-8">
                      <WrenchIcon className="size-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No MCP tools available. Enable some servers to see tools here.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="health" className="space-y-4">
                  <div className="grid gap-4">
                    {enabledServers.map((server) => {
                      const isHealthy = health[server.id]
                      return (
                        <Card key={server.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <StatusIcon status={isHealthy ? "connected" : "error"} />
                              <div>
                                <h4 className="font-medium">{server.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {isHealthy ? "Server is healthy" : "Server is experiencing issues"}
                                </p>
                              </div>
                            </div>
                            <Badge variant={isHealthy ? "default" : "destructive"}>
                              {isHealthy ? "Online" : "Offline"}
                            </Badge>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                  {enabledServers.length === 0 && (
                    <div className="text-center py-8">
                      <ServerIcon className="size-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No enabled servers to monitor.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}