import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../../services/orderService";
import { reviewService } from "../../services/reviewService";
import { configService, type BankAccount } from "../../services/configService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { Order, OrderItem } from "../../types";
import { ChevronLeft, Upload, Printer, Copy, Check, Star, Truck, X } from "lucide-react";
import toast from "react-hot-toast";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedResi, setCopiedResi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review Modal State
  const [reviewingItem, setReviewingItem] = useState<OrderItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: () => orderService.get(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: () => configService.get().then((r) => r.data.data),
  });

  let bankAccounts: BankAccount[] = [
    { bank: "BCA", account_number: "1234567890", holder_name: "Rusty Shop" },
    { bank: "Mandiri", account_number: "9876543210", holder_name: "Rusty Shop" },
  ];
  if (config?.bank_accounts) {
    try {
      const parsed = JSON.parse(config.bank_accounts);
      if (Array.isArray(parsed) && parsed.length > 0) bankAccounts = parsed;
    } catch {}
  }

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

  const handleCopyTracking = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedResi(true);
    toast.success("Nomor resi berhasil disalin!");
    setTimeout(() => setCopiedResi(false), 2000);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingItem || !id) return;
    setSubmittingReview(true);
    try {
      await reviewService.createReview({
        product_id: reviewingItem.product_id,
        order_id: id,
        rating,
        comment: comment.trim() || undefined,
      });
      toast.success("Terima kasih atas ulasan Anda!");
      setReviewingItem(null);
      setComment("");
      setRating(5);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal mengirim ulasan";
      toast.error(msg);
    } finally {
      setSubmittingReview(false);
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
      {/* Back button - hidden on print */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <Link
          to="/orders"
          className="flex items-center gap-1 text-gray-500 hover:text-primary-600 text-sm"
        >
          <ChevronLeft size={16} /> Kembali ke Riwayat Pesanan
        </Link>
        <button
          onClick={handlePrintInvoice}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Printer size={15} /> Cetak Invoice
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 border-b pb-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-gray-400 font-bold block">
            Faktur Pembelian
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {order.order_number}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Waktu Transaksi: {formatDateTime(order.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          {order.status === "pending" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="print:hidden text-sm text-red-600 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {cancelling ? "Membatalkan..." : "Batalkan Pesanan"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Shipping Tracking Card */}
        {(order.tracking_number || order.courier) && (
          <div className="card p-5 bg-blue-50/50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Truck size={18} className="text-blue-600" />
              Informasi Pengiriman & Pelacakan
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm mt-2">
              <div>
                <p className="text-gray-500 text-xs">Kurir Ekspedisi</p>
                <p className="font-semibold text-gray-900 text-base">
                  {order.courier ?? "Kurir Pengiriman"}
                </p>
              </div>
              {order.tracking_number && (
                <div>
                  <p className="text-gray-500 text-xs">Nomor Resi Pengiriman</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-base text-primary-700 bg-white px-2.5 py-1 rounded border border-blue-200">
                      {order.tracking_number}
                    </span>
                    <button
                      onClick={() => handleCopyTracking(order.tracking_number!)}
                      className="print:hidden p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors"
                      title="Salin No. Resi"
                    >
                      {copiedResi ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Rincian Barang</h3>
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <img
                  src={
                    item.product_image ??
                    "https://placehold.co/60x60?text=No+Image"
                  }
                  alt={item.product_name}
                  className="w-14 h-14 object-cover rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{item.product_name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {formatCurrency(item.price)} × {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-sm text-gray-900 block">
                    {formatCurrency(item.subtotal)}
                  </span>
                  {/* Write review button if order is completed */}
                  {order.status === "completed" && (
                    <button
                      onClick={() => setReviewingItem(item)}
                      className="print:hidden mt-1 text-xs text-primary-600 hover:underline flex items-center gap-1 font-medium ml-auto"
                    >
                      <Star size={12} fill="currentColor" /> Beri Ulasan
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {Number(order.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Diskon Kupon {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
                <span>-{formatCurrency(order.discount_amount!)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Ongkos kirim</span>
              <span>{formatCurrency(order.shipping_cost)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
              <span>Total Pembayaran</span>
              <span className="text-primary-600 text-lg">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-2">
            Tujuan Pengiriman
          </h3>
          <p className="font-medium text-sm text-gray-900">{order.shipping_name}</p>
          <p className="text-gray-600 text-sm mt-0.5">{order.shipping_phone}</p>
          <p className="text-gray-600 text-sm mt-0.5">{order.shipping_address}</p>
          <p className="text-gray-600 text-sm">
            {order.shipping_city}, {order.shipping_province} {order.shipping_postal}
          </p>
        </div>

        {/* Payment */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Metode Pembayaran</h3>
          <p className="text-sm text-gray-600">
            Metode:{" "}
            <span className="font-semibold text-gray-900">
              {order.payment_method === "bank_transfer"
                ? "Transfer Bank"
                : "Bayar di Tempat (COD)"}
            </span>
          </p>

          {order.payment_method === "bank_transfer" && order.status === "pending" && (
            <div className="mt-3 p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800 border border-yellow-200">
              <p className="font-bold">Instruksi Pembayaran Transfer Bank:</p>
              <div className="mt-2 space-y-1.5">
                {bankAccounts.map((acc, idx) => (
                  <p key={idx}>
                    Bank {acc.bank}: <strong>{acc.account_number}</strong> a/n {acc.holder_name}
                  </p>
                ))}
                <p className="mt-2 pt-1 border-t border-yellow-200">
                  Nominal Transfer: <strong className="text-primary-700 text-base">{formatCurrency(order.total)}</strong>
                </p>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                Setelah transfer, silakan upload bukti struk/screenshot pembayaran di bawah untuk diverifikasi.
              </p>
            </div>
          )}

          {/* Payment proof */}
          {order.payment_method === "bank_transfer" && (
            <div className="mt-4">
              {order.payment_proof ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Bukti Pembayaran:
                  </p>
                  <a href={order.payment_proof} target="_blank" rel="noopener noreferrer">
                    <img
                      src={order.payment_proof}
                      alt="Bukti pembayaran"
                      className="max-h-48 rounded-lg border border-gray-200 object-contain shadow-sm"
                    />
                  </a>
                </div>
              ) : (
                order.status === "pending" && (
                  <p className="text-sm text-gray-500">Belum ada bukti pembayaran diunggah.</p>
                )
              )}

              {order.status === "pending" && (
                <div className="mt-3 print:hidden">
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
                    className="flex items-center gap-2 text-sm text-primary-600 border border-primary-300 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition-colors font-medium"
                  >
                    <Upload size={14} />
                    {uploading ? "Mengunggah..." : order.payment_proof ? "Ganti Bukti Transfer" : "Upload Bukti Transfer"}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">Format: JPG, PNG, WebP. Maks 5 MB.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {order.notes && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Catatan Pembeli</h3>
            <p className="text-gray-600 text-sm">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative shadow-xl">
            <button
              onClick={() => setReviewingItem(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Beri Ulasan Produk</h2>
            <p className="text-sm text-gray-500 mb-4">{reviewingItem.product_name}</p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating Bintang:
                </label>
                <div className="flex gap-2 text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        size={28}
                        fill={star <= rating ? "currentColor" : "none"}
                        className={star <= rating ? "text-amber-500" : "text-gray-300"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Komentar / Pengalaman Anda:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ceritakan kepuasan Anda mengenai produk ini..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {submittingReview ? "Mengirim..." : "Kirim Ulasan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
