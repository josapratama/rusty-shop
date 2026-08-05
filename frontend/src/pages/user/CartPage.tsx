import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cartService } from "../../services/cartService";

import { formatCurrency } from "../../utils/format";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { Cart } from "../../types";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";

export default function CartPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: cart, isLoading } = useQuery<Cart>({
    queryKey: ["cart"],
    queryFn: () => cartService.get().then((r) => r.data.data),
  });

  const updateItem = async (id: string, quantity: number) => {
    try {
      await cartService.updateItem(id, { quantity });
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal update keranjang";
      toast.error(msg);
    }
  };

  const removeItem = async (id: string) => {
    try {
      await cartService.removeItem(id);
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Item dihapus dari keranjang");
    } catch {
      toast.error("Gagal menghapus item");
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const items = cart?.items ?? [];
  const hasStockIssue = items.some((i) => i.stock < i.quantity);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Keranjang Belanja
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag size={64} className="mx-auto mb-4 text-gray-300" />
          <p className="text-xl text-gray-500 mb-2">Keranjang kosong</p>
          <p className="text-gray-400 mb-6">
            Tambahkan produk ke keranjang untuk mulai belanja
          </p>
          <Link to="/catalog" className="btn-primary">
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="card p-4 flex gap-4">
                <Link to={`/products/${item.product_slug}`}>
                  <img
                    src={
                      item.product_image ??
                      "https://placehold.co/80x80?text=No+Image"
                    }
                    alt={item.product_name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${item.product_slug}`}
                    className="font-medium text-gray-900 hover:text-primary-600 line-clamp-2"
                  >
                    {item.product_name}
                  </Link>
                  {item.stock === 0 && (
                    <p className="text-xs text-red-600 font-medium mt-0.5">
                      ⚠ Stok habis — hapus item ini sebelum checkout
                    </p>
                  )}
                  {item.stock > 0 && item.stock < item.quantity && (
                    <p className="text-xs text-orange-600 font-medium mt-0.5">
                      ⚠ Stok tersisa {item.stock} — kurangi jumlah sebelum
                      checkout
                    </p>
                  )}
                  <p className="text-primary-600 font-semibold mt-1">
                    {formatCurrency(item.price)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => updateItem(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="p-1.5 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-3 text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="p-1.5 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(item.subtotal)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="card p-5 h-fit">
            <h3 className="font-semibold text-gray-900 mb-4">
              Ringkasan Pesanan
            </h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Subtotal ({items.length} item)
                </span>
                <span>{formatCurrency(cart?.total ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ongkos kirim</span>
                <span className="text-green-600">Dihitung saat checkout</span>
              </div>
            </div>
            <div className="border-t pt-3 mb-4">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary-600">
                  {formatCurrency(cart?.total ?? 0)}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate("/checkout")}
              disabled={hasStockIssue}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasStockIssue ? "Perbaiki stok dulu" : "Lanjut ke Checkout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
