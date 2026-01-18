'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Declarar gtag para TypeScript
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void
    dataLayer: unknown[]
  }
}

function GoogleAnalyticsTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window.gtag !== 'function') return

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    
    // Enviar pageview cuando cambia la ruta
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    })
  }, [pathname, searchParams])

  return null
}

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <>
      {/* Google Analytics Script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
      
      {/* Tracking component for SPA navigation */}
      <Suspense fallback={null}>
        <GoogleAnalyticsTracking />
      </Suspense>
    </>
  )
}

/**
 * Función utilitaria para enviar eventos personalizados a Google Analytics
 * @example
 * trackEvent('add_to_cart', { item_id: '123', item_name: 'Whisky', value: 49.99 })
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, unknown>
) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return
  }

  window.gtag('event', eventName, eventParams)
}

/**
 * Eventos predefinidos para e-commerce
 */
export const analyticsEvents = {
  // Eventos de producto
  viewItem: (item: { id: string; name: string; price: number; category?: string }) => {
    trackEvent('view_item', {
      currency: 'USD',
      value: item.price,
      items: [{
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
      }]
    })
  },

  // Eventos de carrito
  addToCart: (item: { id: string; name: string; price: number; quantity: number }) => {
    trackEvent('add_to_cart', {
      currency: 'USD',
      value: item.price * item.quantity,
      items: [{
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }]
    })
  },

  removeFromCart: (item: { id: string; name: string; price: number; quantity: number }) => {
    trackEvent('remove_from_cart', {
      currency: 'USD',
      value: item.price * item.quantity,
      items: [{
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }]
    })
  },

  // Eventos de checkout
  beginCheckout: (value: number, items: Array<{ id: string; name: string; price: number; quantity: number }>) => {
    trackEvent('begin_checkout', {
      currency: 'USD',
      value,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))
    })
  },

  purchase: (transactionId: string, value: number, items: Array<{ id: string; name: string; price: number; quantity: number }>) => {
    trackEvent('purchase', {
      transaction_id: transactionId,
      currency: 'USD',
      value,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))
    })
  },

  // Eventos de búsqueda
  search: (searchTerm: string) => {
    trackEvent('search', { search_term: searchTerm })
  },

  // Eventos de usuario
  login: (method: string) => {
    trackEvent('login', { method })
  },

  signUp: (method: string) => {
    trackEvent('sign_up', { method })
  },
}
