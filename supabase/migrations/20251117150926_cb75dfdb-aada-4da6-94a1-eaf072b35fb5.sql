-- Add language and accent preferences to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN voice_language text DEFAULT 'en',
ADD COLUMN voice_accent text DEFAULT 'en-US';