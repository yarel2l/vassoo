"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { toast } from "@/hooks/use-toast"
import type SpeechRecognition from "speech-recognition"

interface VoiceSearchProps {
  onResult: (transcript: string) => void
  disabled?: boolean
}

export default function VoiceSearch({ onResult, disabled }: VoiceSearchProps) {
  const { language, t } = useLanguage()
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      setIsSupported(!!SpeechRecognition)

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = language === "es" ? "es-ES" : "en-US"

        recognition.onstart = () => {
          setIsListening(true)
        }

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          onResult(transcript)
          setIsListening(false)
        }

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error)
          setIsListening(false)
          toast({
            title: t("search.voice.error"),
            description: t("search.voice.errorDesc"),
            variant: "destructive",
          })
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }
    }
  }, [language, onResult, t])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
        toast({
          title: t("search.voice.listening"),
          description: t("search.voice.listeningDesc"),
        })
      } catch (error) {
        console.error("Error starting speech recognition:", error)
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  if (!isSupported || disabled) {
    return null
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="absolute right-12 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-muted/80"
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
    >
      {isListening ? (
        <div className="flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-red-500" />
        </div>
      ) : (
        <Mic className="h-4 w-4 text-muted-foreground hover:text-primary" />
      )}
    </Button>
  )
}
