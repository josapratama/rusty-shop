import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../../services/orderService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { Order } from "../../types";
import { ChevronLeft } from "lucide-react";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: () => orderService.get(id!).then((r) => r.data.data),
    enabled: !!id,
  });

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
        <StatusBadge status={order.status} />
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
                  Konfirmasi pembayaran ke admin setelah transfer.
                </p>
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
