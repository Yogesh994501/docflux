import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { copilotChat } from '@/lib/ai'
import { ok, err } from '@/lib/constants'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages: ChatMsg[] = body.messages ?? []
    const documentContext: { fileName: string; type: string; extracted: unknown } | null =
      body.documentContext ?? null

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(err('messages[] required'), { status: 400 })
    }

    const enriched: ChatMsg[] = []
    if (documentContext) {
      const summary = `The user is currently viewing this document:
- File name: ${documentContext.fileName}
- Document type: ${documentContext.type}
- Extracted data (JSON): ${JSON.stringify(documentContext.extracted, null, 2)}

Answer questions about this document using the data above.`
      enriched.push({ role: 'assistant', content: summary })
    }
    enriched.push(...messages)

    const reply = await copilotChat(enriched)

    const lastUser = messages.filter((m) => m.role === 'user').pop()
    if (lastUser) {
      await repo.createCopilotMessage('user', lastUser.content)
    }
    await repo.createCopilotMessage('assistant', reply)

    return NextResponse.json(ok({ reply }))
  } catch (e) {
    console.error('[POST /api/copilot]', e)
    return NextResponse.json(err('Copilot request failed'), { status: 500 })
  }
}

export async function GET() {
  try {
    const messages = await repo.listCopilotMessages(50)
    return NextResponse.json(ok({ items: messages }))
  } catch (e) {
    console.error('[GET /api/copilot]', e)
    return NextResponse.json(err('Failed to fetch history'), { status: 500 })
  }
}
