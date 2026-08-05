import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../../services/orderService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { Order } from "../../types";
import { ChevronLeft, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { useState, useRef } from "react";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: () => orderService.get(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const handleCancel = async () => {
    if (!id || !window.confirm("Yakin ingin membatalkan pesanan ini?")) return;
    setCancelling(true);
    try {
      await orderService.cancel(id);
      toast.success("Pesanan berhasil dibatalkan");
      void queryClient.invalidateQueries({ queryKey: ["order", id] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal membatalkan pesanan";
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const uploadRes = await orderService.uploadPaymentProof(file);
      const url = uploadRes.data.data.url;
      await orderService.setPaymentProof(id, url);
      toast.success("Bukti pembayaran berhasil diunggah");
      void queryClient.invalidateQueries({ queryKey: ["order", id] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal mengunggah bukti pembayaran";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!order)
    return (
      <div className="text-center py-20 text-gray-500">
        Pesanan tidak ditemukan
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        to="/orders"
        className="flex items-center gap-1 text-gray-500 hover:text-primary-600 mb-6 text-sm"
      >
        <ChevronLeft size={16} /> Kembali ke Riwayat Pesanan
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {order.order_number}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {formatDateTime(order.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          {order.status === "pending" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-sm text-red-600 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {cancelling ? "Membatalkan..." : "Batalkan Pesanan"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Items */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Produk Dipesan</h3>
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex gap-3">
                <img
                  src={
                    item.product_image ??
                    "https://placehold.co/60x60?text=No+Image"
                  }
                  alt={item.product_name}
                  className="w-14 h-14 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.product_name}</p>
                  <p className="text-gray-500 text-xs">
                    {formatCurrency(item.price)} × {item.quantity}
                  </p>
                </div>
                <span className="font-semibold text-sm">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ongkos kirim</span>
              <span>{formatCurrency(order.shipping_cost)}</span>
            </div>
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary-600">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3">
            Alamat Pengiriman
          </h3>
          <p className="font-medium">{order.shipping_name}</p>
          <p className="text-gray-600 text-sm">{order.shipping_phone}</p>
          <p className="text-gray-600 text-sm">{order.shipping_address}</p>
          <p className="text-gray-600 text-sm">
            {order.shipping_city}, {order.shipping_province}{" "}
            {order.shipping_postal}
          </p>
        </div>

        {/* Payment */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Pembayaran</h3>
          <p className="text-sm text-gray-600">
            Metode:{" "}
            <span className="font-medium text-gray-900">
              {order.payment_method === "bank_transfer"
                ? "Transfer Bank"
                : "Bayar di Tempat (COD)"}
            </span>
          </p>
          {order.payment_method === "bank_transfer" &&
            order.status === "pending" && (
              <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                <p className="font-medium">Instruksi Pembayaran:</p>
                <p className="mt-1">Transfer ke rekening berikut:</p>
                <p>BCA: 1234567890 a/n Online Shop</p>
                <p className="mt-1">
                  Nominal: <strong>{formatCurrency(order.total)}</strong>
                </p>
                <p className="text-xs mt-2">
                  Setelah transfer, upload bukti pembayaran di bawah.
                </p>
              </div>
            )}

          {/* Payment proof upload — only for bank_transfer in pending/paid */}
          {order.payment_method === "bank_transfer" &&
            (order.status === "pending" || order.status === "paid") && (
              <div className="mt-4">
                {order.payment_proof ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Bukti Pembayaran:
                    </p>
                    <a
                      href={order.payment_proof}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={order.payment_proof}
                        alt="Bukti pembayaran"
                        className="max-h-48 rounded-lg border border-gray-200 object-contain"
                      />
                    </a>
                    {order.status === "pending" && (
                      <p className="text-xs text-gray-500 mt-1">
                        Klik tombol di bawah untuk mengganti bukti pembayaran.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Belum ada bukti pembayaran.
                  </p>
                )}

                {order.status === "pending" && (
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleUploadProof}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 text-sm text-primary-600 border border-primary-300 rounded-lg px-3 py-1.5 hover:bg-primary-50 disabled:opacity-50 transition-colors"
                    >
                      <Upload size={14} />
                      {uploading
                        ? "Mengunggah..."
                        : order.payment_proof
                          ? "Ganti Bukti Transfer"
                          : "Upload Bukti Transfer"}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">
                      Format: JPG, PNG, WebP. Maks 5 MB.
                    </p>
                  </div>
                )}
              </div>
            )}
        </div>

        {order.notes && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Catatan</h3>
            <p className="text-gray-600 text-sm">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
