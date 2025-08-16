"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

export function SolanaStatus() {
  const [network, setNetwork] = useState<string>("")
  const [status, setStatus] = useState<"connected" | "disconnected" | "loading">("loading")

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const net = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "mainnet-beta"
        setNetwork(net)
        
        // Simple check to see if we can fetch from RPC
        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getHealth",
          }),
        })
        
        if (response.ok) {
          setStatus("connected")
        } else {
          setStatus("disconnected")
        }
      } catch {
        setStatus("disconnected")
      }
    }

    checkConnection()
  }, [])

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Solana Network:</span>
      <Badge variant={status === "connected" ? "default" : "secondary"}>
        {network || "loading..."}
      </Badge>
      <div className={`w-2 h-2 rounded-full ${
        status === "connected" ? "bg-green-500" : 
        status === "loading" ? "bg-yellow-500" : 
        "bg-red-500"
      }`} />
    </div>
  )
}