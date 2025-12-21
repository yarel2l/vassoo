"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type Language = "en" | "es"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.wines": "Wines",
    "nav.spirits": "Spirits",
    "nav.beers": "Beers",
    "nav.cocktails": "Cocktails",
    "nav.about": "About",
    "nav.contact": "Contact",

    // Hero Section
    "hero.title": "Premium Beverages from Multiple Stores",
    "hero.subtitle": "Discover the finest wines, spirits, beers and cocktails all in one place",
    "hero.cta": "Explore Collection",

    // Categories
    "categories.title": "Shop by Category",
    "categories.wines": "Premium Wines",
    "categories.wines.desc": "From vintage reds to crisp whites",
    "categories.spirits": "Fine Spirits",
    "categories.spirits.desc": "Whiskey, rum, vodka & more",
    "categories.beers": "Craft Beers",
    "categories.beers.desc": "Local and international brews",
    "categories.cocktails": "Cocktail Mixes",
    "categories.cocktails.desc": "Everything for perfect cocktails",

    // Products
    "products.featured": "Featured Products",
    "products.addToCart": "Add to Cart",
    "products.viewDetails": "View Details",
    "products.from": "from",

    // Footer
    "footer.about": "About LiquorHub",
    "footer.about.text": "Your premium destination for the finest beverages from multiple trusted stores.",
    "footer.links": "Quick Links",
    "footer.contact": "Contact Info",
    "footer.rights": "All rights reserved.",

    // Search
    "search.placeholder": "Search wines, spirits, beers...",
    "search.mobile.placeholder": "Search products...",
    "search.title": "Search",
    "search.navigation": "Navigation",
    "search.categories": "Categories",
    "search.language": "Language",

    // Mobile Navigation
    "mobile.explorer": "Explorer",
    "mobile.cart": "Cart",
    "mobile.purchases": "Purchases",
    "mobile.account": "My Account",
    "mobile.settings": "Settings",

    // Flash Sales
    "flash.title": "Flash Sales",
    "flash.subtitle": "Limited time offers - grab them before they're gone!",
    "flash.left": "left",
    "flash.buyNow": "Buy Now",

    // Birthday Section
    "birthday.title": "Happy Birthday Celebrations",
    "birthday.subtitle": "Make every birthday unforgettable with our premium selection of celebratory beverages",
    "birthday.offer": "Special Birthday Offer",
    "birthday.offerDesc": "Get 15% off + Free Gift Wrapping on birthday orders over $200",
    "birthday.special": "Birthday Special",
    "birthday.addToCart": "Add to Cart",
    "birthday.giftWrap": "Gift Wrap",
    "birthday.viewAll": "View All Birthday Gifts",

    // User Menu
    "user.accountSettings": "Account Settings",
    "user.purchaseHistory": "Purchase History",
    "user.paymentMethods": "Payment Methods",
    "user.favorites": "Favorites",
    "user.logout": "Logout",
    "user.language": "Language",
    "user.theme": "Theme",

    // Voice Search
    "search.voice.listening": "Listening...",
    "search.voice.listeningDesc": "Speak now to search for products",
    "search.voice.error": "Voice search error",
    "search.voice.errorDesc": "Could not process voice input. Please try again.",

    // Image Search
    "search.image.title": "Search by Image",
    "search.image.takePhoto": "Take Photo",
    "search.image.uploadPhoto": "Upload Photo",
    "search.image.capture": "Capture",
    "search.image.cancel": "Cancel",
    "search.image.search": "Search",
    "search.image.processing": "Processing...",
    "search.image.retake": "Retake",
    "search.image.success": "Image processed",
    "search.image.successDesc": "Searching for similar products...",
    "search.image.cameraError": "Camera access denied",
    "search.image.cameraErrorDesc": "Please allow camera access to use this feature",
    "search.image.processError": "Processing failed",
    "search.image.processErrorDesc": "Could not process the image. Please try again.",
  },
  es: {
    // Navigation
    "nav.home": "Inicio",
    "nav.wines": "Vinos",
    "nav.spirits": "Licores",
    "nav.beers": "Cervezas",
    "nav.cocktails": "Cócteles",
    "nav.about": "Acerca de",
    "nav.contact": "Contacto",

    // Hero Section
    "hero.title": "Bebidas Premium de Múltiples Tiendas",
    "hero.subtitle": "Descubre los mejores vinos, licores, cervezas y cócteles en un solo lugar",
    "hero.cta": "Explorar Colección",

    // Categories
    "categories.title": "Comprar por Categoría",
    "categories.wines": "Vinos Premium",
    "categories.wines.desc": "Desde tintos añejos hasta blancos frescos",
    "categories.spirits": "Licores Finos",
    "categories.spirits.desc": "Whiskey, ron, vodka y más",
    "categories.beers": "Cervezas Artesanales",
    "categories.beers.desc": "Cervezas locales e internacionales",
    "categories.cocktails": "Mezclas para Cócteles",
    "categories.cocktails.desc": "Todo para cócteles perfectos",

    // Products
    "products.featured": "Productos Destacados",
    "products.addToCart": "Agregar al Carrito",
    "products.viewDetails": "Ver Detalles",
    "products.from": "desde",

    // Footer
    "footer.about": "Acerca de LiquorHub",
    "footer.about.text": "Tu destino premium para las mejores bebidas de múltiples tiendas confiables.",
    "footer.links": "Enlaces Rápidos",
    "footer.contact": "Información de Contacto",
    "footer.rights": "Todos los derechos reservados.",

    // Search
    "search.placeholder": "Buscar vinos, licores, cervezas...",
    "search.mobile.placeholder": "Buscar productos...",
    "search.title": "Buscar",
    "search.navigation": "Navegación",
    "search.categories": "Categorías",
    "search.language": "Idioma",

    // Mobile Navigation
    "mobile.explorer": "Explorar",
    "mobile.cart": "Carrito",
    "mobile.purchases": "Compras",
    "mobile.account": "Mi Cuenta",
    "mobile.settings": "Ajustes",

    // Flash Sales
    "flash.title": "Ofertas Flash",
    "flash.subtitle": "¡Ofertas por tiempo limitado - consíguelas antes de que se agoten!",
    "flash.left": "quedan",
    "flash.buyNow": "Comprar Ahora",

    // Birthday Section
    "birthday.title": "Celebraciones de Cumpleaños",
    "birthday.subtitle":
      "Haz que cada cumpleaños sea inolvidable con nuestra selección premium de bebidas celebratorias",
    "birthday.offer": "Oferta Especial de Cumpleaños",
    "birthday.offerDesc": "Obtén 15% de descuento + Envoltorio de regalo gratis en pedidos de cumpleaños sobre $200",
    "birthday.special": "Especial Cumpleaños",
    "birthday.addToCart": "Agregar al Carrito",
    "birthday.giftWrap": "Envolver Regalo",
    "birthday.viewAll": "Ver Todos los Regalos de Cumpleaños",

    // User Menu
    "user.accountSettings": "Configuración de Cuenta",
    "user.purchaseHistory": "Historial de Compras",
    "user.paymentMethods": "Métodos de Pago",
    "user.favorites": "Favoritos",
    "user.logout": "Cerrar Sesión",
    "user.language": "Idioma",
    "user.theme": "Tema",

    // Voice Search
    "search.voice.listening": "Escuchando...",
    "search.voice.listeningDesc": "Habla ahora para buscar productos",
    "search.voice.error": "Error de búsqueda por voz",
    "search.voice.errorDesc": "No se pudo procesar la entrada de voz. Inténtalo de nuevo.",

    // Image Search
    "search.image.title": "Buscar por Imagen",
    "search.image.takePhoto": "Tomar Foto",
    "search.image.uploadPhoto": "Subir Foto",
    "search.image.capture": "Capturar",
    "search.image.cancel": "Cancelar",
    "search.image.search": "Buscar",
    "search.image.processing": "Procesando...",
    "search.image.retake": "Repetir",
    "search.image.success": "Imagen procesada",
    "search.image.successDesc": "Buscando productos similares...",
    "search.image.cameraError": "Acceso a cámara denegado",
    "search.image.cameraErrorDesc": "Por favor permite el acceso a la cámara para usar esta función",
    "search.image.processError": "Procesamiento fallido",
    "search.image.processErrorDesc": "No se pudo procesar la imagen. Inténtalo de nuevo.",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language
    if (saved && (saved === "en" || saved === "es")) {
      setLanguage(saved)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
