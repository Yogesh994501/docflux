'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCopilotChatMutation, useCopilotHistoryQuery } from '@/lib/queries'
import { Sparkles, Send, Bot, User, Trash2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { SpotlightCard, FadeInUp } from '@/components/motion-primitives'

interface Msg { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'What is GSTIN and how do I verify it?',
  'Explain the difference between CGST, SGST and IGST',
  'Why didn’t my vendor’s new invoice layout break parsing?',
  'How does DocFlux handle documents it has never seen before?',
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
    <div className="max-w-3xl mx-auto w-full">
      <div className="bg-white border border-brand-cream-border rounded-[14px] shadow-editorial flex flex-col overflow-hidden" >
        <div style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }} className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-brand-navy-900 text-white"><Sparkles className="h-5 w-5" /></div>
              <div><div className="text-sm font-semibold font-serif text-brand-navy-900">DocFlux Copilot</div><div className="text-xs text-brand-navy-700">Ask about your documents, GST compliance, or how AI parsing works</div></div>
            </div>
            {hasAny && <Button variant="ghost" size="sm" onClick={() => setSessionMessages([])} className="rounded-lg"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear</Button>}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scroll p-4">
            {!hasAny ? (
              <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }} className="rounded-[14px] bg-brand-cream p-5 border border-brand-cream-border"><MessageSquare className="h-8 w-8 text-brand-navy-800" /></motion.div>
                <div><div className="text-2xl font-serif text-brand-navy-900">Start a conversation</div><div className="mt-1 text-sm text-brand-navy-700">Try a suggestion or ask anything about your documents</div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 w-full max-w-2xl text-left">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} onClick={() => send(s)} className="flex items-start min-h-[72px] bg-white hover:bg-brand-terracotta-tint border border-brand-cream-border hover:border-brand-terracotta/30 p-4 rounded-[8px] text-left text-sm text-brand-navy-900 transition-colors shadow-editorial">
                      {s}
                    </motion.button>
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
      </div>

      {/* Removed Side panel for centered focus */}
    </div>
  )
}

function ChatBubble({ msg, loading }: { msg: Msg; loading?: boolean }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-brand-navy-900 text-white' : 'bg-brand-cream text-brand-navy-900 border border-brand-cream-border'}`}>{isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</div>
      <div className={`max-w-[80%] rounded-[14px] px-4 py-2.5 text-sm shadow-editorial ${isUser ? 'bg-brand-navy-900 text-white rounded-tr-sm' : 'bg-white border border-brand-cream-border text-brand-navy-900 rounded-tl-sm'}`}>
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
