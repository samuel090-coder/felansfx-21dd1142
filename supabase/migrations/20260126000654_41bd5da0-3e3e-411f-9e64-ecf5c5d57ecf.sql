-- Add video_url column to pro_content for video embeds
ALTER TABLE public.pro_content 
ADD COLUMN video_url TEXT;

-- Create daily_signals table for trading signals
CREATE TABLE public.daily_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  entry_price TEXT NOT NULL,
  stop_loss TEXT NOT NULL,
  take_profit TEXT NOT NULL,
  risk_reward TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hit_tp', 'hit_sl', 'cancelled')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create market_news table for forex news
CREATE TABLE public.market_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  news_type TEXT NOT NULL DEFAULT 'news' CHECK (news_type IN ('news', 'calendar', 'insight')),
  importance TEXT DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high')),
  source TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_signals
CREATE POLICY "Admins can manage daily signals" 
ON public.daily_signals 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active daily signals" 
ON public.daily_signals 
FOR SELECT 
USING (is_active = true);

-- RLS policies for market_news
CREATE POLICY "Admins can manage market news" 
ON public.market_news 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active market news" 
ON public.market_news 
FOR SELECT 
USING (is_active = true);

-- Add triggers for updated_at
CREATE TRIGGER update_daily_signals_updated_at
BEFORE UPDATE ON public.daily_signals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_news_updated_at
BEFORE UPDATE ON public.market_news
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();