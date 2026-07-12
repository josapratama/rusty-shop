import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-3">
              🛍️ Online Shop
            </h3>
            <p className="text-sm text-gray-400">
              Toko online terpercaya dengan produk berkualitas dan harga
              terjangkau.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Belanja</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/catalog"
                  className="hover:text-white transition-colors"
                >
                  Semua Produk
                </Link>
              </li>
              <li>
                <Link
                  to="/category/elektronik"
                  className="hover:text-white transition-colors"
                >
                  Elektronik
                </Link>
              </li>
              <li>
                <Link
                  to="/category/pakaian"
                  className="hover:text-white transition-colors"
                >
                  Pakaian
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Akun</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/profile"
                  className="hover:text-white transition-colors"
                >
                  Profil Saya
                </Link>
              </li>
              <li>
                <Link
                  to="/orders"
                  className="hover:text-white transition-colors"
                >
                  Pesanan Saya
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-white transition-colors">
                  Keranjang
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Informasi</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/about"
                  className="hover:text-white transition-colors"
                >
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-white transition-colors"
                >
                  Kontak
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-white transition-colors"
                >
                  Kebijakan Privasi
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="hover:text-white transition-colors"
                >
                  Syarat & Ketentuan
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Online Shop. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
