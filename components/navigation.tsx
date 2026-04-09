"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, UserPlus, Users, Target, Workflow, Calendar, Package, FileSpreadsheet, Activity, PersonStandingIcon, LogOut, Bell, FileSignature, Menu, ScrollText, Linkedin, MessageCircle, User } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import { UserMenu } from "@/components/user-menu"
import { NotificationBell } from "@/components/notification-bell"
import { NotificationPanel } from "@/components/notification-panel"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import { useState } from "react"

const navigation = [
	{ name: "Dashboard", href: "/", icon: Home },
	{ name: "Leads", href: "/leads", icon: UserPlus },
	{ name: "Contacts", href: "/contacts", icon: Users },
	{ name: "OmniChat", href: "/omnichat", icon: MessageCircle },
	{ name: "LinkedIn", href: "/linkedin", icon: Linkedin },
	{ name: "Opportunities", href: "/opportunities", icon: Target },
	{ name: "Contracts", href: "/contracts", icon: FileSignature },
	{ name: "Workflow", href: "/workflow", icon: Workflow },
	{ name: "Meetings", href: "/calendar", icon: Calendar },
	{ name: "Performance", href: "/advisors", icon: Activity },
	{ name: "Notifications", href: "/notifications", icon: Bell },
]

const recruiterNavigation = [
	{ name: "Recruitment", href: "/recruitment", icon: PersonStandingIcon },
	{ name: "Meetings", href: "/calendar", icon: Calendar },
	{ name: "Performance", href: "/advisors", icon: Activity },
]

export function Navigation() {
	const pathname = usePathname()
	const { user, profile, loading, isRecruiter, isAdmin, signOut } = useAuth()
	const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false)
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

	// Don't show navigation on auth pages
	if (pathname?.startsWith("/auth")) {
		return null
	}

	// Avoid rendering navigation until auth state is resolved
	if (loading || !user) {
		return null
	}

	const renderNavLinks = () => {
		if (isRecruiter) {
			return recruiterNavigation.map((item) => {
								const isActive = pathname === item.href
								return (
					<Link 
						key={item.name} 
						href={item.href}
						onClick={() => setIsMobileMenuOpen(false)}
					>
										<Button
											variant={isActive ? "default" : "ghost"}
											size="sm"
											className={cn(
												"w-full justify-start gap-2",
												isActive
													? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
													: "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
											)}
										>
											<item.icon className="h-4 w-4" />
											<span>{item.name}</span>
										</Button>
									</Link>
								)
							})
		} else {
			return (
							<>
								{navigation.map((item) => {
									const isActive = pathname === item.href
									return (
							<Link 
								key={item.name} 
								href={item.href}
								onClick={() => setIsMobileMenuOpen(false)}
							>
											<Button
												variant={isActive ? "default" : "ghost"}
												size="sm"
											className={cn(
												"w-full justify-start gap-2",
												isActive
													? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
													: "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
											)}
											>
												<item.icon className="h-4 w-4" />
												<span>{item.name}</span>
											</Button>
										</Link>
									)
								})}

								{/* Show recruitment page for admins */}
								{isAdmin && (
						<Link 
							href="/recruitment"
							onClick={() => setIsMobileMenuOpen(false)}
						>
										<Button
											variant={pathname === "/recruitment" ? "default" : "ghost"}
											size="sm"
											className={cn(
												"w-full justify-start gap-2",
												pathname === "/recruitment"
													? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
													: "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
											)}
										>
											<PersonStandingIcon className="h-4 w-4" />
											<span>Recruitment</span>
										</Button>
									</Link>
								)}

								<div className="pt-2 mt-2 border-t">
								{isAdmin && (
						<Link 
							href="/logs"
							onClick={() => setIsMobileMenuOpen(false)}
						>
										<Button 
											variant={pathname === "/logs" ? "default" : "ghost"} 
											size="sm" 
											className={cn(
												"w-full justify-start gap-2",
												pathname === "/logs"
													? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
													: "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
											)}
										>
											<ScrollText className="h-4 w-4" />
											<span>Activity Logs</span>
										</Button>
									</Link>
								)}
						<Link 
							href="/illustrations"
							onClick={() => setIsMobileMenuOpen(false)}
						>
										<Button 
											variant={pathname === "/illustrations" ? "default" : "ghost"} 
											size="sm" 
											className={cn(
												"w-full justify-start gap-2",
												pathname === "/illustrations"
													? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
													: "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
											)}
										>
											<Package className="h-4 w-4" />
											<span>Illustrations</span>
										</Button>
									</Link>
						<Link 
							href="/products"
							onClick={() => setIsMobileMenuOpen(false)}
						>
										<Button 
											variant={pathname === "/products" ? "default" : "ghost"} 
											size="sm" 
											className={cn(
												"w-full justify-start gap-2",
												pathname === "/products"
													? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
													: "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
											)}
										>
											<FileSpreadsheet className="h-4 w-4" />
											<span>Products</span>
										</Button>
									</Link>
								</div>
							</>
			)
		}
	}

    	return (
			<>
			{/* Mobile Navigation Header */}
			<header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border h-16 flex items-center justify-between px-4">
				<Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
					<SheetTrigger asChild>
						<Button variant="ghost" size="icon" className="text-sidebar-foreground">
							<Menu className="h-6 w-6" />
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="w-80 p-0 bg-sidebar border-sidebar-border">
						<SheetHeader className="p-6 border-b border-sidebar-border">
							<SheetTitle className="flex items-center gap-3">
								<div className="w-12 h-12 rounded-full overflow-hidden bg-sidebar-primary/10 flex items-center justify-center">
									<Image 
										src="/founders-club-logo.svg" 
										alt="Founders Club Logo" 
										width={48} 
										height={48} 
										className="w-full h-full object-cover rounded-full"
									/>
								</div>
								<div className="text-lg text-sidebar-foreground font-medium">
									FOUNDERS CLUB CRM
								</div>
							</SheetTitle>
						</SheetHeader>
						<div className="flex flex-col h-[calc(100vh-5rem)]">
							<div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
								{renderNavLinks()}
							</div>
							<div className="border-t border-sidebar-border p-4 mt-auto">
								{!loading && user && (
									<div className="flex flex-col gap-3">
										{/* User Info */}
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
												<span className="text-sm font-medium text-sidebar-primary">
													{profile?.first_name?.[0] || user.email?.[0].toUpperCase() || 'U'}
												</span>
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-sidebar-foreground truncate">
													{profile?.first_name && profile?.last_name
														? `${profile.first_name} ${profile.last_name}`
														: user.email?.split('@')[0]}
												</p>
												<p className="text-xs text-sidebar-foreground/70 truncate">
													{profile?.role || 'User'}
												</p>
											</div>
											
											{/* Notification Bell */}
											<NotificationBell 
												onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
												className="text-sidebar-foreground hover:text-sidebar-primary"
											/>
										</div>
										
										<Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block">
											<Button
												variant={pathname === "/profile" ? "default" : "ghost"}
												size="sm"
												className={cn(
													"w-full justify-start gap-2",
													pathname === "/profile"
														? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
														: "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
												)}
											>
												<User className="h-4 w-4" />
												<span>Profile</span>
											</Button>
										</Link>
										
										{/* Logout Button */}
										<Button 
											variant="ghost" 
											size="sm" 
											onClick={async () => {
												try {
													await signOut()
													window.location.href = '/auth/login'
												} catch (error) {
													console.error('Sign out error:', error)
												}
											}}
											className="w-full justify-start gap-2 text-sidebar-foreground hover:text-red-600 hover:bg-red-50"
										>
											<LogOut className="h-4 w-4" />
											<span>Log out</span>
										</Button>
									</div>
								)}
							</div>
						</div>
					</SheetContent>
				</Sheet>
				
				<Link href="/" className="flex items-center gap-2">
					<div className="w-10 h-10 rounded-full overflow-hidden bg-sidebar-primary/10 flex items-center justify-center">
						<Image 
							src="/founders-club-logo.svg" 
							alt="Founders Club Logo" 
							width={32} 
							height={32} 
							className="w-full h-full object-cover rounded-full"
						/>
					</div>
					<span className="text-sm font-medium text-sidebar-foreground">CRM</span>
				</Link>

				{!loading && user && (
					<div className="flex items-center gap-2">
						<NotificationBell 
							onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
							className="text-sidebar-foreground hover:text-sidebar-primary"
						/>
					</div>
				)}
			</header>

			{/* Desktop Navigation */}
			<aside className="hidden md:flex md:w-64 lg:w-72 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 overflow-y-auto">
			<div className="flex flex-col w-full h-screen">
				<div className="h-20 px-6 flex items-center border-sidebar-border mt-6">
					<Link href="/" className="flex flex-col items-center gap-2 text-center hover:text-sidebar-primary transition-colors">
						<div className="w-20 h-20 rounded-full overflow-hidden bg-sidebar-primary/10 flex items-center justify-center">
							<Image 
								src="/founders-club-logo.svg" 
								alt="Founders Club Logo" 
								width={56} 
								height={56} 
								className="w-full h-full object-cover rounded-full"
							/>
						</div>
						<div className="text-xl text-sidebar-foreground font-medium text-center">
							FOUNDERS CLUB CRM
						</div>
					</Link>
				</div>
				<div className="flex-1 overflow-y-auto py-4 mt-4">
					<div className="px-3 space-y-1">
						{renderNavLinks()}
					</div>
				</div>
				<div className="border-t border-sidebar-border p-4 mt-auto">
					{!loading && user && (
						<div className="flex flex-col gap-3">
							{/* User Info */}
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
									<span className="text-sm font-medium text-sidebar-primary">
										{profile?.first_name?.[0] || user.email?.[0].toUpperCase() || 'U'}
									</span>
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-sidebar-foreground truncate">
										{profile?.first_name && profile?.last_name
											? `${profile.first_name} ${profile.last_name}`
											: user.email?.split('@')[0]}
									</p>
									<p className="text-xs text-sidebar-foreground/70 truncate">
										{profile?.role || 'User'}
									</p>
								</div>
								
								{/* Notification Bell */}
								<NotificationBell 
									onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
									className="text-sidebar-foreground hover:text-sidebar-primary"
								/>
								</div>
								
							<Link href="/profile" className="block">
								<Button
									variant={pathname === "/profile" ? "default" : "ghost"}
									size="sm"
									className={cn(
										"w-full justify-start gap-2",
										pathname === "/profile"
											? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
											: "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
									)}
								>
									<User className="h-4 w-4" />
									<span>Profile</span>
								</Button>
							</Link>
								
							{/* Logout Button */}
							<Button 
								variant="ghost" 
								size="sm" 
								onClick={async () => {
									try {
										await signOut()
										window.location.href = '/auth/login'
									} catch (error) {
										console.error('Sign out error:', error)
									}
								}}
								className="w-full justify-start gap-2 text-sidebar-foreground hover:text-red-600 hover:bg-red-50"
							>
								<LogOut className="h-4 w-4" />
								<span>Log out</span>
							</Button>
						</div>
					)}
				</div>
			</div>
		</aside>
		
		{/* Notification Panel */}
		<NotificationPanel 
			isOpen={isNotificationPanelOpen}
			onClose={() => setIsNotificationPanelOpen(false)}
		/>
		</>
	)
}
