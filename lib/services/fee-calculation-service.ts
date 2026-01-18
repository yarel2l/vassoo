/**
 * Fee Calculation Service
 *
 * Calculates platform fees dynamically based on:
 * - Configured fee rules from platform_fees table
 * - Order location (state-specific overrides)
 * - Order amount (for tiered fees)
 * - Fee type (marketplace_commission, processing_fee, delivery_platform_fee)
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for server-side use
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface PlatformFee {
    id: string
    scope: 'global' | 'state'
    state_id: string | null
    name: string
    fee_type: 'marketplace_commission' | 'processing_fee' | 'delivery_platform_fee' | string
    calculation_type: 'percentage' | 'fixed' | 'tiered'
    value: number // For percentage (0.10 = 10%) or fixed amount
    tiers: Array<{ min: number; max: number | null; rate: number }> | null
    is_active: boolean
}

export interface FeeCalculationResult {
    marketplaceCommission: number
    marketplaceCommissionRate: number
    processingFee: number
    processingFeeRate: number
    deliveryPlatformFee: number
    totalPlatformFees: number
    feeBreakdown: Array<{
        name: string
        type: string
        amount: number
        rate?: number
    }>
}

// Cache for fee configurations (5 minute TTL)
let feeCache: { fees: PlatformFee[]; timestamp: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export const feeCalculationService = {
    /**
     * Get all active platform fees (with caching)
     */
    async getActiveFees(): Promise<PlatformFee[]> {
        // Check cache
        if (feeCache && Date.now() - feeCache.timestamp < CACHE_TTL_MS) {
            return feeCache.fees
        }

        try {
            const { data, error } = await supabase
                .from('platform_fees')
                .select('*')
                .eq('is_active', true)
                .or('effective_date.lte.now(),effective_date.is.null')
                .or('end_date.gte.now(),end_date.is.null')

            if (error) {
                console.error('Error fetching platform fees:', error)
                return []
            }

            const fees = data || []
            feeCache = { fees, timestamp: Date.now() }
            return fees
        } catch (error) {
            console.error('Error in getActiveFees:', error)
            return []
        }
    },

    /**
     * Invalidate the fee cache (call when fees are updated)
     */
    invalidateCache(): void {
        feeCache = null
    },

    /**
     * Calculate all platform fees for an order
     */
    async calculateFees(
        orderAmount: number,
        stateCode?: string
    ): Promise<FeeCalculationResult> {
        const fees = await this.getActiveFees()
        const stateId = stateCode ? await this.resolveStateId(stateCode) : null

        const feeBreakdown: FeeCalculationResult['feeBreakdown'] = []
        let marketplaceCommission = 0
        let marketplaceCommissionRate = 0
        let processingFee = 0
        let processingFeeRate = 0
        let deliveryPlatformFee = 0

        // Group fees by type and prioritize state-specific over global
        const feesByType = new Map<string, PlatformFee>()

        for (const fee of fees) {
            const existing = feesByType.get(fee.fee_type)

            // State-specific fee takes priority over global
            if (!existing) {
                feesByType.set(fee.fee_type, fee)
            } else if (fee.scope === 'state' && fee.state_id === stateId) {
                feesByType.set(fee.fee_type, fee)
            }
        }

        // Calculate each fee type
        for (const [feeType, fee] of feesByType) {
            const calculatedFee = this.calculateSingleFee(fee, orderAmount)

            feeBreakdown.push({
                name: fee.name,
                type: feeType,
                amount: calculatedFee.amount,
                rate: calculatedFee.rate
            })

            switch (feeType) {
                case 'marketplace_commission':
                    marketplaceCommission = calculatedFee.amount
                    marketplaceCommissionRate = calculatedFee.rate || 0
                    break
                case 'processing_fee':
                    processingFee = calculatedFee.amount
                    processingFeeRate = calculatedFee.rate || 0
                    break
                case 'delivery_platform_fee':
                    deliveryPlatformFee = calculatedFee.amount
                    break
            }
        }

        const totalPlatformFees = marketplaceCommission + processingFee + deliveryPlatformFee

        return {
            marketplaceCommission: Math.round(marketplaceCommission * 100) / 100,
            marketplaceCommissionRate,
            processingFee: Math.round(processingFee * 100) / 100,
            processingFeeRate,
            deliveryPlatformFee: Math.round(deliveryPlatformFee * 100) / 100,
            totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
            feeBreakdown
        }
    },

    /**
     * Calculate a single fee based on its configuration
     */
    calculateSingleFee(
        fee: PlatformFee,
        amount: number
    ): { amount: number; rate?: number } {
        switch (fee.calculation_type) {
            case 'percentage':
                return {
                    amount: amount * fee.value,
                    rate: fee.value
                }

            case 'fixed':
                return {
                    amount: fee.value
                }

            case 'tiered':
                if (!fee.tiers || fee.tiers.length === 0) {
                    return { amount: 0 }
                }

                // Find applicable tier
                for (const tier of fee.tiers) {
                    if (amount >= tier.min && (tier.max === null || amount <= tier.max)) {
                        return {
                            amount: amount * tier.rate,
                            rate: tier.rate
                        }
                    }
                }

                // Default to first tier if no match
                return {
                    amount: amount * fee.tiers[0].rate,
                    rate: fee.tiers[0].rate
                }

            default:
                return { amount: 0 }
        }
    },

    /**
     * Resolve state ID from state code
     */
    async resolveStateId(stateCode: string): Promise<string | null> {
        try {
            const { data } = await supabase
                .from('us_states')
                .select('id')
                .eq('code', stateCode.toUpperCase())
                .single()

            return data?.id || null
        } catch {
            return null
        }
    },

    /**
     * Get the marketplace commission rate (for display purposes)
     * Returns as percentage (e.g., 10 for 10%)
     */
    async getMarketplaceCommissionRate(stateCode?: string): Promise<number> {
        const fees = await this.getActiveFees()
        const stateId = stateCode ? await this.resolveStateId(stateCode) : null

        // Find marketplace commission fee
        let commissionFee: PlatformFee | undefined

        for (const fee of fees) {
            if (fee.fee_type === 'marketplace_commission') {
                if (!commissionFee) {
                    commissionFee = fee
                } else if (fee.scope === 'state' && fee.state_id === stateId) {
                    commissionFee = fee
                }
            }
        }

        if (!commissionFee) {
            return 10 // Default 10%
        }

        // Return as percentage (multiply by 100)
        return commissionFee.value * 100
    },

    /**
     * Calculate the amount to transfer to a store after platform fees
     */
    async calculateStoreTransferAmount(
        storeTotal: number,
        stateCode?: string
    ): Promise<{
        originalAmount: number
        platformFee: number
        transferAmount: number
        feeRate: number
    }> {
        const feeResult = await this.calculateFees(storeTotal, stateCode)

        // For store transfers, we only deduct marketplace commission
        const platformFee = feeResult.marketplaceCommission
        const transferAmount = storeTotal - platformFee

        return {
            originalAmount: storeTotal,
            platformFee: Math.round(platformFee * 100) / 100,
            transferAmount: Math.round(transferAmount * 100) / 100,
            feeRate: feeResult.marketplaceCommissionRate
        }
    }
}

export default feeCalculationService
