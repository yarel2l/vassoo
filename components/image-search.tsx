"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Camera, Upload, X, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useDeviceCapabilities } from "@/hooks/use-device-capabilities"
import { toast } from "@/hooks/use-toast"

interface ImageSearchProps {
  onResult: (imageData: string) => void
  disabled?: boolean
}

export default function ImageSearch({ onResult, disabled }: ImageSearchProps) {
  const { t } = useLanguage()
  const { hasCamera, isMobile, isTablet } = useDeviceCapabilities()
  const [isOpen, setIsOpen] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    try {
      setIsCapturing(true)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isMobile || isTablet ? "environment" : "user" },
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast({
        title: t("search.image.cameraError"),
        description: t("search.image.cameraErrorDesc"),
        variant: "destructive",
      })
      setIsCapturing(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsCapturing(false)
  }

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = canvas.toDataURL("image/jpeg", 0.8)
        setCapturedImage(imageData)
        stopCamera()
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setCapturedImage(imageData)
      }
      reader.readAsDataURL(file)
    }
  }

  const processImage = async () => {
    if (!capturedImage) return

    setIsProcessing(true)
    try {
      // Simulate image processing/recognition
      await new Promise((resolve) => setTimeout(resolve, 2000))

      onResult(capturedImage)
      toast({
        title: t("search.image.success"),
        description: t("search.image.successDesc"),
      })

      setIsOpen(false)
      setCapturedImage(null)
    } catch (error) {
      console.error("Error processing image:", error)
      toast({
        title: t("search.image.processError"),
        description: t("search.image.processErrorDesc"),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetCapture = () => {
    setCapturedImage(null)
    stopCamera()
  }

  if (!hasCamera || disabled) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-20 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-muted/80"
        >
          <Camera className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("search.image.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!capturedImage ? (
            <>
              {isCapturing ? (
                <div className="space-y-4">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-64 bg-black rounded-lg object-cover" />
                  <div className="flex space-x-2">
                    <Button onClick={captureImage} className="flex-1">
                      <Camera className="mr-2 h-4 w-4" />
                      {t("search.image.capture")}
                    </Button>
                    <Button variant="outline" onClick={stopCamera}>
                      <X className="mr-2 h-4 w-4" />
                      {t("search.image.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <Button onClick={startCamera} className="h-20">
                      <Camera className="mr-2 h-6 w-6" />
                      {t("search.image.takePhoto")}
                    </Button>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-20">
                      <Upload className="mr-2 h-6 w-6" />
                      {t("search.image.uploadPhoto")}
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <img
                src={capturedImage || "/placeholder.svg"}
                alt="Captured"
                className="w-full h-64 object-cover rounded-lg"
              />
              <div className="flex space-x-2">
                <Button onClick={processImage} disabled={isProcessing} className="flex-1">
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  {isProcessing ? t("search.image.processing") : t("search.image.search")}
                </Button>
                <Button variant="outline" onClick={resetCapture} disabled={isProcessing}>
                  <X className="mr-2 h-4 w-4" />
                  {t("search.image.retake")}
                </Button>
              </div>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
