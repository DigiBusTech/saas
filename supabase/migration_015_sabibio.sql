
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS SabiBio_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS SabiBio_template_id VARCHAR(50) DEFAULT 'tech-minimal',
ADD COLUMN IF NOT EXISTS SabiBio_branding JSONB DEFAULT '{
  "primary_color": "#6366f1",
  "background_color": "#ffffff",
  "font_family": "inter",
  "avatar_url": null,
  "bio": "",
  "custom_css": ""
}'::jsonb,
ADD COLUMN IF NOT EXISTS SabiBio_links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS SabiBio_channels JSONB DEFAULT '{
  "web_chat_enabled": true,
  "whatsapp_enabled": false,
  "telegram_enabled": false,
  "default_welcome_msg": "Hi there! How can I help you today?"
}'::jsonb,
ADD COLUMN IF NOT EXISTS SabiBio_socials JSONB DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_sabibio_slug_unique
ON public.workspaces (slug);

ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS SabiBio_products JSONB DEFAULT '[]'::jsonb;
