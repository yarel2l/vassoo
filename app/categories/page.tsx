"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Grid3X3,
  Package,
  List,
  LayoutGrid,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  X,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/components/language-provider"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import Link from "next/link"
import Image from "next/image"
import { getCategoriesWithCounts, type CategoryWithCount, searchProducts, type ProductWithPrices } from "@/lib/services/marketplace"

type ViewMode = "grid" | "list"
type SortOption = "name" | "products"

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("products")
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [previewProducts, setPreviewProducts] = useState<{ [categoryId: string]: ProductWithPrices[] }>({})
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategoriesWithCounts()
        setCategories(data)
      } catch (error) {
        console.error("Error loading categories:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
  }, [])

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    let result = categories.filter(
      (category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )

    // Sort
    switch (sortBy) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "products":
        result.sort((a, b) => b.count - a.count)
        break
    }

    return result
  }, [categories, searchQuery, sortBy])

  // Get popular categories (top 4 by product count)
  const popularCategories = useMemo(() => {
    return [...categories].sort((a, b) => b.count - a.count).slice(0, 4)
  }, [categories])

  // Load preview products for a category
  const loadPreviewProducts = async (categoryName: string, categoryId: string) => {
    if (previewProducts[categoryId]) return

    setLoadingPreview(categoryId)
    try {
      const products = await searchProducts({
        category: categoryName,
        limit: 4,
      })
      setPreviewProducts(prev => ({ ...prev, [categoryId]: products }))
    } catch (error) {
      console.error("Error loading preview:", error)
    } finally {
      setLoadingPreview(null)
    }
  }

  // Toggle category expansion and load preview
  const toggleExpanded = (categoryId: string, categoryName: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null)
    } else {
      setExpandedCategory(categoryId)
      loadPreviewProducts(categoryName, categoryId)
    }
  }

  // Get gradient based on category name
  const getCategoryGradient = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes('wine')) return 'from-red-600 to-rose-500'
    if (name.includes('spirit') || name.includes('whiskey') || name.includes('vodka')) return 'from-amber-600 to-yellow-500'
    if (name.includes('beer')) return 'from-yellow-500 to-orange-400'
    if (name.includes('cocktail') || name.includes('mixer')) return 'from-teal-500 to-cyan-400'
    if (name.includes('champagne') || name.includes('sparkling')) return 'from-yellow-400 to-amber-300'
    return 'from-orange-500 to-amber-500'
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
            <div className="container mx-auto px-4 py-12">
              <Skeleton className="h-10 w-64 bg-white/20 mb-4" />
              <Skeleton className="h-6 w-96 bg-white/20" />
            </div>
          </div>
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="h-40 w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="container mx-auto px-4 py-12">
            <div className="flex items-center space-x-3 mb-4">
              <Grid3X3 className="h-8 w-8" />
              <h1 className="text-3xl font-bold">{t("categories.title")}</h1>
            </div>
            <p className="text-orange-100 text-lg">
              Explore our extensive collection of premium beverages
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Search and Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <Button
                  variant={sortBy === "products" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy("products")}
                  className="text-xs"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Popular
                </Button>
                <Button
                  variant={sortBy === "name" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy("name")}
                  className="text-xs"
                >
                  A-Z
                </Button>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* No categories */}
          {categories.length === 0 && (
            <div className="text-center py-16">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Categories Yet</h2>
              <p className="text-muted-foreground mb-6">
                Categories will appear here once products are added to the platform.
              </p>
              <Link href="/search">
                <Button>Browse All Products</Button>
              </Link>
            </div>
          )}

          {/* Popular Categories Section */}
          {!searchQuery && popularCategories.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <h2 className="text-xl font-bold">Popular Categories</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {popularCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/search?category=${encodeURIComponent(category.name)}`}
                    className="group"
                  >
                    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-orange-200/50 dark:border-orange-800/50">
                      <div className={`relative h-32 bg-gradient-to-br ${getCategoryGradient(category.name)}`}>
                        {category.image_url ? (
                          <Image
                            src={category.image_url}
                            alt={category.name}
                            fill
                            className="object-cover opacity-80 group-hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Package className="h-12 w-12 text-white/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <Badge className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white border-white/30">
                          {category.count} products
                        </Badge>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-xl font-bold text-white">{category.name}</h3>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* All Categories */}
          {filteredCategories.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {searchQuery ? `Results for "${searchQuery}"` : "All Categories"}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {filteredCategories.length} {filteredCategories.length === 1 ? "category" : "categories"}
                </span>
              </div>

              {/* Grid View */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/search?category=${encodeURIComponent(category.name)}`}
                      className="group"
                    >
                      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-orange-500 dark:hover:border-orange-400">
                        <div className={`relative aspect-square bg-gradient-to-br ${getCategoryGradient(category.name)}`}>
                          {category.image_url ? (
                            <Image
                              src={category.image_url}
                              alt={category.name}
                              fill
                              className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Package className="h-10 w-10 text-white/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                          {/* Badge */}
                          <Badge
                            variant="secondary"
                            className="absolute top-2 right-2 text-xs bg-white/20 backdrop-blur-sm text-white border-white/30"
                          >
                            {category.count}
                          </Badge>

                          {/* Content */}
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h3 className="font-semibold text-white text-sm md:text-base line-clamp-1 group-hover:text-orange-300 transition-colors">
                              {category.name}
                            </h3>
                            {category.description && (
                              <p className="text-white/70 text-xs line-clamp-1 mt-0.5">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === "list" && (
                <div className="space-y-3">
                  {filteredCategories.map((category) => (
                    <Card
                      key={category.id}
                      className={`overflow-hidden transition-all duration-300 ${
                        expandedCategory === category.id
                          ? "border-orange-500 shadow-lg"
                          : "hover:border-orange-300 dark:hover:border-orange-700"
                      }`}
                    >
                      <div
                        className="flex items-center gap-4 p-4 cursor-pointer"
                        onClick={() => toggleExpanded(category.id, category.name)}
                      >
                        {/* Category Image/Icon */}
                        <div className={`relative w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br ${getCategoryGradient(category.name)} flex-shrink-0`}>
                          {category.image_url ? (
                            <Image
                              src={category.image_url}
                              alt={category.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Package className="h-6 w-6 text-white/60" />
                            </div>
                          )}
                        </div>

                        {/* Category Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{category.name}</h3>
                            {category.count > 50 && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Popular
                              </Badge>
                            )}
                          </div>
                          {category.description && (
                            <p className="text-muted-foreground text-sm line-clamp-1">
                              {category.description}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            {category.count} {category.count === 1 ? "product" : "products"}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/search?category=${encodeURIComponent(category.name)}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="outline" size="sm">
                              Browse
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                          <ChevronRight
                            className={`h-5 w-5 text-muted-foreground transition-transform ${
                              expandedCategory === category.id ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expanded Preview */}
                      {expandedCategory === category.id && (
                        <div className="border-t bg-muted/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm">Quick Preview</h4>
                            <Link
                              href={`/search?category=${encodeURIComponent(category.name)}`}
                              className="text-sm text-orange-600 hover:text-orange-700 flex items-center"
                            >
                              View all {category.count} products
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                          </div>

                          {loadingPreview === category.id ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-24 rounded-lg" />
                              ))}
                            </div>
                          ) : previewProducts[category.id]?.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {previewProducts[category.id].slice(0, 4).map((product) => (
                                <Link
                                  key={product.id}
                                  href={`/product/${product.slug || product.id}`}
                                  className="group"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="bg-background rounded-lg p-2 border transition-all hover:border-orange-500 hover:shadow-sm">
                                    <div className="relative aspect-square rounded overflow-hidden bg-muted mb-2">
                                      {product.thumbnail_url ? (
                                        <Image
                                          src={product.thumbnail_url}
                                          alt={product.name}
                                          fill
                                          className="object-cover group-hover:scale-105 transition-transform"
                                        />
                                      ) : (
                                        <div className="flex items-center justify-center h-full">
                                          <Package className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                                    <p className="text-xs text-orange-600 font-semibold">
                                      {product.price_range_text}
                                    </p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No products available in this category yet.
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* No search results */}
          {searchQuery && filteredCategories.length === 0 && categories.length > 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No categories found</h3>
              <p className="text-muted-foreground mb-4">
                No categories match "{searchQuery}". Try a different search term.
              </p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </div>
          )}

          {/* Quick Actions */}
          {categories.length > 0 && (
            <Card className="mt-12 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Can't find what you're looking for?</h2>
                    <p className="text-orange-100">
                      Use our powerful search to find exactly what you need.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/search">
                      <Button variant="secondary" size="lg">
                        <Search className="h-4 w-4 mr-2" />
                        Search Products
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button
                        variant="outline"
                        size="lg"
                        className="bg-transparent text-white border-white hover:bg-white hover:text-orange-600"
                      >
                        <Grid3X3 className="h-4 w-4 mr-2" />
                        Explore Stores
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
