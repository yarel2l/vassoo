"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useOnboarding } from "@/hooks/use-onboarding"
import OnboardingModal from "@/components/onboarding-modal"

interface OnboardingWrapperProps {
  children: ReactNode
}

// Routes that should skip onboarding (driver app, dashboard, auth pages)
const SKIP_ONBOARDING_ROUTES = [
  '/driver',
  '/dashboard',
  '/auth',
  '/api',
]

export default function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const pathname = usePathname()
  const { isOnboardingComplete, isLoading, completeOnboarding } = useOnboarding()

  // Skip onboarding for specific routes
  const shouldSkipOnboarding = SKIP_ONBOARDING_ROUTES.some(route => 
    pathname?.startsWith(route)
  )

  if (shouldSkipOnboarding) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <>
      {children}
      <OnboardingModal isOpen={!isOnboardingComplete} onComplete={completeOnboarding} />
    </>
  )
}
