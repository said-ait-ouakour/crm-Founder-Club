import { ResetPasswordForm } from "@/app/auth/reset-password/components/reset-password-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-600">Enter your new password below</p>
        </div>
        
        <Card className="border-gray-200">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription>
              Please enter your new password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm />
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
