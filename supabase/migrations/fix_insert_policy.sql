-- ============================================
-- Fix INSERT policy for tenants - more permissive
-- Run this in Supabase SQL Editor
-- ============================================

-- First, let's see all current policies on tenants
-- SELECT * FROM pg_policies WHERE tablename = 'tenants';

-- Drop any existing INSERT policies that might conflict
DROP POLICY IF EXISTS "Anyone can create a tenant (for onboarding)" ON tenants;
DROP POLICY IF EXISTS "Authenticated users can create tenant during onboarding" ON tenants;
DROP POLICY IF EXISTS "Authenticated users can create tenant" ON tenants;

-- Create a simple, permissive INSERT policy for authenticated users
CREATE POLICY "Allow authenticated users to create tenants"
ON tenants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure the ALL policy for platform admins doesn't block inserts
-- by making the INSERT policy more specific
