"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { login, signup } from "../actions";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const handleLogin = async (formData: FormData) => {
    setLoading(true);
    try {
      const result = await login(formData);
      if (result?.ok) {
        // Use window.location.href for a full page reload to ensure proper auth state
        const redirectOverride = searchParams.get('redirect');
        const defaultDestination = result.role === 'recruiter' ? '/recruitment' : '/leads';
        const redirectUrl = redirectOverride || defaultDestination;
        window.location.href = redirectUrl;
        return;
      }
      toast({
        title: 'Login Failed',
        description: result?.error || 'Your credentials are not correct. Please try again.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: 'Unexpected error. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form action={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </div>
      </form>
    </div>
  );
}
