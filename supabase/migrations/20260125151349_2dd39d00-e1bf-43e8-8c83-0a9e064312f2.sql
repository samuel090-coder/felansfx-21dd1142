-- Create recommended_tools table for admin-managed carousel cards
CREATE TABLE public.recommended_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  redirect_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recommended_tools ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active recommended tools"
ON public.recommended_tools FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage recommended tools"
ON public.recommended_tools FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create daily_streak_settings table for the pro membership unlock content
CREATE TABLE public.daily_streak_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Unlock Curated Daily Analysis',
  subtitle TEXT NOT NULL DEFAULT 'Access high-conviction setups, generate your own with AI, and keep momentum with live carry-overs.',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlight_text TEXT DEFAULT 'Pro members act faster, risk better, and stay focused on A-setups.',
  unlock_price NUMERIC NOT NULL DEFAULT 5000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_streak_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active daily streak settings"
ON public.daily_streak_settings FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage daily streak settings"
ON public.daily_streak_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create screenshot_guide_content table for admin-managed guide content
CREATE TABLE public.screenshot_guide_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_type TEXT NOT NULL CHECK (section_type IN ('header', 'good_example', 'bad_example', 'checklist_item')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  icon_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.screenshot_guide_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active screenshot guide content"
ON public.screenshot_guide_content FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage screenshot guide content"
ON public.screenshot_guide_content FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create subscription_plans table for the insufficient balance modal
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  description TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  discount_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active subscription plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
ON public.subscription_plans FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create pro_content table for unlocked daily streak content
CREATE TABLE public.pro_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pro_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only users who have unlocked can view
CREATE POLICY "Admins can manage pro content"
ON public.pro_content FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view active pro content"
ON public.pro_content FOR SELECT
USING (is_active = true);

-- Create user_unlocks table to track who unlocked daily streak
CREATE TABLE public.user_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unlock_type TEXT NOT NULL DEFAULT 'daily_streak',
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, unlock_type)
);

-- Enable RLS
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own unlocks"
ON public.user_unlocks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocks"
ON public.user_unlocks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all unlocks"
ON public.user_unlocks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default daily streak settings
INSERT INTO public.daily_streak_settings (title, subtitle, features, highlight_text, unlock_price)
VALUES (
  'Unlock Curated Daily Analysis',
  'Access high-conviction setups, generate your own with AI, and keep momentum with live carry-overs.',
  '[
    {"emoji": "📈", "text": "Fresh daily setups (entries, SL & TP)"},
    {"emoji": "⚡", "text": "Performance & live carry-overs"},
    {"emoji": "🤖", "text": "One-tap AI analysis tailored to you"},
    {"emoji": "🚀", "text": "Priority features & improvements"}
  ]'::jsonb,
  'Pro members act faster, risk better, and stay focused on A-setups.',
  5000
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, price, description, is_featured, discount_text, display_order)
VALUES 
  ('Monthly', 19900, 'Full access for 30 days', true, 'Save 50% immediately', 1),
  ('Weekly', 13000, 'Weekly plan', false, 'weekly plan', 2);

-- Insert default screenshot guide content
INSERT INTO public.screenshot_guide_content (section_type, title, description, display_order)
VALUES 
  ('header', 'Wait.. How to get the cleanest, most accurate analysis', 'A clear screenshot helps Fxlens read your charts precisely and return stronger entries, SL, and TP.', 1),
  ('good_example', 'Ideal Screenshot', 'Candles are crisp, wicks visible, and enough history is shown to understand recent market structure.', 2),
  ('bad_example', 'Avoid This', 'Blurry or over-compressed. Wicks/bodies hidden or no recent context — Fxlens can''t read structure well.', 3),
  ('checklist_item', 'Show recent price action', 'Include a slice of history so Fxlens can read swing highs/lows, structure shifts, and nearby levels.', 4),
  ('checklist_item', 'Keep candles & wicks legible', 'Avoid blur/glare and heavy overlays. Body and wick detail must be visible.', 5),
  ('checklist_item', 'Balanced zoom', 'Don''t over-zoom or zoom out too far. Natural scale shows momentum and structure.', 6),
  ('checklist_item', 'Capture both timeframes cleanly', 'If analyzing 4H + 15M, capture each clearly with matching pair symbols/timestamps.', 7);

-- Insert sample recommended tools
INSERT INTO public.recommended_tools (title, description, redirect_url, display_order)
VALUES 
  ('Trading Strategies', 'Learn proven trading strategies that work', '/patterns', 1),
  ('Chart Patterns Guide', 'Master chart patterns for better entries', '/patterns', 2);

-- Trigger for updated_at
CREATE TRIGGER update_recommended_tools_updated_at
BEFORE UPDATE ON public.recommended_tools
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_streak_settings_updated_at
BEFORE UPDATE ON public.daily_streak_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_screenshot_guide_content_updated_at
BEFORE UPDATE ON public.screenshot_guide_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pro_content_updated_at
BEFORE UPDATE ON public.pro_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();