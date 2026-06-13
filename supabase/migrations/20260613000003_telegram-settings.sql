-- Add Telegram bot configuration to site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS telegram_bot_token text,
  ADD COLUMN IF NOT EXISTS telegram_chat_id    text;
