import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../../services/orderService";
import { formatCurrency, formatDate } from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type {
  OrderListItem,
  OrderStatus,
  PaginatedResponse,
} from "../../types";
import { Package } from "lucide-react";

interface StatusFilter {
  value: OrderStatus | "";
  label: string;
}

const STATUS_FILTERS: StatusFilter[] = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "paid", label: "Dibayar" },
  { value: "processing", label: "Diproses" },
  { value: "shipped", label: "Dikirim" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

export default function OrderHistoryPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | "">("");

  const { data, isLoading } = useQuery<PaginatedResponse<OrderListItem>>({
    queryKey: ["orders", { page, status }],
    queryFn: () =>
      orderService
        .list({ page, per_page: 10, status: status || undefined })
        .then((r) => r.data),
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Riwayat Pesanan</h1>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              status === f.value
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
      ) : data?.data?.length === 0 ? (
        <div className="text-center py-20">
          <Package size={64} className="mx-auto mb-4 text-gray-300" />
          <p className="text-xl text-gray-500 mb-2">Belum ada pesanan</p>
          <Link to="/catalog" className="btn-primary mt-4 inline-block">
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {data?.data?.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="card p-4 block hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {order.order_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {order.payment_method === "bank_transfer"
                      ? "Transfer Bank"
                      : "COD"}
                  </span>
                  <span className="font-bold text-primary-600">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Pagination meta={data?.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
