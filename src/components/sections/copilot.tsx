'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCopilotChatMutation, useCopilotHistoryQuery } from '@/lib/queries'
import { Sparkles, Send, Bot, User, Trash2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'What is GSTIN and how do I verify it?',
  'Explain the difference between CGST, SGST and IGST',
  'What are common fraud indicators in invoices?',
  'How does 3-way matching work (PO ↔ Invoice ↔ Challan)?',
  'What documents do I need for GST compliance in India?',
]

export function CopilotSection() {
  const { data: history } = useCopilotHistoryQuery()
  // Local session messages (new ones sent after page load).
  // History messages from the server are merged in during render (derived, not stored).
  const [sessionMessages, setSessionMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const chat = useCopilotChatMutation()

  // Combine persisted history + this-session messages
  const historyMsgs: Msg[] = (history?.items ?? []).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
  const messages = [...historyMsgs, ...sessionMessages]
  const hasAny = messages.length > 0

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, chat.isPending])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || chat.isPending) return

    const userMsg: Msg = { role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setSessionMessages((prev) => [...prev, userMsg])
    setInput('')

    chat.mutate(
      { messages: next },
      {
        onSuccess: (res) => {
          setSessionMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
        },
        onError: (e) => {
          toast.error('Chat failed: ' + e.message)
        },
      },
    )
  }

  const clearChat = () => setSessionMessages([])

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Chat column */}
      <Card className="lg:col-span-2 flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">AutoFinDocs Copilot</CardTitle>
              <CardDescription className="text-xs">
                Ask about documents, GST, invoices, fraud detection and more
              </CardDescription>
            </div>
          </div>
          {hasAny && (
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </CardHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scroll p-4">
          {!hasAny ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-full bg-primary/10 p-5">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Start a conversation</div>
                <div className="text-xs text-muted-foreground">
                  Try one of these suggestions, or ask anything about your documents
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <ChatBubble key={i} msg={m} />
              ))}
              {chat.isPending && (
                <ChatBubble msg={{ role: 'assistant', content: 'Thinking…' }} loading />
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask the copilot anything…  (Shift+Enter for newline)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              rows={1}
            />
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={!input.trim() || chat.isPending}
              className="h-[44px] w-[44px] shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Side panel: capabilities */}
      <div className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">What can the Copilot do?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <Capability icon="📄" title="Explain documents" desc="Open any document and ask questions about its extracted fields" />
            <Capability icon="🧾" title="GST & tax guidance" desc="CGST/SGST/IGST rules, HSN codes, input tax credit" />
            <Capability icon="🛡️" title="Fraud detection tips" desc="Learn what red flags to look for in invoices" />
            <Capability icon="🔗" title="3-way matching" desc="How PO ↔ Invoice ↔ Delivery Challan matching works" />
            <Capability icon="📊" title="Compliance help" desc="GSTR-1, GSTR-3B filing requirements" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Try asking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-md border border-border bg-card p-2.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent"
              >
                {s}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ChatBubble({ msg, loading }: { msg: Msg; loading?: boolean }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-primary/10 text-primary'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-card border border-border rounded-tl-sm'
        }`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
          </span>
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
        )}
      </div>
    </div>
  )
}

function Capability({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="text-base">{icon}</span>
      <div>
        <div className="text-xs font-medium text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
    </div>
  )
}
