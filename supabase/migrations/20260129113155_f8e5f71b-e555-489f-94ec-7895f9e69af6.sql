-- Leaderboard materialized from demo_trade_history, refreshed periodically or on-demand
CREATE TABLE IF NOT EXISTS public.copy_leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_id text,
  avatar_url text,
  full_name text,
  total_trades int NOT NULL DEFAULT 0,
  winning_trades int NOT NULL DEFAULT 0,
  win_rate numeric NOT NULL DEFAULT 0,
  total_pnl numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Allow anyone to view the leaderboard
ALTER TABLE public.copy_leaders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view leaderboard"
  ON public.copy_leaders FOR SELECT
  USING (true);

CREATE POLICY "System can upsert leaderboard"
  ON public.copy_leaders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Follow relationship: user follows a leader
CREATE TABLE IF NOT EXISTS public.copy_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  leader_id uuid NOT NULL,
  fixed_amount numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, leader_id)
);

ALTER TABLE public.copy_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their follows"
  ON public.copy_follows FOR ALL
  USING (auth.uid() = follower_id);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_copy_follows_leader ON public.copy_follows(leader_id);

-- Helper function to refresh leaderboard stats (call periodically or on demand)
CREATE OR REPLACE FUNCTION public.refresh_copy_leaders()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.copy_leaders (user_id, display_id, avatar_url, full_name, total_trades, winning_trades, win_rate, total_pnl, updated_at)
  SELECT
    h.user_id,
    p.display_id,
    p.avatar_url,
    p.full_name,
    COUNT(*)::int AS total_trades,
    SUM(CASE WHEN h.pnl > 0 THEN 1 ELSE 0 END)::int AS winning_trades,
    ROUND(100.0 * SUM(CASE WHEN h.pnl > 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS win_rate,
    COALESCE(SUM(h.pnl), 0) AS total_pnl,
    now()
  FROM public.demo_trade_history h
  JOIN public.profiles p ON p.user_id = h.user_id
  WHERE h.account_type = 'real'
  GROUP BY h.user_id, p.display_id, p.avatar_url, p.full_name
  HAVING COUNT(*) >= 5  -- min 5 trades to appear
  ON CONFLICT (user_id) DO UPDATE SET
    display_id = EXCLUDED.display_id,
    avatar_url = EXCLUDED.avatar_url,
    full_name = EXCLUDED.full_name,
    total_trades = EXCLUDED.total_trades,
    winning_trades = EXCLUDED.winning_trades,
    win_rate = EXCLUDED.win_rate,
    total_pnl = EXCLUDED.total_pnl,
    updated_at = EXCLUDED.updated_at;
END;
$$;