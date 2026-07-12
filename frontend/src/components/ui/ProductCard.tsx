import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { formatCurrency } from "../../utils/format";
import { cartService } from "../../services/cartService";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { ProductListItem } from "../../types";

interface Props {
  product: ProductListItem;
}

export default function ProductCard({ product }: Props) {
  const { token } = useAuthStore();
  const { incrementCount } = useCartStore();
  const queryClient = useQueryClient();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Silakan login terlebih dahulu");
      return;
    }
    try {
      await cartService.addItem({ product_id: product.id, quantity: 1 });
      incrementCount();
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Produk ditambahkan ke keranjang");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal menambahkan ke keranjang";
      toast.error(msg);
    }
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="card group hover:shadow-md transition-shadow"
    >
      <div className="aspect-square overflow-hidden rounded-t-xl bg-gray-100">
        <img
          src={
            product.primary_image ??
            "https://placehold.co/400x400?text=No+Image"
          }
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-500 mb-1">{product.category_name}</p>
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="font-bold text-primary-600">
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
          <span className="text-xs text-red-500 mt-1 block">Stok habis</span>
        )}
      </div>
    </Link>
  );
}
