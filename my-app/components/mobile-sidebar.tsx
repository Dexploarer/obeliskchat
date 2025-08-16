"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"

const MenuIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

interface MobileSidebarProps {
  onNavigate?: (item: string) => void
}

export function MobileSidebar({ onNavigate }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  const handleNavigation = (itemId: string) => {
    setOpen(false) // Close the mobile sidebar after navigation
    if (onNavigate) {
      onNavigate(itemId)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden fixed top-4 left-4 z-50 h-8 w-8 p-0">
          <MenuIcon />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <Sidebar onNavigate={handleNavigation} />
      </SheetContent>
    </Sheet>
  )
}
