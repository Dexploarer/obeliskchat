"use client"

import type React from "react"

import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation"
import { Message, MessageAvatar, MessageContent } from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputToolsSelect,
  PromptInputToolsSelectContent,
  PromptInputToolsSelectItem,
  PromptInputToolsSelectTrigger,
  PromptInputToolsSelectValue,
} from "@/components/ai-elements/prompt-input"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { useChat } from "@ai-sdk/react"
import { Response } from "@/components/ai-elements/response"
import { GlobeIcon, MicIcon, PlusIcon } from "lucide-react"
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/source"
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning"
import { Loader } from "@/components/ai-elements/loader"
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool"
import { MobileSidebar } from "@/components/mobile-sidebar"

const models = [
  // Default first: GPT-5 Mini
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai" },
  { id: "gpt-5", name: "GPT-5", provider: "openai" },
  { id: "gpt-5-nano", name: "GPT-5 Nano", provider: "openai" },
  // Anthropic
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "anthropic" },
  { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", provider: "anthropic" },
  // Groq
  { id: "mixtral-8x7b-32768", name: "Mixtral-8x7b", provider: "groq" },
  { id: "llama2-70b-4096", name: "Llama2-70B", provider: "groq" },
]

const availableTools = [
  { id: "web-search", name: "Web Search", description: "Search the web for current information" },
  { id: "calculator", name: "Calculator", description: "Perform mathematical calculations" },
  { id: "code-interpreter", name: "Code Interpreter", description: "Execute and analyze code" },
  { id: "weather", name: "Weather", description: "Get current weather information" },
  { id: "solana-balance", name: "Solana Balance", description: "Check SOL wallet balances" },
  { id: "solana-token-price", name: "Token Prices", description: "Get Solana token prices and market data" },
  { id: "defi-analyzer", name: "DeFi Analyzer", description: "Analyze DeFi protocols and yields" },
  { id: "nft-analyzer", name: "NFT Analyzer", description: "Analyze NFT collections and trends" },
  { id: "image-generator", name: "Image Generator", description: "Generate images from text descriptions" },
  { id: "pdf-reader", name: "PDF Reader", description: "Read and analyze PDF documents" },
]

const ChatBotDemo = () => {
  const [input, setInput] = useState("")
  const [model, setModel] = useState<string>(models[0].id)
  const [webSearch, setWebSearch] = useState(false)
  const [enabledTools, setEnabledTools] = useState<string[]>(["web-search"])
  const [toolsOpen, setToolsOpen] = useState(false)
  const [mcpTools, setMcpTools] = useState<Record<string, any>>({})
  const [allAvailableTools, setAllAvailableTools] = useState(availableTools)
  const currentProvider = models.find((m) => m.id === model)?.provider || "openai"
  const { messages, sendMessage, status } = useChat()

  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const suggestions = [
    "What's the current SOL price and market trends?",
    "How do I create a Solana token?",
    "Explain liquidity pools and yield farming",
    "Best DeFi protocols on Solana",
    "How to stake SOL for rewards?",
    "What are SPL tokens and how do they work?",
  ]

  // Fetch MCP tools on component mount
  useEffect(() => {
    const fetchMCPTools = async () => {
      try {
        // Fetch MCP tools from API (server-side handles MCP initialization)
        const response = await fetch("/api/mcp?action=tools")
        const data = await response.json()
        setMcpTools(data.tools || {})
        
        // Combine regular tools with MCP tools
        const mcpToolsForUI = Object.keys(data.tools || {}).map(toolName => ({
          id: toolName,
          name: toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: data.tools[toolName].description || "MCP tool"
        }))
        
        setAllAvailableTools([...availableTools, ...mcpToolsForUI])
      } catch (error) {
        console.error("Failed to fetch MCP tools:", error)
      }
    }
    
    fetchMCPTools()
  }, [])

  const handleSuggestionClick = (suggestion: string) => {
    const provider = models.find((m) => m.id === model)?.provider || "openai"
    const effectiveWebSearch = provider === "openai" ? webSearch : false
    sendMessage({ text: suggestion, metadata: { useWebSearch: effectiveWebSearch, modelId: model, provider } })
  }

  const handleFileInput = () => {
    fileInputRef.current?.click()
  }

  const onFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      sendMessage({
        // @ts-ignore
        parts: [
          {
            type: "file",
            data: dataUrl,
            mediaType: file.type,
            filename: file.name,
          } as any,
        ],
        metadata: { modelId: model, provider: models.find((m) => m.id === model)?.provider || "openai" },
      } as any)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      const effectiveWebSearch = currentProvider === "openai" ? webSearch : false
      sendMessage(
        { text: input, metadata: { useWebSearch: effectiveWebSearch, modelId: model, provider: currentProvider } },
        {
          body: {
            model: model,
            webSearch: webSearch,
            tools: enabledTools,
          },
        },
      )
      setInput("")
    }
  }

  // Handle microphone recording (transcription)
  const handleMicClick = async () => {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        const chunks: BlobPart[] = []
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: "audio/webm" })
          const formData = new FormData()
          formData.append("audio", blob, "recording.webm")
          try {
            setTranscribing(true)
            const res = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
            })
            const data = await res.json()
            if (data.text) {
              setInput(data.text)
            }
            setTranscribing(false)
          } catch (error) {
            console.error("Transcription error", error)
            setTranscribing(false)
          }
        }
        mediaRecorderRef.current = mediaRecorder
        mediaRecorder.start()
        setRecording(true)
      } catch (err) {
        console.error("Could not start recording", err)
      }
    } else {
      mediaRecorderRef.current?.stop()
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop())
      setRecording(false)
    }
  }

  const handleToolToggle = (toolId: string) => {
    setEnabledTools((prev) => (prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]))
  }

  const handleToolSelect = (toolId: string, event: React.SyntheticEvent) => {
    event.preventDefault()
    handleToolToggle(toolId)
    // Keep dropdown open for multiple selections
    setToolsOpen(true)
  }

  return (
    <div className="p-6 relative size-full h-screen">
      <MobileSidebar />
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => {
              // Extract sources from 'source' parts
              const sourceParts = message.parts.filter(
                (part) => part.type === "source-url" || part.type === "source-document",
              )
              const streamedSources = sourceParts
                .map((part: any) => ({
                  title: part.title || part.source?.title || part.url || part.source?.url,
                  href: part.url || part.source?.url,
                }))
                .filter((s) => !!s.href)

              // Extract sources from tool results (web_search_preview)
              const toolSources = message.parts
                .filter((part) => part.type === "tool-result")
                .flatMap((part) => {
                  if (part.type === "tool-result") {
                    const toolResult = part as any
                    if (toolResult.toolName === "web_search_preview" && toolResult.result) {
                      let parsed = toolResult.result
                      if (typeof parsed === "string") {
                        try {
                          parsed = JSON.parse(parsed)
                        } catch {
                          return []
                        }
                      }
                      return (
                        parsed.results?.map((r: any) => ({
                          title: r.title,
                          href: r.url,
                        })) || []
                      )
                    }
                  }
                  return []
                })

              // Merge and deduplicate sources by href
              const sourcesMap = new Map<string, { title: string; href: string }>()
              ;[...streamedSources, ...toolSources].forEach((s) => {
                if (s && s.href && !sourcesMap.has(s.href)) {
                  sourcesMap.set(s.href, s as { title: string; href: string })
                }
              })
              const sources = Array.from(sourcesMap.values())

              return (
                <div key={message.id}>
                  {message.role === "assistant" && sources.length > 0 && (
                    <Sources>
                      <SourcesTrigger count={sources.length} />
                      <SourcesContent>
                        {sources.map((source, index) => (
                          <Source key={index} href={source.href} title={source.title} />
                        ))}
                      </SourcesContent>
                    </Sources>
                  )}
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case "text":
                            return <Response key={`${message.id}-${i}`}>{part.text}</Response>
                          case "reasoning":
                            return (
                              <Reasoning key={`${message.id}-${i}`} className="mb-4" defaultOpen={false}>
                                <ReasoningTrigger />
                                <ReasoningContent>
                                  {part.text}
                                </ReasoningContent>
                              </Reasoning>
                            )
                          case "tool-call":
                            return (
                              <Tool key={`${message.id}-${i}`} defaultOpen>
                                <ToolHeader type={(part as any).toolName || 'Unknown'} state="input-available" />
                                <ToolContent>
                                  <ToolInput input={(part as any).args || {}} />
                                </ToolContent>
                              </Tool>
                            )
                          case "tool-result":
                            // Find the corresponding tool call
                            const toolCall = message.parts.find(
                              (p) => p.type === "tool-call" && p.toolCallId === part.toolCallId
                            )
                            const toolName = toolCall ? (toolCall as any).toolName : "Unknown"
                            const partResult = (part as any).result
                            const hasError = partResult && typeof partResult === 'object' && 'error' in partResult
                            
                            return (
                              <Tool key={`${message.id}-${i}`} defaultOpen>
                                <ToolHeader 
                                  type={toolName} 
                                  state={hasError ? "output-error" : "output-available"} 
                                />
                                <ToolContent>
                                  <ToolOutput 
                                    output={
                                      typeof partResult === 'string' 
                                        ? partResult 
                                        : <pre className="text-xs overflow-x-auto">{JSON.stringify(partResult, null, 2)}</pre>
                                    } 
                                    errorText={hasError ? partResult.error : undefined}
                                  />
                                </ToolContent>
                              </Tool>
                            )
                          default:
                            return null
                        }
                      })}
                    </MessageContent>
                    <MessageAvatar
                      name={message.role === "user" ? "User" : "AI"}
                      src={
                        message.role === "user"
                          ? "https://github.com/haydenbleasel.png"
                          : "https://github.com/openai.png"
                      }
                    />
                  </Message>
                </div>
              )
            })}
            {status === "submitted" && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <Suggestions className="px-4">
          {suggestions.map((s) => (
            <Suggestion key={s} suggestion={s} onClick={() => handleSuggestionClick(s)} />
          ))}
        </Suggestions>

        <PromptInput onSubmit={handleSubmit} className="mt-4">
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
            disabled={transcribing}
            placeholder={transcribing ? "Transcribing audio..." : undefined}
          />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputButton onClick={handleFileInput}>
                <PlusIcon size={16} />
                <span className="sr-only">Add image</span>
              </PromptInputButton>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFileSelected} />
              <PromptInputButton onClick={handleMicClick} variant={recording ? "default" : "ghost"}>
                <MicIcon size={16} />
                <span className="sr-only">Microphone</span>
              </PromptInputButton>
              <PromptInputButton
                onClick={() => currentProvider === "openai" && setWebSearch(!webSearch)}
                variant={webSearch && currentProvider === "openai" ? "default" : "ghost"}
                disabled={currentProvider !== "openai"}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
            </PromptInputTools>
            <div className="flex items-center gap-2">
              <PromptInputToolsSelect open={toolsOpen} onOpenChange={setToolsOpen} value="">
                <PromptInputToolsSelectTrigger>
                  <PromptInputToolsSelectValue
                    placeholder={enabledTools.length > 0 ? `Tools (${enabledTools.length} active)` : "Tools (0 active)"}
                  />
                </PromptInputToolsSelectTrigger>
                <PromptInputToolsSelectContent>
                  <div className="p-2 text-sm font-medium text-muted-foreground border-b">
                    Select Multiple Tools ({enabledTools.length} active)
                  </div>
                  {allAvailableTools.map((tool) => (
                    <PromptInputToolsSelectItem
                      key={tool.id}
                      value={tool.id}
                      onSelect={(e) => handleToolSelect(tool.id, e)}
                      className="flex items-center justify-between cursor-pointer hover:bg-accent"
                    >
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tool.name}</span>
                          {mcpTools[tool.id] && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">MCP</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{tool.description}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          enabledTools.includes(tool.id)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {enabledTools.includes(tool.id) && (
                          <svg className="w-2 h-2 text-primary-foreground" fill="currentColor" viewBox="0 0 8 8">
                            <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
                          </svg>
                        )}
                      </div>
                    </PromptInputToolsSelectItem>
                  ))}
                  <div className="border-t p-2 flex gap-2">
                    <button
                      onClick={() => setEnabledTools([])}
                      className="flex-1 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => setEnabledTools(allAvailableTools.map((t) => t.id))}
                      className="flex-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Select All
                    </button>
                  </div>
                </PromptInputToolsSelectContent>
              </PromptInputToolsSelect>

              <PromptInputModelSelect
                onValueChange={(value) => {
                  setModel(value)
                }}
                value={model}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((m) => (
                    <PromptInputModelSelectItem key={m.id} value={m.id} className="flex items-center gap-2">
                      {/* provider logos */}
                      {m.provider === "openai" && (
                        <Image
                          src="https://github.com/openai.png"
                          alt="OpenAI"
                          width={16}
                          height={16}
                          className="rounded"
                        />
                      )}
                      {m.provider === "anthropic" && (
                        <Image
                          src="https://github.com/anthropics.png"
                          alt="Anthropic"
                          width={16}
                          height={16}
                          className="rounded"
                        />
                      )}
                      {/* google provider removed from test page */}
                      {m.provider === "groq" && (
                        <Image
                          src="https://github.com/groq.png"
                          alt="Groq"
                          width={16}
                          height={16}
                          className="rounded"
                        />
                      )}
                      {m.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </div>
            <PromptInputSubmit disabled={!input || transcribing} status={transcribing ? "submitted" : status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  )
}

export default ChatBotDemo
