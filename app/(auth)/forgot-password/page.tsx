'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import {
    Mail,
    Loader2,
    ArrowLeft,
    CheckCircle,
    KeyRound,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { VassooLogoIcon } from '@/components/vassoo-logo'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isEmailSent, setIsEmailSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email || !email.includes('@')) {
            toast({
                title: 'Invalid email',
                description: 'Please enter a valid email address',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) {
                toast({
                    title: 'Error',
                    description: error.message,
                    variant: 'destructive',
                })
            } else {
                setIsEmailSent(true)
                toast({
                    title: 'Email sent!',
                    description: 'Check your inbox for the password reset link',
                })
            }
        } catch {
            toast({
                title: 'Error',
                description: 'Something went wrong. Please try again.',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Back to login */}
                <div className="w-full">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to login
                    </Link>
                </div>

                <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="text-center pb-2">
                        {/* Logo */}
                        <div className="flex justify-center mb-4">
                            <VassooLogoIcon size="lg" />
                        </div>

                        {isEmailSent ? (
                            <>
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                                        <CheckCircle className="h-8 w-8 text-green-500" />
                                    </div>
                                </div>
                                <CardTitle className="text-2xl font-bold text-white">Check your email</CardTitle>
                                <CardDescription className="text-gray-400">
                                    We sent a password reset link to <span className="text-orange-400">{email}</span>
                                </CardDescription>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
                                        <KeyRound className="h-8 w-8 text-orange-500" />
                                    </div>
                                </div>
                                <CardTitle className="text-2xl font-bold text-white">Forgot password?</CardTitle>
                                <CardDescription className="text-gray-400">
                                    No worries, we'll send you reset instructions
                                </CardDescription>
                            </>
                        )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {isEmailSent ? (
                            <div className="space-y-4">
                                <p className="text-center text-gray-400 text-sm">
                                    Click the link in your email to reset your password.
                                    If you don't see it, check your spam folder.
                                </p>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-white"
                                    onClick={() => setIsEmailSent(false)}
                                >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Try another email
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/25"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Reset password'
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4 pt-0">
                        <p className="text-center text-sm text-gray-400">
                            Remember your password?{' '}
                            <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
