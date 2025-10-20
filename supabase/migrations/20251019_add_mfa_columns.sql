-- Migration: Add MFA columns to profiles table
-- Up: add columns mfa_code, mfa_expires_at, mfa_verified
-- Down: remove columns

-- Up
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mfa_code text,
ADD COLUMN IF NOT EXISTS mfa_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS mfa_verified boolean DEFAULT false;

-- Down (to revert):
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS mfa_code;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS mfa_expires_at;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS mfa_verified;
