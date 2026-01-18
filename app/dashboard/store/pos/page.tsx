'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
    Search,
    Plus,
    Minus,
    Trash2,
    ShoppingCart,
    CreditCard,
    Banknote,
    Loader2,
    Package,
    Check,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Image from 'next/image'

interface CartItem {
    productId: string
    inventoryId: string
    name: string
    price: number
    quantity: number
    maxQty: number
    image?: string
}

interface InventoryProduct {
    id: string
    product_id: string
    price: number
    quantity: number
    product: {
        id: string
        name: string
        sku: string
        thumbnail_url?: string
    }
}

export default function POSPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [storeId, setStoreId] = useState<string | null>(null)

    // Payment modal state
    const [isPaymentOpen, setIsPaymentOpen] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
    const [cashReceived, setCashReceived] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    // Receipt modal state
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)
    const [lastOrder, setLastOrder] = useState<{ orderNumber: string, total: number, change: number } | null>(null)

    // Customer info
    const [customerName, setCustomerName] = useState('')

    // Get the current store tenant ID from context
    const tenantId = currentStore?.id

    // Fetch inventory products
    const fetchProducts = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const supabase = createClient()

            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (!stores || stores.length === 0) {
                setInventoryProducts([])
                return
            }

            const currentStoreId = stores[0].id
            setStoreId(currentStoreId)

            const { data: inventory } = await supabase
                .from('store_inventories')
                .select(`
                    id,
                    product_id,
                    price,
                    quantity,
                    product:master_products!product_id(id, name, sku, thumbnail_url)
                `)
                .eq('store_id', currentStoreId)
                .gt('quantity', 0)
                .order('product_id')

            setInventoryProducts((inventory || []) as any)
        } catch (err) {
            console.error('Error fetching products:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    // Cart functions
    const addToCart = (product: InventoryProduct) => {
        setCart(prev => {
            const existing = prev.find(item => item.inventoryId === product.id)
            if (existing) {
                if (existing.quantity >= existing.maxQty) {
                    toast({ title: 'Max quantity reached', variant: 'destructive' })
                    return prev
                }
                return prev.map(item =>
                    item.inventoryId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, {
                productId: product.product.id,
                inventoryId: product.id,
                name: product.product.name,
                price: Number(product.price),
                quantity: 1,
                maxQty: product.quantity,
                image: product.product.thumbnail_url,
            }]
        })
    }

    const removeFromCart = (inventoryId: string) => {
        setCart(prev => prev.filter(item => item.inventoryId !== inventoryId))
    }

    const updateQuantity = (inventoryId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.inventoryId !== inventoryId) return item
            const newQty = item.quantity + delta
            if (newQty < 1) return item
            if (newQty > item.maxQty) {
                toast({ title: 'Max quantity reached', variant: 'destructive' })
                return item
            }
            return { ...item, quantity: newQty }
        }))
    }

    const clearCart = () => {
        setCart([])
        setCustomerName('')
    }

    // Calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = subtotal * 0.07 // 7% tax
    const total = subtotal + tax
    const change = parseFloat(cashReceived) - total

    // Process payment
    const processPayment = async () => {
        if (!storeId || cart.length === 0) return
        if (paymentMethod === 'cash' && parseFloat(cashReceived) < total) {
            toast({ title: 'Insufficient payment', variant: 'destructive' })
            return
        }

        setIsProcessing(true)
        try {
            const supabase = createClient()

            // Generate order number
            const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`

            // Create order with correct schema columns
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    store_id: storeId,
                    order_number: orderNumber,
                    status: 'completed',
                    fulfillment_type: 'pickup',
                    subtotal: subtotal,
                    tax_amount: tax,
                    delivery_fee: 0,
                    total: total,
                    // Guest info for POS sales (no customer_id required)
                    guest_name: customerName || 'Walk-in Customer',
                    // Payment info
                    payment_method: paymentMethod,
                    payment_status: 'paid',
                    cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
                    change_due: paymentMethod === 'cash' ? change : null,
                    // Order source tracking
                    order_source: 'pos',
                } as any)
                .select()
                .single()

            if (orderError) {
                console.error('Error creating order:', orderError)
                toast({ title: 'Error', description: orderError.message || 'Failed to process payment', variant: 'destructive' })
                return
            }

            // Create order items with inventory_id
            const orderItems = cart.map(item => ({
                order_id: orderData.id,
                inventory_id: item.inventoryId,
                product_id: item.productId,
                product_name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                subtotal: item.price * item.quantity,
            }))

            await supabase.from('order_items').insert(orderItems as any)

            // Update inventory (decrease stock) - direct update instead of RPC
            for (const item of cart) {
                const currentProduct = inventoryProducts.find(p => p.id === item.inventoryId)
                if (currentProduct) {
                    const newQuantity = Math.max(0, currentProduct.quantity - item.quantity)
                    await supabase
                        .from('store_inventories')
                        .update({ quantity: newQuantity } as any)
                        .eq('id', item.inventoryId)
                }
            }

            // Show receipt
            setLastOrder({
                orderNumber,
                total,
                change: paymentMethod === 'cash' ? parseFloat(cashReceived) - total : 0,
            })

            setIsPaymentOpen(false)
            setIsReceiptOpen(true)
            clearCart()
            fetchProducts() // Refresh inventory

        } catch (err) {
            console.error('Error processing payment:', err)
            toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' })
        } finally {
            setIsProcessing(false)
        }
    }

    // Open payment modal
    const openPayment = () => {
        if (cart.length === 0) {
            toast({ title: 'Cart is empty', variant: 'destructive' })
            return
        }
        setPaymentMethod('cash')
        setCashReceived('')
        setIsPaymentOpen(true)
    }

    // Filter products by search
    const filteredProducts = inventoryProducts.filter(p =>
        p.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading POS...</p>
                </div>
            </div>
        )
    }

    // No store found
    if (!storeId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium text-white mb-2">No store found</h3>
                    <p className="text-gray-400">Please select a store from the sidebar</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-gray-950">
            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Products Grid */}
                <div className="flex-1 p-4 overflow-y-auto">
                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-gray-800 border-gray-700 text-white text-lg h-12"
                        />
                    </div>

                    {/* Products */}
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                            <p className="text-gray-400 text-lg">No products available</p>
                            <p className="text-gray-500">Add products to inventory from the catalog</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {filteredProducts.map(product => (
                                <Card
                                    key={product.id}
                                    className="bg-gray-800 border-gray-700 hover:border-orange-500 cursor-pointer transition-all hover:scale-[1.02]"
                                    onClick={() => addToCart(product)}
                                >
                                    <CardContent className="p-3">
                                        <div className="aspect-square relative mb-2 rounded-lg overflow-hidden bg-gray-700">
                                            {product.product?.thumbnail_url ? (
                                                <Image
                                                    src={product.product.thumbnail_url}
                                                    alt={product.product.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <Package className="h-8 w-8 text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="font-medium text-white text-sm truncate">
                                            {product.product?.name}
                                        </p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-orange-400 font-bold">
                                                ${Number(product.price).toFixed(2)}
                                            </span>
                                            <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                                                {product.quantity} left
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart Sidebar */}
                <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
                    {/* Cart Header */}
                    <div className="p-4 border-b border-gray-800">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                Cart ({cart.length})
                            </h2>
                            {cart.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={clearCart}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>

                        {/* Customer Name */}
                        <div className="mt-3">
                            <Input
                                placeholder="Customer name (optional)"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {cart.length === 0 ? (
                            <div className="text-center py-12">
                                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                                <p className="text-gray-500">Cart is empty</p>
                                <p className="text-gray-600 text-sm">Click products to add them</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.inventoryId} className="bg-gray-800 rounded-lg p-3">
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 rounded bg-gray-700 flex-shrink-0 overflow-hidden">
                                            {item.image ? (
                                                <Image
                                                    src={item.image}
                                                    alt={item.name}
                                                    width={48}
                                                    height={48}
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <Package className="h-5 w-5 text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-white text-sm truncate">{item.name}</p>
                                            <p className="text-orange-400 text-sm">${item.price.toFixed(2)}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-red-400"
                                            onClick={() => removeFromCart(item.inventoryId)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={() => updateQuantity(item.inventoryId, -1)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center text-white font-medium">
                                                {item.quantity}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={() => updateQuantity(item.inventoryId, 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <span className="font-bold text-white">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Cart Summary */}
                    <div className="border-t border-gray-800 p-4 space-y-3">
                        <div className="flex justify-between text-gray-400">
                            <span>Subtotal</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                            <span>Tax (7%)</span>
                            <span>${tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-gray-700">
                            <span>Total</span>
                            <span className="text-orange-400">${total.toFixed(2)}</span>
                        </div>

                        <Button
                            className="w-full h-14 text-lg bg-orange-600 hover:bg-orange-700"
                            disabled={cart.length === 0}
                            onClick={openPayment}
                        >
                            <CreditCard className="h-5 w-5 mr-2" />
                            Charge ${total.toFixed(2)}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Payment</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Total: <span className="text-orange-400 font-bold">${total.toFixed(2)}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Payment Method */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                                className={paymentMethod === 'cash'
                                    ? 'bg-orange-600 hover:bg-orange-700'
                                    : 'border-gray-700 text-gray-300'}
                                onClick={() => setPaymentMethod('cash')}
                            >
                                <Banknote className="h-5 w-5 mr-2" />
                                Cash
                            </Button>
                            <Button
                                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                                className={paymentMethod === 'card'
                                    ? 'bg-orange-600 hover:bg-orange-700'
                                    : 'border-gray-700 text-gray-300'}
                                onClick={() => setPaymentMethod('card')}
                            >
                                <CreditCard className="h-5 w-5 mr-2" />
                                Card
                            </Button>
                        </div>

                        {/* Cash Input */}
                        {paymentMethod === 'cash' && (
                            <div className="space-y-2">
                                <Label className="text-gray-300">Cash Received</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-gray-800 border-gray-700 text-white text-2xl h-14 text-center"
                                />
                                {parseFloat(cashReceived) >= total && (
                                    <div className="text-center py-2 bg-green-900/30 rounded-lg">
                                        <p className="text-sm text-gray-400">Change</p>
                                        <p className="text-2xl font-bold text-green-400">
                                            ${change.toFixed(2)}
                                        </p>
                                    </div>
                                )}

                                {/* Quick amounts */}
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {[10, 20, 50, 100].map(amount => (
                                        <Button
                                            key={amount}
                                            variant="outline"
                                            className="border-gray-700 text-gray-300"
                                            onClick={() => setCashReceived(amount.toString())}
                                        >
                                            ${amount}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'card' && (
                            <div className="text-center py-6 bg-gray-800 rounded-lg">
                                <CreditCard className="h-12 w-12 mx-auto mb-2 text-gray-500" />
                                <p className="text-gray-400">Ready for card payment</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="border-gray-700 text-gray-300"
                            onClick={() => setIsPaymentOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={processPayment}
                            disabled={isProcessing || (paymentMethod === 'cash' && parseFloat(cashReceived) < total)}
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            Complete Sale
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Modal */}
            <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-center">
                            <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
                            Sale Complete!
                        </DialogTitle>
                    </DialogHeader>

                    {lastOrder && (
                        <div className="text-center space-y-4">
                            <div>
                                <p className="text-gray-400">Order Number</p>
                                <p className="text-2xl font-mono font-bold">{lastOrder.orderNumber}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Total Paid</p>
                                <p className="text-3xl font-bold text-orange-400">${lastOrder.total.toFixed(2)}</p>
                            </div>
                            {lastOrder.change > 0 && (
                                <div className="bg-green-900/30 rounded-lg p-3">
                                    <p className="text-gray-400">Change Due</p>
                                    <p className="text-2xl font-bold text-green-400">${lastOrder.change.toFixed(2)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            className="w-full bg-orange-600 hover:bg-orange-700"
                            onClick={() => setIsReceiptOpen(false)}
                        >
                            New Sale
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
