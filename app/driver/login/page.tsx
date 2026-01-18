'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Truck, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'

export default function DriverLoginPage() {
    const router = useRouter()
    const { signIn } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            // Sign in
            const result = await signIn(email, password)
            
            if (result.error) {
                setError(result.error.message || 'Sign in failed')
                setIsLoading(false)
                return
            }

            // Get user from supabase
            const { data: { user: authUser } } = await supabase.auth.getUser()
            
            if (!authUser) {
                setError('Authentication failed')
                setIsLoading(false)
                return
            }

            // Check if user is a driver by querying delivery_drivers table
            const { data: driverRecord, error: driverError } = await supabase
                .from('delivery_drivers')
                .select('id, is_active')
                .eq('user_id', authUser.id)
                .eq('is_active', true)
                .maybeSingle()

            if (driverError || !driverRecord) {
                // Sign out if not a driver
                await supabase.auth.signOut()
                setError('This account is not registered as a driver')
                setIsLoading(false)
                return
            }

            // Redirect to driver dashboard
            router.push('/driver')
        } catch (err) {
            setError('An unexpected error occurred')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
            {/* Logo */}
            <div className="mb-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Truck className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Vassoo Driver</h1>
                <p className="text-gray-400 text-sm mt-1">Delivery Partner App</p>
            </div>

            {/* Login Card */}
            <Card className="w-full max-w-sm bg-gray-900/80 border-gray-800 backdrop-blur">
                <CardHeader className="text-center pb-4">
                    <CardTitle className="text-white">Welcome Back</CardTitle>
                    <CardDescription>Sign in to start delivering</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-300">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="driver@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-300">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-10"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </div>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </form>

                    {/* Help Text */}
                    <div className="mt-6 pt-4 border-t border-gray-800 text-center">
                        <p className="text-xs text-gray-500">
                            Need help? Contact your dispatcher or{' '}
                            <a href="mailto:support@vassoo.com" className="text-blue-400 hover:underline">
                                support@vassoo.com
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Footer */}
            <p className="mt-8 text-xs text-gray-600">
                © {new Date().getFullYear()} Vassoo. All rights reserved.
            </p>
        </div>
    )
}
