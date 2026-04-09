"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function EmbeddedInbox({ leadId }: { leadId: string }) {
  const [isLoading, setIsLoading] = useState(true)
  const [iframeKey, setIframeKey] = useState(0)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle messages from the iframe if needed
      if (event.data?.type === 'inbox:ready') {
        setIsLoading(false)
      } else if (event.data?.type === 'inbox:error') {
        setHasError(true)
        setIsLoading(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const reloadIframe = () => {
    setHasError(false)
    setIsLoading(true)
    setIframeKey(prev => prev + 1)
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] border rounded-lg bg-gray-50">
        <p className="text-red-500 mb-4">Failed to load inbox</p>
        <button 
          onClick={reloadIframe}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="relative h-[600px] border rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="space-y-4">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      )}
      <iframe
        key={iframeKey}
        src={`/leads/${leadId}/inbox?embedded=true`}
        className="w-full h-full border-0"
        title="Lead Inbox"
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  )
}
