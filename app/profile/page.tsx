'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Linkedin, CheckCircle2, XCircle, ExternalLink, Unlink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type LinkedInStatus = {
  connected: boolean
  accountId: string | null
  status?: string
  account?: {
    id?: string
    name?: string
    type?: string
    provider?: string
    status?: string
  } | null
}

export default function ProfilePage() {
  const { user, profile, refreshSession } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: ''
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [linkedInStatus, setLinkedInStatus] = useState<LinkedInStatus | null>(null)
  const [linkedInLoading, setLinkedInLoading] = useState(true)
  const [connectingLinkedIn, setConnectingLinkedIn] = useState(false)
  const [disconnectingLinkedIn, setDisconnectingLinkedIn] = useState(false)

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email
      })
    }
  }, [profile])

  useEffect(() => {
    const linkedInConnected = searchParams.get('linkedin_connected')
    const linkedInError = searchParams.get('linkedin_error')

    if (linkedInConnected === 'true') {
      toast({
        title: 'LinkedIn Connected',
        description: 'Your LinkedIn account has been successfully connected.',
      })
      router.replace('/profile')
    } else if (linkedInError) {
      const errorMessages: Record<string, string> = {
        missing_user_id: 'Unable to identify your account. Please try again.',
        connection_failed: 'LinkedIn connection failed. Please try again.',
        missing_account_id: 'LinkedIn account ID not received. Please try again.',
        save_failed: 'Failed to save LinkedIn connection. Please try again.',
        unexpected_error: 'An unexpected error occurred. Please try again.',
      }
      toast({
        title: 'LinkedIn Connection Error',
        description: errorMessages[linkedInError] || 'Failed to connect LinkedIn account.',
        variant: 'destructive',
      })
      router.replace('/profile')
    }
  }, [searchParams, toast, router])

  const fetchLinkedInStatus = useCallback(async () => {
    if (!user) return

    try {
      setLinkedInLoading(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setLinkedInStatus({ connected: false, accountId: null })
        return
      }

      const response = await fetch('/api/unipile/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch LinkedIn status')
      }

      const data = await response.json()
      setLinkedInStatus(data)
    } catch (error) {
      console.error('Error fetching LinkedIn status:', error)
      setLinkedInStatus({ connected: false, accountId: null })
    } finally {
      setLinkedInLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchLinkedInStatus()
  }, [fetchLinkedInStatus])

  const handleConnectLinkedIn = async () => {
    if (!user) return

    try {
      setConnectingLinkedIn(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in again to connect your LinkedIn account.',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch('/api/unipile/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate LinkedIn connection')
      }

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        throw new Error('No authentication URL received')
      }
    } catch (error: any) {
      console.error('Error connecting LinkedIn:', error)
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to connect LinkedIn account. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setConnectingLinkedIn(false)
    }
  }

  const handleDisconnectLinkedIn = async () => {
    if (!user || !linkedInStatus?.connected) return

    try {
      setDisconnectingLinkedIn(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in again to disconnect your LinkedIn account.',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch('/api/unipile/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect LinkedIn account')
      }

      toast({
        title: 'LinkedIn Disconnected',
        description: 'Your LinkedIn account has been disconnected.',
      })

      setLinkedInStatus({ connected: false, accountId: null })
      await fetchLinkedInStatus()
    } catch (error: any) {
      console.error('Error disconnecting LinkedIn:', error)
      toast({
        title: 'Disconnection Error',
        description: error.message || 'Failed to disconnect LinkedIn account. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDisconnectingLinkedIn(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return
    
    try {
      setLoading(true)
      
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      await refreshSession()
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-gray-100"
            />
            <p className="text-sm text-gray-500 mt-1">Contact support to change your email address.</p>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-blue-600" />
              LinkedIn Connection
            </CardTitle>
            <CardDescription>
              Connect your LinkedIn account to send and receive messages through the CRM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {linkedInLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking connection status...</span>
              </div>
            ) : linkedInStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-green-700">LinkedIn Connected</p>
                    <p className="text-sm text-gray-500">
                      Your LinkedIn account is linked and ready to use.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    {linkedInStatus.status || 'Active'}
                  </Badge>
                </div>

                {linkedInStatus.account?.name && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">Account:</span> {linkedInStatus.account.name}
                    </p>
                    {linkedInStatus.accountId && (
                      <p className="text-gray-500 text-xs mt-1">
                        ID: {linkedInStatus.accountId}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectLinkedIn}
                    disabled={disconnectingLinkedIn}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {disconnectingLinkedIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <Unlink className="mr-2 h-4 w-4" />
                        Disconnect LinkedIn
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-700">LinkedIn Not Connected</p>
                    <p className="text-sm text-gray-500">
                      Connect your LinkedIn account to access messaging features.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleConnectLinkedIn}
                  disabled={connectingLinkedIn}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {connectingLinkedIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Linkedin className="mr-2 h-4 w-4" />
                      Connect LinkedIn
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500">
                  You'll be redirected to LinkedIn to authorize the connection. 
                  Your credentials are securely handled by Unipile.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
