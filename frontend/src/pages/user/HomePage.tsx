import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { productService } from "../../services/productService";
import { categoryService } from "../../services/categoryService";
import ProductCard from "../../components/ui/ProductCard";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { Category, PaginatedResponse, ProductListItem } from "../../types";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const { data: productsData, isLoading: loadingProducts } = useQuery<
    PaginatedResponse<ProductListItem>
  >({
    queryKey: ["products", { per_page: 8 }],
    queryFn: () => productService.list({ per_page: 8 }).then((r) => r.data),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoryService.list().then((r) => r.data.data),
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Belanja Mudah, Harga Terjangkau
          </h1>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Temukan ribuan produk berkualitas dengan pengiriman cepat ke seluruh
            Indonesia.
          </p>
          <Link
            to="/catalog"
            className="bg-white text-primary-600 font-semibold px-8 py-3 rounded-full hover:bg-primary-50 transition-colors inline-flex items-center gap-2"
          >
            Mulai Belanja <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Kategori</h2>
          <Link
            to="/catalog"
            className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1"
          >
            Lihat semua <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories?.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="card p-4 text-center hover:shadow-md transition-shadow group"
            >
              <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary-100 transition-colors">
                <span className="text-2xl">🏷️</span>
              </div>
              <p className="text-sm font-medium text-gray-700">{cat.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Produk Terbaru</h2>
          <Link
            to="/catalog"
            className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1"
          >
            Lihat semua <ArrowRight size={14} />
          </Link>
        </div>

        {loadingProducts ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productsData?.data?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Banner */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Pembayaran Mudah & Aman</h2>
          <p className="text-gray-400 mb-8">
            Transfer bank atau bayar di tempat. Proses cepat dan terpercaya.
          </p>
          <div className="flex justify-center gap-8 flex-wrap">
            {[
              "🏦 Transfer Bank",
              "🚚 COD",
              "📦 Pengiriman Cepat",
              "🔒 Transaksi Aman",
            ].map((item) => (
              <div key={item} className="text-center">
                <p className="text-lg">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
