-- ============================================================
-- Migration 005: Store Settings Configuration
-- ============================================================

INSERT INTO shop_config (key, value)
VALUES
    ('shipping_cost_per_gram', '0.5'),
    ('shop_name', 'Rusty Shop'),
    ('whatsapp_number', '6281234567890'),
    ('bank_accounts', '[{"bank":"BCA","account_number":"1234567890","holder_name":"Rusty Shop"},{"bank":"Mandiri","account_number":"9876543210","holder_name":"Rusty Shop"}]')
ON CONFLICT (key) DO NOTHING;
