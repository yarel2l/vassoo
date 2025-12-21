"use client"

import { useState } from "react"
import { toast } from "@/hooks/use-toast"

interface ShareData {
  title: string
  text: string
  url: string
}

export function useShare() {
  const [isSharing, setIsSharing] = useState(false)

  const canShare = typeof navigator !== "undefined" && "share" in navigator

  const shareProduct = async (data: ShareData) => {
    setIsSharing(true)

    try {
      if (canShare && navigator.share) {
        // Use native sharing on mobile devices
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url,
        })

        toast({
          title: "Shared successfully",
          description: "Product shared successfully",
        })
      } else {
        // Fallback to clipboard on desktop
        await navigator.clipboard.writeText(data.url)

        toast({
          title: "Link copied",
          description: "Product link copied to clipboard",
        })
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error sharing:", error)

        // Fallback to clipboard if sharing fails
        try {
          await navigator.clipboard.writeText(data.url)
          toast({
            title: "Link copied",
            description: "Product link copied to clipboard",
          })
        } catch (clipboardError) {
          toast({
            title: "Share failed",
            description: "Unable to share or copy link",
            variant: "destructive",
          })
        }
      }
    } finally {
      setIsSharing(false)
    }
  }

  const shareViaEmail = (data: ShareData) => {
    const subject = encodeURIComponent(data.title)
    const body = encodeURIComponent(`${data.text}\n\n${data.url}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const shareViaWhatsApp = (data: ShareData) => {
    const text = encodeURIComponent(`${data.title}\n${data.text}\n${data.url}`)
    window.open(`https://wa.me/?text=${text}`)
  }

  const shareViaTwitter = (data: ShareData) => {
    const text = encodeURIComponent(`${data.title}\n${data.url}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}`)
  }

  const shareViaFacebook = (data: ShareData) => {
    const url = encodeURIComponent(data.url)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`)
  }

  return {
    canShare,
    isSharing,
    shareProduct,
    shareViaEmail,
    shareViaWhatsApp,
    shareViaTwitter,
    shareViaFacebook,
  }
}
