-- ============================================
-- Migration: 016_dynamic_taxonomy_and_storage
-- Description: Dynamic categories, brands and product storage
-- ============================================

-- 1. MASTER CATEGORIES
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES public.product_categories(id),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MASTER BRANDS
CREATE TABLE IF NOT EXISTS public.product_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update master_products to use foreign keys (optional but recommended)
-- For now, we keep the text columns for compatibility but add optional FKs
ALTER TABLE public.master_products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.product_categories(id),
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.product_brands(id);

-- 4. STORAGE BUCKET (SQL setup for Supabase Storage)
-- Note: This requires the storage extension and proper permissions
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');

-- 5. SEED INITIAL TAXONOMY
INSERT INTO public.product_categories (name, slug) VALUES 
('Spirits', 'spirits'),
('Wine', 'wine'),
('Beer', 'beer'),
('Mixers', 'mixers'),
('Accessories', 'accessories')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.product_brands (name, slug) VALUES 
('Johnnie Walker', 'johnnie-walker'),
('Grey Goose', 'grey-goose'),
('Casamigos', 'casamigos'),
('Moët & Chandon', 'moet-chandon'),
('Stella Artois', 'stella-artois')
ON CONFLICT (name) DO NOTHING;
