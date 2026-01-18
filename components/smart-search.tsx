"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Grid3X3,
  Package,
  Store,
  ArrowRight,
  Loader2,
  TrendingUp,
  Command,
  X,
  Star,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"

interface SearchCategory {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  productCount: number
}

interface SearchProduct {
  id: string
  name: string
  brand: string | null
  category: string
  thumbnail_url: string | null
  slug: string | null
  lowestPrice: number
  storeCount: number
}

interface SearchStore {
  id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  rating: number
  productCount: number
}

interface SearchResults {
  categories: SearchCategory[]
  products: SearchProduct[]
  stores: SearchStore[]
  totalResults: number
}

interface SmartSearchProps {
  placeholder?: string
  className?: string
}

export default function SmartSearch({ placeholder = "Search products, categories, stores...", className }: SmartSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate total items for keyboard navigation
  const allItems = [
    ...(results?.categories || []).map(c => ({ type: 'category' as const, item: c })),
    ...(results?.products || []).map(p => ({ type: 'product' as const, item: p })),
    ...(results?.stores || []).map(s => ({ type: 'store' as const, item: s })),
  ]

  // Fetch search results
  const fetchResults = useCallback(async (searchQuery: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/search/unified?q=${encodeURIComponent(searchQuery)}&limit=4`)
      const data = await response.json()
      setResults(data)
      setSelectedIndex(-1)
    } catch (error) {
      console.error("Error fetching search results:", error)
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.length >= 2 || query.length === 0) {
      debounceRef.current = setTimeout(() => {
        fetchResults(query)
      }, 200)
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, fetchResults])

  // Load popular items when opening empty
  useEffect(() => {
    if (isOpen && !query) {
      fetchResults("")
    }
  }, [isOpen, query, fetchResults])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true)
        return
      }
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && allItems[selectedIndex]) {
          navigateToItem(allItems[selectedIndex])
        } else if (query.trim()) {
          navigateToSearch()
        }
        break
      case "Escape":
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  // Navigate to selected item
  const navigateToItem = (item: { type: 'category' | 'product' | 'store', item: SearchCategory | SearchProduct | SearchStore }) => {
    setIsOpen(false)
    setQuery("")

    switch (item.type) {
      case 'category':
        router.push(`/search?category=${encodeURIComponent((item.item as SearchCategory).name)}`)
        break
      case 'product':
        const product = item.item as SearchProduct
        router.push(`/product/${product.slug || product.id}`)
        break
      case 'store':
        router.push(`/store/${(item.item as SearchStore).slug}`)
        break
    }
  }

  // Navigate to full search
  const navigateToSearch = () => {
    if (query.trim()) {
      setIsOpen(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [])

  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0

  const hasResults = results && (
    results.categories.length > 0 ||
    results.products.length > 0 ||
    results.stores.length > 0
  )

  let currentIndex = -1

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div
        className={`relative flex items-center h-11 rounded-full border transition-all duration-200 ${
          isOpen
            ? "border-2 border-orange-500 bg-background shadow-lg"
            : "border border-muted-foreground/30 bg-muted/50 hover:border-orange-500/50 hover:bg-muted/30"
        }`}
      >
        <Search className="h-5 w-5 text-muted-foreground ml-4 mr-3 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("")
              inputRef.current?.focus()
            }}
            className="p-1 mr-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {!query && (
          <div className="hidden md:flex items-center gap-1 mr-3 px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
            {isMac ? <Command className="h-3 w-3" /> : <span>Ctrl</span>}
            <span>K</span>
          </div>
        )}
        {loading && (
          <Loader2 className="h-4 w-4 mr-3 animate-spin text-orange-500" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-xl shadow-xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
        >
          {!hasResults && !loading && (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {query ? `No results for "${query}"` : "Start typing to search..."}
              </p>
            </div>
          )}

          {hasResults && (
            <>
              {/* Categories */}
              {results.categories.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Grid3X3 className="h-3 w-3" />
                    Categories
                  </div>
                  {results.categories.map((category) => {
                    currentIndex++
                    const isSelected = selectedIndex === currentIndex
                    const index = currentIndex

                    return (
                      <Link
                        key={category.id}
                        href={`/search?category=${encodeURIComponent(category.name)}`}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isSelected ? "bg-orange-500/10 text-orange-600" : "hover:bg-muted"
                        }`}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                          {category.image_url ? (
                            <Image
                              src={category.image_url}
                              alt={category.name}
                              width={40}
                              height={40}
                              className="rounded-lg object-cover"
                            />
                          ) : (
                            <Grid3X3 className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{category.name}</p>
                          {category.description && (
                            <p className="text-xs text-muted-foreground truncate">{category.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {category.productCount} items
                        </Badge>
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Products */}
              {results.products.length > 0 && (
                <div className="p-2 border-t">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Package className="h-3 w-3" />
                    Products
                  </div>
                  {results.products.map((product) => {
                    currentIndex++
                    const isSelected = selectedIndex === currentIndex
                    const index = currentIndex

                    return (
                      <Link
                        key={product.id}
                        href={`/product/${product.slug || product.id}`}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isSelected ? "bg-orange-500/10 text-orange-600" : "hover:bg-muted"
                        }`}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.thumbnail_url ? (
                            <Image
                              src={product.thumbnail_url}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {product.brand && `${product.brand} · `}{product.category}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-orange-600">${product.lowestPrice.toFixed(2)}</p>
                          {product.storeCount > 1 && (
                            <p className="text-xs text-muted-foreground">{product.storeCount} stores</p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Stores */}
              {results.stores.length > 0 && (
                <div className="p-2 border-t">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Store className="h-3 w-3" />
                    Stores
                  </div>
                  {results.stores.map((store) => {
                    currentIndex++
                    const isSelected = selectedIndex === currentIndex
                    const index = currentIndex

                    return (
                      <Link
                        key={store.id}
                        href={`/store/${store.slug}`}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isSelected ? "bg-orange-500/10 text-orange-600" : "hover:bg-muted"
                        }`}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {store.logo_url ? (
                            <Image
                              src={store.logo_url}
                              alt={store.name}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <Store className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{store.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {store.rating > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {store.rating.toFixed(1)}
                              </span>
                            )}
                            <span>{store.productCount} products</span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* View All Results */}
              {query && (
                <div className="p-2 border-t bg-muted/30">
                  <button
                    onClick={navigateToSearch}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedIndex === allItems.length
                        ? "bg-orange-500 text-white"
                        : "text-orange-600 hover:bg-orange-500/10"
                    }`}
                    onMouseEnter={() => setSelectedIndex(allItems.length)}
                  >
                    <Search className="h-4 w-4" />
                    View all results for "{query}"
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Popular Categories (when no query) */}
              {!query && results.categories.length > 0 && (
                <div className="p-2 border-t bg-muted/30">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Popular Categories
                  </div>
                </div>
              )}
            </>
          )}

          {/* Keyboard hints */}
          <div className="hidden md:flex items-center justify-between px-4 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">Enter</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">Esc</kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
