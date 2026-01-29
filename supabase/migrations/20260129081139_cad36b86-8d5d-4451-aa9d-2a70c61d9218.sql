-- Create table for demo trading positions
CREATE TABLE public.demo_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  pnl NUMERIC NOT NULL DEFAULT 0,
  pnl_percent NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated')),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  close_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for trade history
CREATE TABLE public.demo_trade_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  position_id UUID REFERENCES public.demo_positions(id),
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1,
  pnl NUMERIC NOT NULL,
  pnl_percent NUMERIC NOT NULL,
  duration_seconds INTEGER,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  close_reason TEXT
);

-- Create table for demo wallet balance
CREATE TABLE public.demo_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 10000,
  total_pnl NUMERIC NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI market signals
CREATE TABLE public.ai_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'hold')),
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  entry_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  analysis TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_signals ENABLE ROW LEVEL SECURITY;

-- Policies for demo_positions
CREATE POLICY "Users can view their own positions" ON public.demo_positions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own positions" ON public.demo_positions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own positions" ON public.demo_positions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own positions" ON public.demo_positions
FOR DELETE USING (auth.uid() = user_id);

-- Policies for demo_trade_history
CREATE POLICY "Users can view their own trade history" ON public.demo_trade_history
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trade history" ON public.demo_trade_history
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for demo_wallets
CREATE POLICY "Users can view their own demo wallet" ON public.demo_wallets
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own demo wallet" ON public.demo_wallets
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own demo wallet" ON public.demo_wallets
FOR UPDATE USING (auth.uid() = user_id);

-- Policies for ai_signals (everyone can view)
CREATE POLICY "Everyone can view active signals" ON public.ai_signals
FOR SELECT USING (expires_at > now());

CREATE POLICY "Admins can manage signals" ON public.ai_signals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger for demo_wallets
CREATE TRIGGER update_demo_wallets_updated_at
BEFORE UPDATE ON public.demo_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();