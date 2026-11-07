import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { wishlistService } from "../../services/wishlistService";
import { cartService } from "../../services/cartService";
import { useCartStore } from "../../store/cartStore";
import { formatCurrency } from "../../utils/format";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { WishlistItem } from "../../types";
import { Heart, ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const { incrementCount } = useCartStore();

  const { data: wishlist, isLoading } = useQuery<WishlistItem[]>({
    queryKey: ["wishlist"],
    queryFn: () => wishlistService.list().then((r) => r.data.data),
  });

  const handleRemove = async (productId: string) => {
    try {
      await wishlistService.toggle(productId);
      toast.success("Produk dihapus dari wishlist");
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    } catch {
      toast.error("Gagal menghapus dari wishlist");
    }
  };

  const handleAddToCart = async (productId: string) => {
    try {
      await cartService.addItem({ product_id: productId, quantity: 1 });
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

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart size={26} className="text-red-500" fill="currentColor" />
            Wishlist Saya
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Daftar produk favorit yang Anda simpan untuk dibeli nanti
          </p>
        </div>
        <Link
          to="/catalog"
          className="text-sm font-medium text-primary-600 hover:underline flex items-center gap-1"
        >
          Lanjut Belanja <ArrowRight size={16} />
        </Link>
      </div>

      {!wishlist || wishlist.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart size={32} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Wishlist Anda Masih Kosong
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Jelajahi produk kami dan klik ikon hati untuk menyimpan produk impian Anda di sini!
          </p>
          <Link to="/catalog" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5">
            Mulai Belanja Sekarang
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlist.map((item) => {
            const hasDiscount =
              item.original_price != null && item.original_price > item.price;
            return (
              <div
                key={item.id}
                className="card flex flex-col justify-between overflow-hidden group hover:shadow-md transition-shadow relative"
              >
                <div>
                  <div className="aspect-square bg-gray-100 overflow-hidden relative">
                    <img
                      src={
                        item.primary_image ??
                        "https://placehold.co/400x400?text=No+Image"
                      }
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-full hover:bg-white shadow transition-colors"
                      title="Hapus dari wishlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="p-4">
                    <span className="text-xs text-gray-400 block mb-1">
                      {item.category_name}
                    </span>
                    <Link
                      to={`/products/${item.slug}`}
                      className="font-semibold text-sm text-gray-900 hover:text-primary-600 line-clamp-2 block mb-2"
                    >
                      {item.name}
                    </Link>
                    {hasDiscount && (
                      <p className="text-xs text-gray-400 line-through">
                        {formatCurrency(item.original_price!)}
                      </p>
                    )}
                    <p className="font-bold text-primary-600 text-base">
                      {formatCurrency(item.price)}
                    </p>
                    {item.stock === 0 && (
                      <span className="text-xs text-red-500 mt-1 block">
                        Stok habis
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => handleAddToCart(item.product_id)}
                    disabled={item.stock === 0}
                    className="btn-primary w-full py-2 flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <ShoppingCart size={16} /> Tambah ke Keranjang
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

