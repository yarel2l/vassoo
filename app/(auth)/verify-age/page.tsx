'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Wine, ShieldCheck, AlertTriangle } from 'lucide-react'

export default function VerifyAgePage() {
    const [birthDate, setBirthDate] = useState('')
    const [confirmed, setConfirmed] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const { user, verifyAge, isAgeVerified } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const returnUrl = searchParams.get('returnUrl') || '/'

    const calculateAge = (dateString: string): number => {
        const birth = new Date(dateString)
        const today = new Date()
        let age = today.getFullYear() - birth.getFullYear()
        const monthDiff = today.getMonth() - birth.getMonth()

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--
        }

        return age
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!confirmed) {
            setError('Please confirm that you are of legal drinking age')
            return
        }

        const age = calculateAge(birthDate)
        if (age < 21) {
            setError('You must be 21 years or older to access this content')
            return
        }

        setIsLoading(true)

        try {
            const { error } = await verifyAge(birthDate)
            if (error) {
                setError(error.message)
            } else {
                router.push(returnUrl)
                router.refresh()
            }
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    if (isAgeVerified) {
        router.push(returnUrl)
        return null
    }

    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() - 21)
    const maxDateString = maxDate.toISOString().split('T')[0]

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 px-4">
            <Card className="w-full max-w-md bg-gray-900/80 border-gray-800 backdrop-blur-xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl">
                            <ShieldCheck className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Age Verification Required</CardTitle>
                    <CardDescription className="text-gray-400">
                        You must be 21 years or older to purchase alcohol in the United States
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        {error && (
                            <Alert variant="destructive" className="bg-red-900/50 border-red-800">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Wine className="h-5 w-5 text-amber-400 mt-0.5" />
                                <div>
                                    <p className="text-amber-200 text-sm font-medium">Legal Notice</p>
                                    <p className="text-amber-200/70 text-xs mt-1">
                                        It is illegal to purchase alcohol if you are under 21 years of age.
                                        Providing false information is a criminal offense.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="birthDate" className="text-gray-300">Date of Birth</Label>
                            <Input
                                id="birthDate"
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                max={maxDateString}
                                required
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                            <p className="text-xs text-gray-500">
                                You must have been born on or before {maxDateString}
                            </p>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="confirmed"
                                checked={confirmed}
                                onCheckedChange={(checked) => setConfirmed(checked === true)}
                                className="mt-1 border-gray-600 data-[state=checked]:bg-purple-600"
                            />
                            <Label
                                htmlFor="confirmed"
                                className="text-sm text-gray-300 leading-relaxed cursor-pointer"
                            >
                                I confirm that I am 21 years of age or older and that the information
                                I have provided is accurate. I understand that providing false information
                                may result in legal consequences.
                            </Label>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            disabled={isLoading || !confirmed}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify My Age'
                            )}
                        </Button>
                        <p className="text-center text-gray-500 text-xs">
                            Your date of birth will be securely stored and used only for age verification purposes.
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
