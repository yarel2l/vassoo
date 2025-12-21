"use client"

import { useState, useEffect } from "react"

interface DeviceCapabilities {
  hasCamera: boolean
  hasMicrophone: boolean
  hasWebcam: boolean
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    hasCamera: false,
    hasMicrophone: false,
    hasWebcam: false,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
  })

  useEffect(() => {
    const checkCapabilities = async () => {
      // Check device type
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)
      const isTablet =
        /ipad|android(?!.*mobile)/.test(userAgent) || (window.innerWidth >= 768 && window.innerWidth <= 1024)
      const isDesktop = !isMobile && !isTablet

      let hasCamera = false
      let hasMicrophone = false
      let hasWebcam = false

      try {
        // Check for media devices
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices()

          hasCamera = devices.some((device) => device.kind === "videoinput")
          hasMicrophone = devices.some((device) => device.kind === "audioinput")

          // On desktop, camera is typically webcam
          if (isDesktop && hasCamera) {
            hasWebcam = true
          }
        }
      } catch (error) {
        console.warn("Could not enumerate media devices:", error)
      }

      setCapabilities({
        hasCamera,
        hasMicrophone,
        hasWebcam,
        isMobile,
        isTablet,
        isDesktop,
      })
    }

    checkCapabilities()
  }, [])

  return capabilities
}
