-- ============================================================
-- Migration 004: New Features & Improvements
-- 1. Order tracking: courier & tracking_number
-- 2. Product discount: original_price
-- 3. Coupons & Promotions: coupons table & order coupon fields
-- 4. Product Reviews & Ratings: reviews table
-- 5. User Wishlist: wishlists table
-- ============================================================

-- 1. Order Shipping Tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);

-- 2. Product Strike-through Price (Original Price)
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price NUMERIC(15, 2);

-- 3. Coupons & Promotions
CREATE TABLE IF NOT EXISTS coupons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    discount_type   VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value  NUMERIC(15, 2) NOT NULL CHECK (discount_value > 0),
    min_purchase    NUMERIC(15, 2) NOT NULL DEFAULT 0,
    max_discount    NUMERIC(15, 2),
    usage_limit     INTEGER,
    used_count      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0;

-- 4. Product Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
    rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, user_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

-- 5. User Wishlists
CREATE TABLE IF NOT EXISTS wishlists (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product ON wishlists(product_id);

-- 6. Sample Initial Coupons
INSERT INTO coupons (code, description, discount_type, discount_value, min_purchase, usage_limit, is_active)
VALUES
    ('DISKON10', 'Diskon 10% untuk semua produk (min. belanja Rp 50.000)', 'percentage', 10, 50000, 100, true),
    ('HEMAT20RB', 'Potongan Rp 20.000 (min. belanja Rp 100.000)', 'fixed', 20000, 100000, 50, true)
ON CONFLICT (code) DO NOTHING;

