import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productService } from "../../services/productService";
import { cartService } from "../../services/cartService";
import { wishlistService } from "../../services/wishlistService";
import { reviewService } from "../../services/reviewService";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { formatCurrency, formatDateTime } from "../../utils/format";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ProductCard from "../../components/ui/ProductCard";
import type { ProductDetail, ProductListItem, Review } from "../../types";
import { ShoppingCart, Minus, Plus, ChevronRight, Heart, Star, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const { token } = useAuthStore();
  const { incrementCount } = useCartStore();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery<ProductDetail>({
    queryKey: ["product", slug],
    queryFn: () => productService.getBySlug(slug!).then((r) => r.data.data),
    enabled: !!slug,
  });

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ["reviews", product?.id],
    queryFn: () => reviewService.getProductReviews(product!.id).then((r) => r.data.data),
    enabled: !!product?.id,
  });

  const { data: relatedProducts } = useQuery<ProductListItem[]>({
    queryKey: ["related-products", slug],
    queryFn: () => productService.getRelated(slug!).then((r) => r.data.data),
    enabled: !!slug,
  });

  const { data: wishlistIds } = useQuery<string[]>({
    queryKey: ["wishlist-ids"],
    queryFn: () => wishlistService.getIds().then((r) => r.data.data),
    enabled: !!token,
  });

  useEffect(() => {
    if (product && wishlistIds) {
      setIsWishlisted(wishlistIds.includes(product.id));
    }
  }, [product, wishlistIds]);

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

  const handleToggleWishlist = async () => {
    if (!token) {
      toast.error("Silakan login untuk menyimpan wishlist");
      return;
    }
    if (!product) return;
    setTogglingWishlist(true);
    try {
      const res = await wishlistService.toggle(product.id);
      const newState = res.data.data.in_wishlist;
      setIsWishlisted(newState);
      toast.success(newState ? "Ditambahkan ke Wishlist" : "Dihapus dari Wishlist");
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      void queryClient.invalidateQueries({ queryKey: ["wishlist-ids"] });
    } catch {
      toast.error("Gagal memperbarui wishlist");
    } finally {
      setTogglingWishlist(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (!product)
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Produk tidak ditemukan</p>
        <Link to="/catalog" className="text-primary-600 hover:underline mt-2 block">
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

  const hasDiscount =
    product.original_price != null && product.original_price > product.price;

  const discountPercent = hasDiscount
    ? Math.round(
        ((Number(product.original_price) - Number(product.price)) /
          Number(product.original_price)) *
          100
      )
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">Home</Link>
        <ChevronRight size={14} />
        <Link to="/catalog" className="hover:text-primary-600">Katalog</Link>
        <ChevronRight size={14} />
        <Link to={`/category/${product.category_slug}`} className="hover:text-primary-600">
          {product.category_name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3 relative">
            <img
              src={images[selectedImage]?.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {hasDiscount && (
              <span className="absolute top-4 left-4 bg-red-500 text-white font-bold text-sm px-3 py-1 rounded-full shadow">
                Diskon {discountPercent}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === idx ? "border-primary-500" : "border-gray-200"
                  }`}
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <Link
            to={`/category/${product.category_slug}`}
            className="text-sm text-primary-600 hover:underline font-medium"
          >
            {product.category_name}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 mb-2">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center text-amber-500 font-semibold text-sm">
              <Star size={16} fill="currentColor" className="mr-1" />
              <span>{product.rating ?? "Baru"}</span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-500">
              {reviews?.length ?? product.review_count ?? 0} Ulasan Pembeli
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-green-600 flex items-center gap-1">
              <ShieldCheck size={16} /> Original & Terjamin
            </span>
          </div>

          {/* Price & Discount */}
          <div className="mb-4">
            {hasDiscount && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-400 line-through">
                  {formatCurrency(product.original_price!)}
                </span>
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded">
                  Hemat {formatCurrency(Number(product.original_price) - Number(product.price))}
                </span>
              </div>
            )}
            <p className="text-3xl font-bold text-primary-600">
              {formatCurrency(product.price)}
            </p>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <span
              className={`text-sm px-2.5 py-1 rounded-full font-medium ${
                product.stock > 0
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {product.stock > 0 ? `Stok: ${product.stock} unit` : "Stok Habis"}
            </span>
            {product.weight && (
              <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                Berat: {product.weight}g
              </span>
            )}
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
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="p-2 hover:bg-gray-50 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || addingToCart}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-base font-semibold"
            >
              <ShoppingCart size={20} />
              {addingToCart ? "Menambahkan..." : "Tambah ke Keranjang"}
            </button>
            <button
              onClick={handleToggleWishlist}
              disabled={togglingWishlist}
              className={`p-3 rounded-xl border transition-colors flex items-center justify-center ${
                isWishlisted
                  ? "border-red-500 bg-red-50 text-red-500"
                  : "border-gray-300 text-gray-600 hover:text-red-500 hover:border-red-300"
              }`}
              title="Tambah ke Wishlist"
            >
              <Heart size={22} fill={isWishlisted ? "currentColor" : "none"} />
            </button>
          </div>

          {product.description && (
            <div className="mt-8 border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Deskripsi Produk</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Star size={20} className="text-amber-500" fill="currentColor" />
          Ulasan Pembeli ({reviews?.length ?? 0})
        </h2>

        {!reviews || reviews.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500 text-sm">
            Belum ada ulasan untuk produk ini. Jadilah pembeli pertama yang memberikan ulasan!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-900">{rev.user_name}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(rev.created_at)}</span>
                </div>
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < rev.rating ? "currentColor" : "none"}
                      className={i < rev.rating ? "text-amber-500" : "text-gray-300"}
                    />
                  ))}
                </div>
                {rev.comment && (
                  <p className="text-sm text-gray-600 mt-1">{rev.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-14 border-t pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Produk Terkait Lainnya</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
