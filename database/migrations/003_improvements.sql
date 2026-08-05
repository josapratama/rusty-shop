-- ============================================================
-- Migration 003: Improvements
-- - Add password_changed_at to users (for JWT invalidation)
-- - Add shipping_cost_per_gram config (for weight-based shipping)
-- ============================================================

-- #10: Track when password was last changed so old JWTs can be invalidated
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- #14: Store flat shipping rate per gram (default: Rp 0.5/gram = Rp 500/kg)
-- This can be updated as needed; stored as config row for flexibility
CREATE TABLE IF NOT EXISTS shop_config (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO shop_config (key, value) VALUES
    ('shipping_cost_per_gram', '0.5')   -- Rp 0.5 per gram
ON CONFLICT (key) DO NOTHING;
