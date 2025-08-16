"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PlaceholderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  icon?: React.ReactNode
}

export function PlaceholderModal({ 
  open, 
  onOpenChange, 
  title, 
  description,
  icon 
}: PlaceholderModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            This feature is coming soon. Stay tuned!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}