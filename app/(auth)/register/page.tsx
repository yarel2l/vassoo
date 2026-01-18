'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/auth-context'
import { toast } from '@/hooks/use-toast'
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    ArrowLeft,
    User,
    Calendar,
    AlertCircle,
} from 'lucide-react'
import { VassooLogoIcon } from '@/components/vassoo-logo'

const MINIMUM_AGE = 21

function calculateAge(birthDate: string): number {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
    }

    return age
}

export default function RegisterPage() {
    const router = useRouter()
    const { signUp } = useAuth()
    const [fullName, setFullName] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [agreeTerms, setAgreeTerms] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [ageError, setAgeError] = useState<string | null>(null)

    const handleBirthDateChange = (value: string) => {
        setBirthDate(value)
        setAgeError(null)

        if (value) {
            const age = calculateAge(value)
            if (age < MINIMUM_AGE) {
                setAgeError(`You must be at least ${MINIMUM_AGE} years old to register`)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validate age
        if (!birthDate) {
            toast({
                title: 'Birth date required',
                description: 'Please enter your date of birth',
                variant: 'destructive',
            })
            return
        }

        const age = calculateAge(birthDate)
        if (age < MINIMUM_AGE) {
            toast({
                title: 'Age requirement not met',
                description: `You must be at least ${MINIMUM_AGE} years old to register`,
                variant: 'destructive',
            })
            return
        }

        if (!agreeTerms) {
            toast({
                title: 'Age confirmation required',
                description: 'Please confirm you are 21 years or older',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)

        try {
            const { error } = await signUp(email, password, fullName)
            if (error) {
                toast({
                    title: 'Registration failed',
                    description: error.message,
                    variant: 'destructive',
                })
            } else {
                toast({
                    title: 'Check your email',
                    description: 'We sent you a confirmation link to complete your registration',
                })
                router.push('/login?registered=true')
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

    // Calculate max date (must be at least MINIMUM_AGE years old)
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() - MINIMUM_AGE)
    const maxDateString = maxDate.toISOString().split('T')[0]

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Back to home - aligned left */}
                <div className="w-full">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to store
                    </Link>
                </div>

                <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="text-center pb-2">
                        {/* Logo */}
                        <div className="flex justify-center mb-4">
                            <VassooLogoIcon size="lg" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-white">Create an account</CardTitle>
                        <CardDescription className="text-gray-400">
                            Join Vassoo for exclusive deals on premium spirits
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* 1. Full Name - Required */}
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-gray-300">
                                    Full Name <span className="text-red-400">*</span>
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                        id="fullName"
                                        type="text"
                                        placeholder="John Doe"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                                        required
                                    />
                                </div>
                            </div>

                            {/* 2. Date of Birth - Required */}
                            <div className="space-y-2">
                                <Label htmlFor="birthDate" className="text-gray-300">
                                    Date of Birth <span className="text-red-400">*</span>
                                </Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                        id="birthDate"
                                        type="date"
                                        value={birthDate}
                                        onChange={(e) => handleBirthDateChange(e.target.value)}
                                        max={maxDateString}
                                        className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                                        required
                                    />
                                </div>
                                {ageError && (
                                    <div className="flex items-center gap-2 text-red-400 text-sm">
                                        <AlertCircle className="h-4 w-4" />
                                        {ageError}
                                    </div>
                                )}
                                <p className="text-xs text-gray-500">
                                    You must be at least {MINIMUM_AGE} years old to register
                                </p>
                            </div>

                            {/* 3. Email - Required */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-300">
                                    Email <span className="text-red-400">*</span>
                                </Label>
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

                            {/* 4. Password - Required */}
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-gray-300">
                                    Password <span className="text-red-400">*</span>
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Minimum 8 characters
                                </p>
                            </div>

                            {/* 5. Age Confirmation Checkbox - Required */}
                            <div className="flex items-start space-x-2 pt-2">
                                <Checkbox
                                    id="terms"
                                    checked={agreeTerms}
                                    onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                                    className="border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 mt-0.5"
                                    required
                                />
                                <label htmlFor="terms" className="text-sm text-gray-400 leading-tight">
                                    I confirm I am <span className="text-orange-400 font-medium">{MINIMUM_AGE}+ years old</span> and agree to the{' '}
                                    <Link href="/terms" className="text-orange-400 hover:text-orange-300">Terms</Link>
                                    {' '}and{' '}
                                    <Link href="/privacy" className="text-orange-400 hover:text-orange-300">Privacy Policy</Link>
                                    {' '}<span className="text-red-400">*</span>
                                </label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/25"
                                disabled={isLoading || !!ageError}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Creating account...
                                    </>
                                ) : (
                                    'Create account'
                                )}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4 pt-0">
                        <p className="text-center text-sm text-gray-400">
                            Already have an account?{' '}
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
