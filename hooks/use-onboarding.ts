"use client"

import { useState, useEffect } from "react"

interface OnboardingData {
  isOver18: boolean
  address?: string
}

export function useOnboarding() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if onboarding has been completed
    const checkOnboardingStatus = () => {
      try {
        const completed = localStorage.getItem("vassoo-onboarding-completed")
        const ageVerified = localStorage.getItem("vassoo-age-verified")

        if (completed === "true" && ageVerified === "true") {
          setIsOnboardingComplete(true)
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [])

  const completeOnboarding = (data: OnboardingData) => {
    try {
      localStorage.setItem("vassoo-onboarding-completed", "true")
      localStorage.setItem("vassoo-age-verified", data.isOver18.toString())

      if (data.address) {
        localStorage.setItem("vassoo-shipping-address", data.address)
      }

      setIsOnboardingComplete(true)
    } catch (error) {
      console.error("Error saving onboarding data:", error)
    }
  }

  const resetOnboarding = () => {
    try {
      localStorage.removeItem("vassoo-onboarding-completed")
      localStorage.removeItem("vassoo-age-verified")
      localStorage.removeItem("vassoo-shipping-address")
      setIsOnboardingComplete(false)
    } catch (error) {
      console.error("Error resetting onboarding:", error)
    }
  }

  return {
    isOnboardingComplete,
    isLoading,
    completeOnboarding,
    resetOnboarding,
  }
}
