"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"

export interface CartItem {
  id: string
  productId: string
  productName: string
  productImage: string
  storeId: string
  storeName: string
  price: number
  taxes: number
  shippingCost: number
  quantity: number
  maxStock: number
  estimatedDelivery: {
    min: number
    max: number
    unit: "hours" | "days"
  }
}

interface CartContextType {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  addToCart: (item: Omit<CartItem, "id">) => void
  removeFromCart: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (productId: string, storeId: string) => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (error) {
        console.error("Error loading cart from localStorage:", error)
      }
    }
  }, [])

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items))
  }, [items])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + (item.price + item.taxes + item.shippingCost) * item.quantity, 0)

  const addToCart = (newItem: Omit<CartItem, "id">) => {
    const existingItemIndex = items.findIndex(
      (item) => item.productId === newItem.productId && item.storeId === newItem.storeId,
    )

    if (existingItemIndex >= 0) {
      // Update existing item
      const existingItem = items[existingItemIndex]
      const newQuantity = existingItem.quantity + newItem.quantity

      if (newQuantity > newItem.maxStock) {
        toast({
          title: "Stock limit exceeded",
          description: `Only ${newItem.maxStock} items available from this store`,
          variant: "destructive",
        })
        return
      }

      setItems((prev) =>
        prev.map((item, index) => (index === existingItemIndex ? { ...item, quantity: newQuantity } : item)),
      )

      toast({
        title: "Cart updated",
        description: `${newItem.productName} quantity updated to ${newQuantity}`,
      })
    } else {
      // Add new item
      if (newItem.quantity > newItem.maxStock) {
        toast({
          title: "Stock limit exceeded",
          description: `Only ${newItem.maxStock} items available from this store`,
          variant: "destructive",
        })
        return
      }

      const cartItem: CartItem = {
        ...newItem,
        id: `${newItem.productId}-${newItem.storeId}-${Date.now()}`,
      }

      setItems((prev) => [...prev, cartItem])

      toast({
        title: "Added to cart",
        description: `${newItem.productName} added to your cart`,
      })
    }
  }

  const removeFromCart = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
    toast({
      title: "Removed from cart",
      description: "Item removed from your cart",
    })
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          if (quantity > item.maxStock) {
            toast({
              title: "Stock limit exceeded",
              description: `Only ${item.maxStock} items available`,
              variant: "destructive",
            })
            return item
          }
          return { ...item, quantity }
        }
        return item
      }),
    )
  }

  const clearCart = () => {
    setItems([])
    toast({
      title: "Cart cleared",
      description: "All items removed from cart",
    })
  }

  const getItemQuantity = (productId: string, storeId: string) => {
    const item = items.find((item) => item.productId === productId && item.storeId === storeId)
    return item ? item.quantity : 0
  }

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
