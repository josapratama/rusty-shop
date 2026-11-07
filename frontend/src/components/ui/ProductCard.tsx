import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Heart, Star } from "lucide-react";
import { formatCurrency } from "../../utils/format";
import { cartService } from "../../services/cartService";
import { wishlistService } from "../../services/wishlistService";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { ProductListItem } from "../../types";

interface Props {
  product: ProductListItem;
  isWishlisted?: boolean;
  onWishlistToggle?: (productId: string, inWishlist: boolean) => void;
}

export default function ProductCard({ product, isWishlisted = false, onWishlistToggle }: Props) {
  const { token } = useAuthStore();
  const { incrementCount } = useCartStore();
  const queryClient = useQueryClient();
  const [wishlist, setWishlist] = useState(isWishlisted);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const hasDiscount =
    product.original_price != null && product.original_price > product.price;

  const discountPercent = hasDiscount
    ? Math.round(
        ((Number(product.original_price) - Number(product.price)) /
          Number(product.original_price)) *
          100
      )
    : 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      toast.error("Silakan login terlebih dahulu untuk belanja");
      return;
    }
    try {
      await cartService.addItem({ product_id: product.id, quantity: 1 });
      incrementCount();
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Produk ditambahkan ke keranjang");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal menambahkan ke keranjang";
      toast.error(msg);
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      toast.error("Silakan login untuk menyimpan wishlist");
      return;
    }
    setTogglingWishlist(true);
    try {
      const res = await wishlistService.toggle(product.id);
      const newState = res.data.data.in_wishlist;
      setWishlist(newState);
      toast.success(
        newState ? "Ditambahkan ke Wishlist" : "Dihapus dari Wishlist"
      );
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      void queryClient.invalidateQueries({ queryKey: ["wishlist-ids"] });
      if (onWishlistToggle) {
        onWishlistToggle(product.id, newState);
      }
    } catch {
      toast.error("Gagal memperbarui wishlist");
    } finally {
      setTogglingWishlist(false);
    }
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="card group hover:shadow-md transition-shadow relative flex flex-col h-full overflow-hidden"
    >
      <div className="aspect-square overflow-hidden rounded-t-xl bg-gray-100 relative">
        <img
          src={
            product.primary_image ??
            "https://placehold.co/400x400?text=No+Image"
          }
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Discount Badge */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white font-bold text-xs px-2 py-0.5 rounded-full shadow">
            -{discountPercent}%
          </span>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          disabled={togglingWishlist}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all ${
            wishlist
              ? "bg-red-50 text-red-500"
              : "bg-white/80 text-gray-500 hover:text-red-500"
          }`}
          title="Wishlist"
        >
          <Heart size={16} fill={wishlist ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{product.category_name}</span>
            {product.rating != null && (
              <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                <Star size={12} fill="currentColor" />
                {product.rating}
                {product.review_count ? ` (${product.review_count})` : ""}
              </span>
            )}
          </div>
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
            {product.name}
          </h3>
        </div>

        <div>
          {hasDiscount && (
            <p className="text-xs text-gray-400 line-through">
              {formatCurrency(product.original_price!)}
            </p>
          )}
          <div className="flex items-center justify-between mt-0.5">
            <span className="font-bold text-primary-600 text-base">
              {formatCurrency(product.price)}
            </span>
            <button
              onClick={handleAddToCart}
              className="p-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
              title="Tambah ke keranjang"
            >
              <ShoppingCart size={16} />
            </button>
          </div>
          {product.stock === 0 && (
            <span className="text-xs text-red-500 mt-1 block font-medium">
              Stok habis
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
