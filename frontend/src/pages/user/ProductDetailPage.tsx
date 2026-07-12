import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productService } from "../../services/productService";
import { cartService } from "../../services/cartService";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { formatCurrency } from "../../utils/format";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { ProductDetail } from "../../types";
import { ShoppingCart, Minus, Plus, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const { token } = useAuthStore();
  const { incrementCount } = useCartStore();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery<ProductDetail>({
    queryKey: ["product", slug],
    queryFn: () => productService.getBySlug(slug!).then((r) => r.data.data),
    enabled: !!slug,
  });

  const handleAddToCart = async () => {
    if (!token) {
      toast.error("Silakan login terlebih dahulu");
      return;
    }
    if (!product) return;
    setAddingToCart(true);
    try {
      await cartService.addItem({ product_id: product.id, quantity });
      incrementCount();
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Produk ditambahkan ke keranjang");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal menambahkan ke keranjang";
      toast.error(msg);
    } finally {
      setAddingToCart(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (!product)
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Produk tidak ditemukan</p>
        <Link
          to="/catalog"
          className="text-primary-600 hover:underline mt-2 block"
        >
          Kembali ke katalog
        </Link>
      </div>
    );

  const images =
    product.images?.length > 0
      ? product.images
      : [
          {
            id: "0",
            image_url: "https://placehold.co/600x600?text=No+Image",
            is_primary: true,
            sort_order: 0,
          },
        ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">
          Home
        </Link>
        <ChevronRight size={14} />
        <Link to="/catalog" className="hover:text-primary-600">
          Katalog
        </Link>
        <ChevronRight size={14} />
        <Link
          to={`/category/${product.category_slug}`}
          className="hover:text-primary-600"
        >
          {product.category_name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3">
            <img
              src={images[selectedImage]?.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === idx
                      ? "border-primary-500"
                      : "border-gray-200"
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <Link
            to={`/category/${product.category_slug}`}
            className="text-sm text-primary-600 hover:underline"
          >
            {product.category_name}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 mb-3">
            {product.name}
          </h1>
          <p className="text-3xl font-bold text-primary-600 mb-4">
            {formatCurrency(product.price)}
          </p>

          <div className="flex items-center gap-2 mb-6">
            <span
              className={`text-sm px-2 py-1 rounded-full ${
                product.stock > 0
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {product.stock > 0 ? `Stok: ${product.stock}` : "Stok Habis"}
            </span>
          </div>

          {product.stock > 0 && (
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-700">Jumlah:</span>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 hover:bg-gray-50 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="px-4 py-2 font-medium min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity((q) => Math.min(product.stock, q + 1))
                  }
                  className="p-2 hover:bg-gray-50 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0 || addingToCart}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
          >
            <ShoppingCart size={20} />
            {addingToCart ? "Menambahkan..." : "Tambah ke Keranjang"}
          </button>

          {product.description && (
            <div className="mt-8">
              <h3 className="font-semibold text-gray-900 mb-2">
                Deskripsi Produk
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {product.weight && (
            <div className="mt-4 text-sm text-gray-500">
              Berat: {product.weight}g
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
