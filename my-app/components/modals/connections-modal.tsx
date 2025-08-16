"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { LinkIcon, PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from "lucide-react"

interface ConnectionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectionsModal({ open, onOpenChange }: ConnectionsModalProps) {
  const [connections, setConnections] = useState([
    { id: 1, name: "Phantom Wallet", type: "wallet", status: "connected", enabled: true },
    { id: 2, name: "Solflare", type: "wallet", status: "disconnected", enabled: false },
    { id: 3, name: "Jupiter Exchange", type: "dex", status: "connected", enabled: true },
    { id: 4, name: "Magic Eden", type: "marketplace", status: "connected", enabled: true },
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Connections
          </DialogTitle>
          <DialogDescription>
            Manage your wallet and service connections
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </div>

          <div className="space-y-3">
            {connections.map((connection) => (
              <div key={connection.id} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {connection.status === "connected" ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium">{connection.name}</p>
                      <Badge variant="outline" className="mt-1">
                        {connection.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={connection.enabled}
                      onCheckedChange={(checked) => {
                        setConnections(connections.map(c => 
                          c.id === connection.id ? { ...c, enabled: checked } : c
                        ))
                      }}
                    />
                    <Button variant="ghost" size="sm">
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}