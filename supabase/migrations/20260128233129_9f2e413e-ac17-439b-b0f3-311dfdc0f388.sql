-- Remove admin_passcode from app_settings as it's no longer needed
-- The app now uses role-based authentication via user_roles table
DELETE FROM public.app_settings WHERE key = 'admin_passcode';