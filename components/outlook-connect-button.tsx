'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OutlookConnectionStatus } from '@/types/outlook'
import { Loader2, Plug, PlugZap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type OutlookConnectButtonProps = {
  status: OutlookConnectionStatus | null
  onConnect: () => Promise<void>
  onDisconnect: () => Promise<void>
  loading?: boolean
  disabled?: boolean
  className?: string
}

export function OutlookConnectButton({
  status,
  onConnect,
  onDisconnect,
  loading,
  disabled,
  className,
}: OutlookConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const { toast } = useToast()

  const isConnected = status?.connected ?? false
  const isBusy = loading || isConnecting || isDisconnecting

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      await onConnect()
    } catch (error) {
      console.error('[OutlookConnectButton] Connection failed:', error)
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to start Outlook connection.',
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      await onDisconnect()
      toast({
        title: 'Disconnected',
        description: 'Disconnected from Outlook.',
      })
    } catch (error) {
      console.error('[OutlookConnectButton] Disconnect failed:', error)
      toast({
        variant: 'destructive',
        title: 'Disconnect Failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect Outlook.',
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={isConnected ? 'secondary' : 'default'}
      className={cn('w-full justify-center md:w-auto', className)}
      onClick={isConnected ? handleDisconnect : handleConnect}
      disabled={disabled || isBusy}
    >
      {isBusy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isConnected ? (
        <Plug className="mr-2 h-4 w-4" />
      ) : (
        <PlugZap className="mr-2 h-4 w-4" />
      )}
      {isBusy
        ? isConnected
          ? 'Disconnecting...'
          : 'Connecting...'
        : isConnected
        ? 'Disconnect Outlook'
        : 'Connect Outlook'}
    </Button>
  )
}

