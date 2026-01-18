-- ============================================
-- Migration: 001_extensions_and_types
-- Description: Enable required extensions and create custom types
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================
-- ENUM TYPES
-- ============================================

-- Tenant types
CREATE TYPE tenant_type AS ENUM ('owner_store', 'delivery_company');
CREATE TYPE tenant_status AS ENUM ('pending', 'active', 'suspended', 'inactive');
CREATE TYPE stripe_account_status AS ENUM ('pending', 'onboarding', 'active', 'restricted', 'disabled');

-- Membership
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'manager', 'employee');

-- Products & Inventory
CREATE TYPE promotion_type AS ENUM ('percentage', 'fixed', 'buy_x_get_y', 'bundle', 'mix_match');
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed', 'free_shipping');
CREATE TYPE inventory_movement_type AS ENUM (
    'purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'damage'
);

-- Orders
CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
    'completed',
    'cancelled',
    'refunded'
);
CREATE TYPE fulfillment_type AS ENUM ('delivery', 'pickup');

-- Delivery
CREATE TYPE delivery_status AS ENUM (
    'pending',
    'assigned',
    'picked_up',
    'in_transit',
    'delivered',
    'failed',
    'cancelled'
);

-- Taxes & Fees
CREATE TYPE tax_scope AS ENUM ('state', 'county', 'city');
CREATE TYPE fee_scope AS ENUM ('global', 'state');

-- Platform Admin
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'support', 'finance');
