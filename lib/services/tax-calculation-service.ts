/**
 * Tax Calculation Service
 *
 * Calculates taxes dynamically based on:
 * - Customer's shipping address (state, county, city)
 * - Configured tax rates from platform_taxes table
 * - Product categories (for category-specific taxes like alcohol)
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for server-side use
// Note: Using NEXT_PUBLIC_ prefix for Amplify SSR compatibility
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export interface TaxRate {
    id: string
    scope: 'state' | 'county' | 'city'
    state_id: string | null
    county_id: string | null
    city_id: string | null
    name: string
    rate: number // Stored as decimal (0.0825 = 8.25%)
    tax_type: string // 'sales', 'alcohol', 'excise'
    applies_to: string // 'all', 'alcohol', 'specific_categories'
    categories: string[] | null
    is_active: boolean
}

export interface ShippingAddress {
    street?: string
    city: string
    state: string // State code or name
    zipCode: string
    country: string
}

export interface TaxableItem {
    productId: string
    productName: string
    price: number
    quantity: number
    category?: string
    isAlcohol?: boolean
}

export interface TaxCalculationResult {
    subtotal: number
    taxAmount: number
    taxRate: number // Effective combined rate as decimal
    taxBreakdown: Array<{
        name: string
        rate: number
        amount: number
        type: string
    }>
    totalWithTax: number
}

export const taxCalculationService = {
    /**
     * Calculate taxes for a list of items based on shipping address
     */
    async calculateTaxes(
        items: TaxableItem[],
        shippingAddress: ShippingAddress
    ): Promise<TaxCalculationResult> {
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

        // Get applicable tax rates for this address
        const taxRates = await this.getTaxRatesForAddress(shippingAddress)

        if (taxRates.length === 0) {
            // No tax rates configured - return zero taxes
            return {
                subtotal,
                taxAmount: 0,
                taxRate: 0,
                taxBreakdown: [],
                totalWithTax: subtotal
            }
        }

        // Calculate taxes for each applicable rate
        const taxBreakdown: TaxCalculationResult['taxBreakdown'] = []
        let totalTaxAmount = 0

        for (const rate of taxRates) {
            // Determine which items this tax applies to
            const taxableAmount = this.getTaxableAmount(items, rate)

            if (taxableAmount > 0) {
                const taxAmount = Math.round(taxableAmount * rate.rate * 100) / 100
                totalTaxAmount += taxAmount

                taxBreakdown.push({
                    name: rate.name,
                    rate: rate.rate,
                    amount: taxAmount,
                    type: rate.tax_type
                })
            }
        }

        // Calculate effective combined rate
        const effectiveRate = subtotal > 0 ? totalTaxAmount / subtotal : 0

        return {
            subtotal,
            taxAmount: Math.round(totalTaxAmount * 100) / 100,
            taxRate: effectiveRate,
            taxBreakdown,
            totalWithTax: Math.round((subtotal + totalTaxAmount) * 100) / 100
        }
    },

    /**
     * Get applicable tax rates for a shipping address
     */
    async getTaxRatesForAddress(address: ShippingAddress): Promise<TaxRate[]> {
        try {
            // First, resolve the state ID from state code/name
            const stateId = await this.resolveStateId(address.state)

            if (!stateId) {
                console.warn(`Could not resolve state: ${address.state}`)
                return []
            }

            // Query tax_rates table for applicable rates
            // Priority: city > county > state (more specific rates override general ones)
            const { data: taxRates, error } = await supabase
                .from('tax_rates')
                .select('*')
                .eq('is_active', true)
                .or(`state_id.eq.${stateId},scope.eq.state`)
                .order('scope', { ascending: false }) // city first, then county, then state

            if (error) {
                console.error('Error fetching tax rates:', error)
                return []
            }

            // Filter to only rates that apply to this location
            const applicableRates = (taxRates || []).filter(rate => {
                if (rate.scope === 'state' && rate.state_id === stateId) {
                    return true
                }
                // For county/city, we would need additional resolution
                // For now, just use state-level rates
                return rate.scope === 'state' && rate.state_id === stateId
            })

            return applicableRates
        } catch (error) {
            console.error('Error getting tax rates for address:', error)
            return []
        }
    },

    /**
     * Resolve state ID from state code or name
     */
    async resolveStateId(stateInput: string): Promise<string | null> {
        try {
            // Try to find by state code first
            const { data: byCode } = await supabase
                .from('us_states')
                .select('id')
                .eq('code', stateInput.toUpperCase())
                .single()

            if (byCode) {
                return byCode.id
            }

            // Try to find by state name
            const { data: byName } = await supabase
                .from('us_states')
                .select('id')
                .ilike('name', stateInput)
                .single()

            return byName?.id || null
        } catch {
            return null
        }
    },

    /**
     * Calculate taxable amount based on tax rate configuration
     */
    getTaxableAmount(items: TaxableItem[], rate: TaxRate): number {
        return items.reduce((sum, item) => {
            const itemTotal = item.price * item.quantity

            // Check if this item is taxable under this rate
            if (rate.applies_to === 'all') {
                return sum + itemTotal
            }

            if (rate.applies_to === 'alcohol' && item.isAlcohol) {
                return sum + itemTotal
            }

            if (rate.applies_to === 'specific_categories' && rate.categories) {
                if (item.category && rate.categories.includes(item.category)) {
                    return sum + itemTotal
                }
            }

            return sum
        }, 0)
    },

    /**
     * Get a simple tax estimate for display (before full calculation)
     * Uses a default rate if no specific rates are configured
     */
    async getEstimatedTaxRate(stateCode?: string): Promise<number> {
        if (!stateCode) {
            // Default estimate when no state is known
            return 0.08 // 8% default
        }

        try {
            const stateId = await this.resolveStateId(stateCode)
            if (!stateId) {
                return 0.08
            }

            // Get state-level sales tax
            const { data } = await supabase
                .from('tax_rates')
                .select('rate')
                .eq('state_id', stateId)
                .eq('scope', 'state')
                .eq('tax_type', 'sales')
                .eq('is_active', true)
                .limit(1)
                .single()

            return data?.rate || 0.08
        } catch {
            return 0.08
        }
    },

    /**
     * Calculate taxes for a single store's items
     */
    async calculateStoreTaxes(
        storeId: string,
        items: TaxableItem[],
        shippingAddress: ShippingAddress
    ): Promise<TaxCalculationResult> {
        // For now, use the same calculation as general
        // In the future, stores might have tax exemptions or special rates
        return this.calculateTaxes(items, shippingAddress)
    }
}

export default taxCalculationService
