"use client"

import type { ReactNode } from "react"
import { useOnboarding } from "@/hooks/use-onboarding"
import OnboardingModal from "@/components/onboarding-modal"

interface OnboardingWrapperProps {
  children: ReactNode
}

export default function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { isOnboardingComplete, isLoading, completeOnboarding } = useOnboarding()

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
