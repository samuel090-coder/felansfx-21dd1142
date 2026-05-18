
-- 1. Reset trading difficulty to a sane default
UPDATE public.app_settings SET value = '50', updated_at = now() WHERE key = 'trading_difficulty';

-- 2. Refund affected users: credit wallets with full win payout (stake * 1.84)
WITH affected AS (
  SELECT user_id, SUM(amount * 1.84) AS credit
  FROM public.demo_trade_history
  WHERE account_type = 'real'
    AND pnl < 0
    AND close_reason IS DISTINCT FROM 'corrected_admin_refund'
    AND (
      (trade_type = 'buy' AND exit_price > entry_price)
      OR (trade_type = 'sell' AND exit_price < entry_price)
    )
  GROUP BY user_id
)
UPDATE public.wallets w
SET balance = w.balance + a.credit, updated_at = now()
FROM affected a
WHERE w.user_id = a.user_id;

-- 3. Update affected trade history to reflect correct win outcome
UPDATE public.demo_trade_history
SET pnl = amount * 0.84,
    pnl_percent = 84,
    close_reason = 'corrected_admin_refund'
WHERE account_type = 'real'
  AND pnl < 0
  AND close_reason IS DISTINCT FROM 'corrected_admin_refund'
  AND (
    (trade_type = 'buy' AND exit_price > entry_price)
    OR (trade_type = 'sell' AND exit_price < entry_price)
  );
