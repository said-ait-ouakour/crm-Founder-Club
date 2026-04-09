'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User, Settings, Loader2 } from 'lucide-react'

export function UserMenu() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth/login'}>
          Sign In
        </Button>
      </div>
    )
  }

  const userInitials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`
    : user.email?.[0].toUpperCase() || 'U'

  const handleSignOut = async () => {
    // setIsSigningOut(true)
    try {
      await signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false)
    }
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || 'User'} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.first_name && profile?.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : user.email?.split('@')[0]}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {profile?.role || 'User'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/profile')}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>{isSigningOut ? 'Signing out...' : 'Log out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
