"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const formSchema = z.object({
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  confirmPassword: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
})

type FormValues = z.infer<typeof formSchema>

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    // Check if we have a valid recovery session from the hash fragments
    const checkRecoverySession = async () => {
      try {
        const supabase = createClient()
        
        // Check if we have hash fragments in the URL (Supabase adds these after redirect)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')
        
        if (accessToken && type === 'recovery') {
          // Set the session using the access token
          const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          })

          if (sessionError || !session) {
            setIsValidToken(false)
            toast({
              title: 'Invalid or expired link',
              description: 'This password reset link is invalid or has expired. Please request a new one.',
              variant: 'destructive',
            })
            return
          }

          setIsValidToken(true)
          
          // Clean up the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
        } else {
          // Check if we already have a session (user might have refreshed the page)
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setIsValidToken(true)
          } else {
            setIsValidToken(false)
            toast({
              title: 'Invalid or expired link',
              description: 'This password reset link is invalid or has expired. Please request a new one.',
              variant: 'destructive',
            })
          }
        }
      } catch (error) {
        console.error('Error checking recovery session:', error)
        setIsValidToken(false)
        toast({
          title: 'Error',
          description: 'An error occurred while verifying your reset link. Please try again.',
          variant: 'destructive',
        })
      }
    }

    checkRecoverySession()
  }, [toast])

  async function onSubmit(values: FormValues) {
    if (!isValidToken) {
      toast({
        title: 'Invalid link',
        description: 'Please use a valid password reset link from your email.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      })

      if (error) {
        throw error
      }

      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated. You can now sign in with your new password.',
      })

      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (error: any) {
      console.error('Error updating password:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600">Verifying reset link...</span>
      </div>
    )
  }

  if (isValidToken === false) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            This password reset link is invalid or has expired. Please request a new password reset link.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push('/auth/forgot-password')}
        >
          Request New Reset Link
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Updating Password..." : "Update Password"}
        </Button>
      </form>
    </Form>
  )
}
