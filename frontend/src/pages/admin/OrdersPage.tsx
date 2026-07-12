import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../../services/orderService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Pagination from "../../components/ui/Pagination";
import type {
  Order,
  OrderListItem,
  OrderStatus,
  PaginatedResponse,
} from "../../types";
import { Eye, X } from "lucide-react";
import toast from "react-hot-toast";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("pending");
  const [updating, setUpdating] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PaginatedResponse<OrderListItem>>({
    queryKey: ["admin-orders", { page, status: statusFilter }],
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
      setSelectedOrder(res.data.data);
      setNewStatus(res.data.data.status);
    } catch {
      toast.error("Gagal memuat pesanan");
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || newStatus === selectedOrder.status) return;
    setUpdating(true);
    try {
      await orderService.updateStatus(selectedOrder.id, newStatus);
      toast.success("Status pesanan diperbarui");
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelectedOrder((prev) =>
        prev ? { ...prev, status: newStatus } : null,
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
                    <td className="px-5 py-3 font-medium text-sm">
                      {order.order_number}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <div>{order.user_name}</div>
                      <div className="text-gray-400 text-xs">
                        {order.user_email}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openOrder(order.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
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
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedOrder.order_number}
                </h2>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <button onClick={() => setSelectedOrder(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Update status */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium text-gray-700">
                Update Status:
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="input-field flex-1 text-sm"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={handleUpdateStatus}
                disabled={updating || newStatus === selectedOrder.status}
                className="btn-primary text-sm py-1.5 px-3"
              >
                {updating ? "..." : "Update"}
              </button>
            </div>

            {/* Items */}
            <div className="mb-4">
              <h3 className="font-medium text-sm text-gray-700 mb-2">Produk</h3>
              <div className="space-y-2">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary-600">
                  {formatCurrency(selectedOrder.total)}
                </span>
              </div>
            </div>

            {/* Shipping */}
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-1">Pengiriman ke:</p>
              <p>
                {selectedOrder.shipping_name} - {selectedOrder.shipping_phone}
              </p>
              <p>
                {selectedOrder.shipping_address}, {selectedOrder.shipping_city},{" "}
                {selectedOrder.shipping_province}{" "}
                {selectedOrder.shipping_postal}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
