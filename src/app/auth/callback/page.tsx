'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [statusMessage, setStatusMessage] = useState('Completing sign in with Google...')

  useEffect(() => {
    async function handleAuth() {
      // 1. Check for errors in query params
      const error = searchParams.get('error')
      const errorDesc = searchParams.get('error_description')
      if (error || errorDesc) {
        window.location.href = `/?error=${encodeURIComponent(errorDesc || error || 'Authentication failed')}`
        return
      }

      // 2. Check for PKCE authorization code in query params
      const code = searchParams.get('code')
      if (code) {
        setStatusMessage('Exchanging authorization code...')
        window.location.href = `/api/auth/callback?code=${encodeURIComponent(code)}`
        return
      }

      // 3. Check for implicit grant access_token in URL hash fragment
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const accessToken = hashParams.get('access_token')
        const hashError = hashParams.get('error_description') || hashParams.get('error')

        if (hashError) {
          window.location.href = `/?error=${encodeURIComponent(hashError)}`
          return
        }

        if (accessToken) {
          setStatusMessage('Setting up your session...')
          try {
            const res = await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: accessToken }),
            })
            const data = await res.json()
            if (data.status === 'success') {
              window.location.href = '/'
              return
            }
          } catch (e) {
            console.error('Failed to set session:', e)
          }
        }
      }

      // Fallback redirect
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    }

    handleAuth()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-cream p-4">
      <div className="flex flex-col items-center gap-4 rounded-[14px] border border-brand-cream-border bg-white p-8 shadow-editorial text-center max-w-sm w-full">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-terracotta/10 text-brand-terracotta">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div>
          <h2 className="text-lg font-serif font-semibold text-brand-navy-900">DocFlux</h2>
          <p className="mt-1 text-sm text-brand-navy-700">{statusMessage}</p>
        </div>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-brand-cream">
          <Loader2 className="h-8 w-8 animate-spin text-brand-terracotta" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}
