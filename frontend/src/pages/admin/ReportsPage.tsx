import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import { formatCurrency } from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { SalesReport } from "../../types";

export default function ReportsPage() {
  const { data: reports, isLoading } = useQuery<SalesReport>({
    queryKey: ["admin-reports"],
    queryFn: () => adminService.getReports().then((r) => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Laporan Penjualan
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly sales */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Penjualan per Bulan
          </h2>
          {reports?.monthly_sales?.length === 0 ? (
            <p className="text-gray-500 text-sm">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {reports?.monthly_sales?.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {m.month
                        ? new Date(m.month).toLocaleDateString("id-ID", {
                            month: "long",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {m.order_count} pesanan
                    </p>
                  </div>
                  <span className="font-bold text-primary-600">
                    {formatCurrency(m.revenue ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Produk Terlaris</h2>
          {reports?.top_products?.length === 0 ? (
            <p className="text-gray-500 text-sm">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {reports?.top_products?.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{p.product_name}</p>
                      <p className="text-xs text-gray-500">
                        {p.total_sold} terjual
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">
                    {formatCurrency(p.total_revenue ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order status summary */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">
            Ringkasan Status Pesanan
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {reports?.order_status_summary?.map((s, idx) => (
              <div key={idx} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
