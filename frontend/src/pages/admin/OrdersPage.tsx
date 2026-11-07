import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../../services/orderService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Pagination from "../../components/ui/Pagination";
import type { Order, OrderStatus } from "../../types";
import { Eye, X, Truck } from "lucide-react";
import toast from "react-hot-toast";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];

const COURIER_OPTIONS = [
  "JNE Reguler",
  "J&T Express",
  "SiCepat Express",
  "Anteraja",
  "Pos Indonesia",
  "ID Express",
  "GoSend / GrabExpress",
  "Lainnya",
];

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("pending");
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [updating, setUpdating] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", page, statusFilter],
    queryFn: () =>
      orderService
        .adminList({
          page,
          per_page: 15,
          status: statusFilter || undefined,
        })
        .then((r) => r.data),
  });

  const openOrder = async (id: string) => {
    try {
      const res = await orderService.adminGet(id);
      const ord = res.data.data;
      setSelectedOrder(ord);
      setNewStatus(ord.status);
      setCourier(ord.courier ?? "JNE Reguler");
      setTrackingNumber(ord.tracking_number ?? "");
    } catch {
      toast.error("Gagal memuat pesanan");
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      await orderService.updateStatus(
        selectedOrder.id,
        newStatus,
        courier || undefined,
        trackingNumber || undefined
      );
      toast.success("Status dan informasi pengiriman berhasil diperbarui");
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              courier: courier || prev.courier,
              tracking_number: trackingNumber || prev.tracking_number,
            }
          : null
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal memperbarui status";
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Manajemen Pesanan
      </h1>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {[
          { value: "" as const, label: "Semua" },
          ...ORDER_STATUSES.map((s) => ({ value: s, label: s })),
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === f.value
                ? "bg-primary-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    No. Pesanan
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Pelanggan
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Ekspedisi / Resi
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Tanggal
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-sm text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      <div>{order.user_name}</div>
                      <div className="text-xs text-gray-400">
                        {order.user_email}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-sm text-primary-600">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {order.courier ? (
                        <div>
                          <div className="font-medium text-gray-900">{order.courier}</div>
                          <div className="font-mono text-gray-500">{order.tracking_number ?? "-"}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openOrder(order.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Lihat Rincian"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data?.meta} onPageChange={setPage} />
        </>
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">
                  {selectedOrder.order_number}
                </h2>
                <div className="mt-1">
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Update status & tracking inputs */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3 border">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700 w-32 shrink-0">
                  Status Pesanan:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="input-field flex-1 text-sm bg-white"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {(newStatus === "shipped" || newStatus === "completed" || selectedOrder.courier) && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-gray-700 w-32 shrink-0 flex items-center gap-1">
                      <Truck size={14} /> Kurir:
                    </label>
                    <select
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      className="input-field flex-1 text-sm bg-white"
                    >
                      {COURIER_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-gray-700 w-32 shrink-0">
                      No. Resi Pengiriman:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: JP123456789"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="input-field flex-1 text-sm font-mono bg-white uppercase"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="btn-primary text-sm py-2 px-5 font-medium"
                >
                  {updating ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <h3 className="font-semibold text-sm text-gray-900 mb-2">Produk Dipesan</h3>
              <div className="space-y-2">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <span className="text-gray-800">
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-3 pt-2 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {Number(selectedOrder.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Diskon Kupon ({selectedOrder.coupon_code ?? "PROMO"})</span>
                    <span>-{formatCurrency(selectedOrder.discount_amount!)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Ongkos kirim</span>
                  <span>{formatCurrency(selectedOrder.shipping_cost)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2 text-base">
                  <span>Total Tagihan</span>
                  <span className="text-primary-600">
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer & Address */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm space-y-1">
              <p className="font-semibold text-gray-900">Alamat Pengiriman:</p>
              <p className="text-gray-800">{selectedOrder.shipping_name} ({selectedOrder.shipping_phone})</p>
              <p className="text-gray-600">
                {selectedOrder.shipping_address}, {selectedOrder.shipping_city}, {selectedOrder.shipping_province} {selectedOrder.shipping_postal}
              </p>
            </div>

            {/* Payment proof */}
            {selectedOrder.payment_method === "bank_transfer" && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm text-gray-900 mb-2">
                  Bukti Pembayaran Transfer
                </h3>
                {selectedOrder.payment_proof ? (
                  <a
                    href={selectedOrder.payment_proof}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={selectedOrder.payment_proof}
                      alt="Bukti pembayaran"
                      className="max-h-56 rounded-lg border border-gray-200 object-contain hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <p className="text-sm text-gray-500">
                    Belum ada bukti pembayaran diunggah oleh pembeli.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
