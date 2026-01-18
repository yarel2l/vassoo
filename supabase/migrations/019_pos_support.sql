-- Migration: Add POS support columns to orders
-- POS sales may not have a registered customer, so we need optional guest info

-- Make customer_id nullable for POS orders
ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;

-- Add guest customer info for POS/walk-in sales
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- Add payment info for POS
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT; -- 'cash', 'card', 'stripe'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'; -- 'pending', 'paid', 'failed'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_received DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_due DECIMAL(10,2);

-- Add order source tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'online'; -- 'online', 'pos', 'phone'

-- Add constraint: either customer_id or guest_name must be provided
-- (Commenting out as this might cause issues with existing data)
-- ALTER TABLE orders ADD CONSTRAINT chk_customer_or_guest 
--     CHECK (customer_id IS NOT NULL OR guest_name IS NOT NULL);

-- Update order_items to allow nullable inventory_id for custom items
ALTER TABLE order_items ALTER COLUMN inventory_id DROP NOT NULL;
