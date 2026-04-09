import { ForgotPasswordForm } from "@/app/auth/forgot-password/components/forgot-password-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-600">Enter your email to receive a password reset link</p>
        </div>
        
        <Card className="border-gray-200">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
            <CardDescription>
              We'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
            <div className="mt-4 text-center text-sm">
              Remember your password?{" "}
              <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </div>
          </CardContent> 
        </Card>
      </div>
    </div>
  )
}
