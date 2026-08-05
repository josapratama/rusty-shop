-- ============================================================
-- Online Shop - Seed Data
-- ============================================================

-- ── Users ─────────────────────────────────────────────────
-- Admin (password: admin123)
-- Hash dihasilkan oleh bcrypt Rust (bcrypt v0.15, cost=12)
INSERT INTO users (id, name, email, password, phone, role) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'Admin',
    'admin@shop.com',
    '$2b$12$VuNilhIBWSOcSC8/.ve9nuTeMsG7NZggCifMHkKhJMIcpbKoj6NMm',
    '081234567890',
    'admin'
)
ON CONFLICT (id) DO NOTHING;

-- User (password: user123)
INSERT INTO users (id, name, email, password, phone, role) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'Budi Santoso',
    'budi@example.com',
    '$2b$12$Wozd8nhxJ/.iqBf0r2AWzejwR9frLW3Xc8PMMM1U8CRAyvZj6/tAm',
    '082345678901',
    'user'
)
ON CONFLICT (id) DO NOTHING;

-- ── Categories ────────────────────────────────────────────
INSERT INTO categories (id, name, slug, description, is_active) VALUES
('c0000000-0000-0000-0000-000000000001', 'Elektronik',        'elektronik',       'Produk elektronik dan gadget',             TRUE),
('c0000000-0000-0000-0000-000000000002', 'Pakaian',           'pakaian',          'Pakaian pria dan wanita',                  TRUE),
('c0000000-0000-0000-0000-000000000003', 'Makanan & Minuman', 'makanan-minuman',  'Produk makanan dan minuman',               TRUE),
('c0000000-0000-0000-0000-000000000004', 'Peralatan Rumah',   'peralatan-rumah',  'Peralatan dan perlengkapan rumah tangga',  TRUE),
('c0000000-0000-0000-0000-000000000005', 'Olahraga',          'olahraga',         'Perlengkapan olahraga dan fitness',        TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── Products ─────────────────────────────────────────────
INSERT INTO products (id, category_id, name, slug, description, price, stock, weight, is_active) VALUES
-- Elektronik
('212be729-67d4-4661-ba0d-062cf8f42967', 'c0000000-0000-0000-0000-000000000001',
 'Smartphone Android 6.5 inch', 'smartphone-android-65-inch',
 'Smartphone dengan layar 6.5 inch, RAM 8GB, storage 128GB, kamera 50MP.',
 2999000, 50, 200, TRUE),

('d669c119-dc85-42a1-9cd4-d60b9a8fbf91', 'c0000000-0000-0000-0000-000000000001',
 'Earphone Wireless Bluetooth', 'earphone-wireless-bluetooth',
 'Earphone wireless dengan koneksi Bluetooth 5.0, battery 24 jam, noise cancelling.',
 299000, 100, 50, TRUE),

('738d7832-84e4-45ee-b0f1-8bbb29fc2fab', 'c0000000-0000-0000-0000-000000000001',
 'Laptop Gaming 15 inch', 'laptop-gaming-15-inch',
 'Laptop gaming dengan processor Intel i7, RAM 16GB, GPU RTX 4060, layar 144Hz.',
 12999000, 20, 2200, TRUE),

('9004412c-74e5-41c3-bc77-cd2bf3bac04b', 'c0000000-0000-0000-0000-000000000001',
 'Smartwatch Fitness Tracker', 'smartwatch-fitness-tracker',
 'Smartwatch dengan monitor detak jantung, GPS, tahan air 50m, battery 7 hari.',
 599000, 75, 45, TRUE),

('7e847d07-9c8e-4884-9b32-8bfaa3a67be9', 'c0000000-0000-0000-0000-000000000001',
 'Power Bank 20000mAh', 'power-bank-20000mah',
 'Power bank kapasitas 20000mAh, 2 port USB + USB-C, fast charging 22.5W.',
 179000, 120, 450, TRUE),

-- Pakaian
('907037d6-c726-4b87-914e-3fc7879eff62', 'c0000000-0000-0000-0000-000000000002',
 'Kaos Polos Premium Cotton', 'kaos-polos-premium-cotton',
 'Kaos polos berbahan cotton combed 30s, tersedia berbagai warna dan ukuran.',
 89000, 200, 150, TRUE),

('d39d9c1e-ed67-42b4-8f81-0c4f168e8914', 'c0000000-0000-0000-0000-000000000002',
 'Celana Chino Slim Fit', 'celana-chino-slim-fit',
 'Celana chino slim fit berbahan katun stretch, nyaman dipakai seharian.',
 189000, 80, 400, TRUE),

('b4a6801f-965e-4034-8e40-4e1785512f7e', 'c0000000-0000-0000-0000-000000000002',
 'Jaket Hoodie Fleece', 'jaket-hoodie-fleece',
 'Hoodie berbahan fleece tebal, hangat dan nyaman, tersedia berbagai warna.',
 249000, 90, 500, TRUE),

('b7ee6d68-11f5-4395-a216-140ce7db61a3', 'c0000000-0000-0000-0000-000000000002',
 'Sepatu Sneakers Casual', 'sepatu-sneakers-casual',
 'Sneakers casual dengan bahan canvas, sol karet anti slip, tersedia ukuran 38-44.',
 329000, 60, 800, TRUE),

-- Makanan & Minuman
('fe2403a3-fc05-47ed-9e2e-01c190d7b6fc', 'c0000000-0000-0000-0000-000000000003',
 'Kopi Arabika Gayo 250gr', 'kopi-arabika-gayo-250gr',
 'Kopi arabika single origin dari Gayo, Aceh. Roast level medium.',
 75000, 150, 250, TRUE),

('e7fb1cb0-6469-48ac-9673-6b894635f363', 'c0000000-0000-0000-0000-000000000003',
 'Teh Hijau Organik 100gr', 'teh-hijau-organik-100gr',
 'Teh hijau organik dari pegunungan, kaya antioksidan, tanpa pestisida.',
 45000, 200, 100, TRUE),

('f83c25d4-0002-4bcd-98fa-3af09625508f', 'c0000000-0000-0000-0000-000000000003',
 'Madu Hutan Asli 500gr', 'madu-hutan-asli-500gr',
 'Madu hutan murni langsung dari lebah liar, tanpa campuran, tersertifikasi.',
 125000, 80, 500, TRUE),

-- Peralatan Rumah
('1093ee19-4fc9-4612-878d-059a8d548b7c', 'c0000000-0000-0000-0000-000000000004',
 'Blender Portable 350ml', 'blender-portable-350ml',
 'Blender portable dengan kapasitas 350ml, bisa diisi ulang via USB.',
 149000, 60, 500, TRUE),

('bcce3a18-84df-4315-99a8-0368c9099cc1', 'c0000000-0000-0000-0000-000000000004',
 'Rak Buku Minimalis 5 Tier', 'rak-buku-minimalis-5-tier',
 'Rak buku 5 tingkat dari bahan MDF premium, desain minimalis modern.',
 459000, 25, 8000, TRUE),

('c0ae7261-8302-4c22-b140-31cf2977b6d7', 'c0000000-0000-0000-0000-000000000004',
 'Lampu LED Meja Belajar', 'lampu-led-meja-belajar',
 'Lampu meja LED dengan 3 mode cahaya, redupkan layar, port USB untuk charging.',
 89000, 110, 350, TRUE),

-- Olahraga
('4ad446b0-fafe-4fe1-ba11-deb4ef78ec40', 'c0000000-0000-0000-0000-000000000005',
 'Matras Yoga Anti Slip 6mm', 'matras-yoga-anti-slip-6mm',
 'Matras yoga tebal 6mm, bahan TPE ramah lingkungan, anti slip.',
 199000, 40, 1200, TRUE),

('cfdcc3d2-6912-4b00-aab6-bbc675f94c16', 'c0000000-0000-0000-0000-000000000005',
 'Dumbell Set 5kg Pair', 'dumbell-set-5kg-pair',
 'Sepasang dumbbell 5kg dengan pegangan anti slip, cocok untuk latihan di rumah.',
 189000, 45, 10000, TRUE),

('76373005-239f-4008-85e0-4187bac03281', 'c0000000-0000-0000-0000-000000000005',
 'Resistance Band Set 5 Level', 'resistance-band-set-5-level',
 'Set resistance band 5 tingkat kekuatan, latex premium, cocok untuk stretching dan latihan.',
 79000, 130, 200, TRUE)

ON CONFLICT (id) DO NOTHING;

-- ── Product Images ────────────────────────────────────────
INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES
('212be729-67d4-4661-ba0d-062cf8f42967', 'https://placehold.co/600x600/4f46e5/white?text=Smartphone',    TRUE, 0),
('d669c119-dc85-42a1-9cd4-d60b9a8fbf91', 'https://placehold.co/600x600/7c3aed/white?text=Earphone',       TRUE, 0),
('738d7832-84e4-45ee-b0f1-8bbb29fc2fab', 'https://placehold.co/600x600/1e1b4b/white?text=Laptop',         TRUE, 0),
('9004412c-74e5-41c3-bc77-cd2bf3bac04b', 'https://placehold.co/600x600/0f766e/white?text=Smartwatch',     TRUE, 0),
('7e847d07-9c8e-4884-9b32-8bfaa3a67be9', 'https://placehold.co/600x600/b45309/white?text=PowerBank',      TRUE, 0),
('907037d6-c726-4b87-914e-3fc7879eff62', 'https://placehold.co/600x600/059669/white?text=Kaos',            TRUE, 0),
('d39d9c1e-ed67-42b4-8f81-0c4f168e8914', 'https://placehold.co/600x600/2563eb/white?text=Celana',          TRUE, 0),
('b4a6801f-965e-4034-8e40-4e1785512f7e', 'https://placehold.co/600x600/374151/white?text=Hoodie',          TRUE, 0),
('b7ee6d68-11f5-4395-a216-140ce7db61a3', 'https://placehold.co/600x600/6b7280/white?text=Sneakers',        TRUE, 0),
('fe2403a3-fc05-47ed-9e2e-01c190d7b6fc', 'https://placehold.co/600x600/92400e/white?text=Kopi',            TRUE, 0),
('e7fb1cb0-6469-48ac-9673-6b894635f363', 'https://placehold.co/600x600/15803d/white?text=TehHijau',        TRUE, 0),
('f83c25d4-0002-4bcd-98fa-3af09625508f', 'https://placehold.co/600x600/d97706/white?text=Madu',            TRUE, 0),
('1093ee19-4fc9-4612-878d-059a8d548b7c', 'https://placehold.co/600x600/dc2626/white?text=Blender',         TRUE, 0),
('bcce3a18-84df-4315-99a8-0368c9099cc1', 'https://placehold.co/600x600/78350f/white?text=RakBuku',         TRUE, 0),
('c0ae7261-8302-4c22-b140-31cf2977b6d7', 'https://placehold.co/600x600/fbbf24/333?text=LampuLED',          TRUE, 0),
('4ad446b0-fafe-4fe1-ba11-deb4ef78ec40', 'https://placehold.co/600x600/16a34a/white?text=Matras',          TRUE, 0),
('cfdcc3d2-6912-4b00-aab6-bbc675f94c16', 'https://placehold.co/600x600/1f2937/white?text=Dumbell',         TRUE, 0),
('76373005-239f-4008-85e0-4187bac03281', 'https://placehold.co/600x600/be123c/white?text=ResistanceBand',  TRUE, 0)
ON CONFLICT DO NOTHING;
