"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"

export interface FavoriteProduct {
  id: string
  name: string
  brand: string
  category: string
  image: string
  price: number
  rating: number
  dateAdded: string
}

interface FavoritesContextType {
  favorites: FavoriteProduct[]
  addToFavorites: (product: FavoriteProduct) => void
  removeFromFavorites: (productId: string) => void
  isFavorite: (productId: string) => boolean
  clearFavorites: () => void
  totalFavorites: number
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem("favorites")
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites))
      } catch (error) {
        console.error("Error loading favorites from localStorage:", error)
      }
    }
  }, [])

  // Save favorites to localStorage whenever favorites change
  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites))
  }, [favorites])

  const addToFavorites = (product: FavoriteProduct) => {
    const isAlreadyFavorite = favorites.some((fav) => fav.id === product.id)

    if (isAlreadyFavorite) {
      toast({
        title: "Already in favorites",
        description: `${product.name} is already in your favorites`,
        variant: "destructive",
      })
      return
    }

    const favoriteProduct: FavoriteProduct = {
      ...product,
      dateAdded: new Date().toISOString(),
    }

    setFavorites((prev) => [favoriteProduct, ...prev])

    toast({
      title: "Added to favorites",
      description: `${product.name} added to your favorites`,
    })
  }

  const removeFromFavorites = (productId: string) => {
    const product = favorites.find((fav) => fav.id === productId)
    setFavorites((prev) => prev.filter((fav) => fav.id !== productId))

    if (product) {
      toast({
        title: "Removed from favorites",
        description: `${product.name} removed from favorites`,
      })
    }
  }

  const isFavorite = (productId: string) => {
    return favorites.some((fav) => fav.id === productId)
  }

  const clearFavorites = () => {
    setFavorites([])
    toast({
      title: "Favorites cleared",
      description: "All favorites have been removed",
    })
  }

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addToFavorites,
        removeFromFavorites,
        isFavorite,
        clearFavorites,
        totalFavorites: favorites.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider")
  }
  return context
}
