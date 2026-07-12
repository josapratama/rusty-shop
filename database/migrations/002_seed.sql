-- ============================================================
-- Online Shop - Seed Data
-- Password: admin123 (bcrypt hash)
-- ============================================================

-- Admin user (password: admin123)
INSERT INTO users (id, name, email, password, phone, role) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'Admin',
    'admin@shop.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2i',
    '081234567890',
    'admin'
);

-- Sample user (password: user123)
INSERT INTO users (id, name, email, password, phone, role) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'Budi Santoso',
    'budi@example.com',
    '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '082345678901',
    'user'
);

-- Categories
INSERT INTO categories (id, name, slug, description, is_active) VALUES
('c0000000-0000-0000-0000-000000000001', 'Elektronik', 'elektronik', 'Produk elektronik dan gadget', TRUE),
('c0000000-0000-0000-0000-000000000002', 'Pakaian', 'pakaian', 'Pakaian pria dan wanita', TRUE),
('c0000000-0000-0000-0000-000000000003', 'Makanan & Minuman', 'makanan-minuman', 'Produk makanan dan minuman', TRUE),
('c0000000-0000-0000-0000-000000000004', 'Peralatan Rumah', 'peralatan-rumah', 'Peralatan dan perlengkapan rumah tangga', TRUE),
('c0000000-0000-0000-0000-000000000005', 'Olahraga', 'olahraga', 'Perlengkapan olahraga dan fitness', TRUE);

-- Products
INSERT INTO products (id, category_id, name, slug, description, price, stock, weight, is_active) VALUES
(
    'p0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Smartphone Android 6.5 inch',
    'smartphone-android-65-inch',
    'Smartphone dengan layar 6.5 inch, RAM 8GB, storage 128GB, kamera 50MP.',
    2999000,
    50,
    200,
    TRUE
),
(
    'p0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'Earphone Wireless Bluetooth',
    'earphone-wireless-bluetooth',
    'Earphone wireless dengan koneksi Bluetooth 5.0, battery 24 jam, noise cancelling.',
    299000,
    100,
    50,
    TRUE
),
(
    'p0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000002',
    'Kaos Polos Premium Cotton',
    'kaos-polos-premium-cotton',
    'Kaos polos berbahan cotton combed 30s, tersedia berbagai warna dan ukuran.',
    89000,
    200,
    150,
    TRUE
),
(
    'p0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000002',
    'Celana Chino Slim Fit',
    'celana-chino-slim-fit',
    'Celana chino slim fit berbahan katun stretch, nyaman dipakai seharian.',
    189000,
    80,
    400,
    TRUE
),
(
    'p0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000003',
    'Kopi Arabika Gayo 250gr',
    'kopi-arabika-gayo-250gr',
    'Kopi arabika single origin dari Gayo, Aceh. Roast level medium.',
    75000,
    150,
    250,
    TRUE
),
(
    'p0000000-0000-0000-0000-000000000006',
    'c0000000-0000-0000-0000-000000000004',
    'Blender Portable 350ml',
    'blender-portable-350ml',
    'Blender portable dengan kapasitas 350ml, bisa diisi ulang via USB.',
    149000,
    60,
    500,
    TRUE
),
(
    'p0000000-0000-0000-0000-000000000007',
    'c0000000-0000-0000-0000-000000000005',
    'Matras Yoga Anti Slip 6mm',
    'matras-yoga-anti-slip-6mm',
    'Matras yoga tebal 6mm, bahan TPE ramah lingkungan, anti slip.',
    199000,
    40,
    1200,
    TRUE
);

-- Product images (placeholder URLs)
INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES
('p0000000-0000-0000-0000-000000000001', 'https://placehold.co/600x600?text=Smartphone', TRUE, 0),
('p0000000-0000-0000-0000-000000000002', 'https://placehold.co/600x600?text=Earphone', TRUE, 0),
('p0000000-0000-0000-0000-000000000003', 'https://placehold.co/600x600?text=Kaos', TRUE, 0),
('p0000000-0000-0000-0000-000000000004', 'https://placehold.co/600x600?text=Celana', TRUE, 0),
('p0000000-0000-0000-0000-000000000005', 'https://placehold.co/600x600?text=Kopi', TRUE, 0),
('p0000000-0000-0000-0000-000000000006', 'https://placehold.co/600x600?text=Blender', TRUE, 0),
('p0000000-0000-0000-0000-000000000007', 'https://placehold.co/600x600?text=Matras', TRUE, 0);
