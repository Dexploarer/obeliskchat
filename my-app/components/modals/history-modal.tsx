"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { HistoryIcon, MessageSquareIcon } from "lucide-react"

interface HistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HistoryModal({ open, onOpenChange }: HistoryModalProps) {
  // Mock chat history data - replace with actual data fetching
  const chatHistory = [
    { id: 1, title: "Solana Token Creation", date: "2 hours ago", messages: 12 },
    { id: 2, title: "DeFi Protocol Analysis", date: "Yesterday", messages: 45 },
    { id: 3, title: "NFT Collection Review", date: "2 days ago", messages: 23 },
    { id: 4, title: "Yield Farming Strategies", date: "3 days ago", messages: 67 },
    { id: 5, title: "Smart Contract Audit", date: "1 week ago", messages: 89 },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5" />
            Chat History
          </DialogTitle>
          <DialogDescription>
            View and continue your previous conversations
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => {
                  // Handle chat selection
                  console.log("Selected chat:", chat.id)
                  onOpenChange(false)
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{chat.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{chat.date}</p>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    <MessageSquareIcon className="h-3 w-3 mr-1" />
                    {chat.messages}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}