'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCopilotChatMutation, useCopilotHistoryQuery } from '@/lib/queries'
import { Sparkles, Send, Bot, User, Trash2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { SpotlightCard, FadeInUp, AuroraText } from '@/components/motion-primitives'

interface Msg { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'What is GSTIN and how do I verify it?',
  'Explain the difference between CGST, SGST and IGST',
  'What are common fraud indicators in invoices?',
  'How does 3-way matching work (PO ↔ Invoice ↔ Challan)?',
  'What documents do I need for GST compliance in India?',
]

export function CopilotSection() {
  const { data: history } = useCopilotHistoryQuery()
  const [sessionMessages, setSessionMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const chat = useCopilotChatMutation()

  const historyMsgs: Msg[] = (history?.items ?? []).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  const messages = [...historyMsgs, ...sessionMessages]
  const hasAny = messages.length > 0

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages.length, chat.isPending])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || chat.isPending) return
    const userMsg: Msg = { role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setSessionMessages((prev) => [...prev, userMsg])
    setInput('')
    chat.mutate({ messages: next }, { onSuccess: (res) => setSessionMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]), onError: (e) => toast.error('Chat failed: ' + e.message) })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SpotlightCard className="lg:col-span-2 flex flex-col overflow-hidden" >
        <div style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }} className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background"><Sparkles className="h-5 w-5" /></div>
              <div><div className="text-sm font-semibold">AutoFinDocs Copilot</div><div className="text-xs text-muted-foreground">Ask about documents, GST, invoices, fraud detection</div></div>
            </div>
            {hasAny && <Button variant="ghost" size="sm" onClick={() => setSessionMessages([])} className="rounded-lg"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear</Button>}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scroll p-4">
            {!hasAny ? (
              <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }} className="rounded-2xl bg-foreground/[0.06] p-5"><MessageSquare className="h-8 w-8 text-foreground/60" /></motion.div>
                <div><div className="text-base font-semibold">Start a <AuroraText>conversation</AuroraText></div><div className="mt-0.5 text-xs text-muted-foreground">Try a suggestion or ask anything about your documents</div></div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} onClick={() => send(s)} className="rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs transition-colors hover:border-foreground/20 hover:bg-accent">{s}</motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
                </AnimatePresence>
                {chat.isPending && <ChatBubble msg={{ role: 'assistant', content: '' }} loading />}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border/60 p-3">
            <div className="flex gap-2">
              <Textarea placeholder="Ask the copilot anything… (Shift+Enter for newline)" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }} className="min-h-[44px] max-h-[120px] resize-none rounded-xl text-sm" rows={1} />
              <Button size="icon" onClick={() => send(input)} disabled={!input.trim() || chat.isPending} className="h-[44px] w-[44px] shrink-0 rounded-xl"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </SpotlightCard>

      {/* Side panel */}
      <div className="space-y-3">
        <FadeInUp>
          <SpotlightCard className="p-4">
            <div className="text-sm font-semibold">What can the Copilot do?</div>
            <div className="mt-3 space-y-3 text-xs text-muted-foreground">
              {[['📄', 'Explain documents', 'Open any document and ask about its fields'], ['🧾', 'GST & tax guidance', 'CGST/SGST/IGST rules, HSN codes, input tax credit'], ['🛡️', 'Fraud detection', 'Learn red flags in invoices'], ['🔗', '3-way matching', 'PO ↔ Invoice ↔ Challan matching'], ['📊', 'Compliance help', 'GSTR-1, GSTR-3B filing requirements']].map(([icon, title, desc]) => (
                <div key={title} className="flex gap-2.5"><span className="text-base">{icon}</span><div><div className="text-xs font-medium text-foreground">{title}</div><div className="text-[11px] text-muted-foreground">{desc}</div></div></div>
              ))}
            </div>
          </SpotlightCard>
        </FadeInUp>
        <FadeInUp delay={0.1}>
          <SpotlightCard className="p-4">
            <div className="mb-2 text-sm font-semibold">Try asking</div>
            <div className="space-y-2">
              {SUGGESTIONS.slice(0, 3).map((s) => <button key={s} onClick={() => send(s)} className="block w-full rounded-xl border border-border/60 bg-card/60 p-2.5 text-left text-xs transition-colors hover:border-foreground/20 hover:bg-accent">{s}</button>)}
            </div>
          </SpotlightCard>
        </FadeInUp>
      </div>
    </div>
  )
}

function ChatBubble({ msg, loading }: { msg: Msg; loading?: boolean }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-foreground text-background' : 'bg-foreground/[0.06] text-foreground'}`}>{isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isUser ? 'bg-foreground text-background rounded-tr-sm' : 'premium-card rounded-tl-sm'}`}>
        {loading ? (
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
          </span>
        ) : <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>}
      </div>
    </motion.div>
  )
}
