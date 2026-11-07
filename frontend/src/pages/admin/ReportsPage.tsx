import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import { formatCurrency } from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { SalesReport } from "../../types";
import { Download, TrendingUp, Award, BarChart3 } from "lucide-react";
import toast from "react-hot-toast";

export default function ReportsPage() {
  const { data: reports, isLoading } = useQuery<SalesReport>({
    queryKey: ["admin-reports"],
    queryFn: () => adminService.getReports().then((r) => r.data.data),
  });

  const exportMonthlySalesCSV = () => {
    if (!reports?.monthly_sales || reports.monthly_sales.length === 0) {
      toast.error("Tidak ada data penjualan untuk diekspor");
      return;
    }

    const headers = ["Bulan", "Jumlah Pesanan", "Total Pendapatan (IDR)"];
    const rows = reports.monthly_sales.map((m) => [
      m.month
        ? new Date(m.month).toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })
        : "-",
      m.order_count,
      m.revenue ?? 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-penjualan-bulanan-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan penjualan bulanan berhasil diunduh");
  };

  const exportTopProductsCSV = () => {
    if (!reports?.top_products || reports.top_products.length === 0) {
      toast.error("Tidak ada data produk untuk diekspor");
      return;
    }

    const headers = ["Peringkat", "Nama Produk", "Total Terjual", "Total Pendapatan (IDR)"];
    const rows = reports.top_products.map((p, idx) => [
      idx + 1,
      `"${p.product_name.replace(/"/g, '""')}"`,
      p.total_sold,
      p.total_revenue ?? 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-produk-terlaris-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan produk terlaris berhasil diunduh");
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Laporan & Analitik Penjualan
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pantau pertumbuhan pendapatan, tren penjualan bulanan, dan produk terlaris
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportMonthlySalesCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 bg-white transition-colors shadow-sm font-medium"
          >
            <Download size={15} /> Ekspor Penjualan (CSV)
          </button>
          <button
            onClick={exportTopProductsCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 btn-primary text-sm font-medium shadow-sm"
          >
            <Download size={15} /> Ekspor Produk Terlaris (CSV)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly sales */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-600" />
              Penjualan per Bulan
            </h2>
          </div>
          {reports?.monthly_sales?.length === 0 ? (
            <p className="text-gray-500 text-sm">Belum ada data penjualan.</p>
          ) : (
            <div className="space-y-3">
              {reports?.monthly_sales?.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      {m.month
                        ? new Date(m.month).toLocaleDateString("id-ID", {
                            month: "long",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {m.order_count} total pesanan
                    </p>
                  </div>
                  <span className="font-bold text-primary-600 text-base">
                    {formatCurrency(m.revenue ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              Produk Terlaris
            </h2>
          </div>
          {reports?.top_products?.length === 0 ? (
            <p className="text-gray-500 text-sm">Belum ada data produk terlaris.</p>
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
                      <p className="font-medium text-sm text-gray-900">{p.product_name}</p>
                      <p className="text-xs text-gray-500">
                        {p.total_sold} unit terjual
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-gray-900">
                    {formatCurrency(p.total_revenue ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order status summary */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary-600" />
            Ringkasan Status Pesanan Keseluruhan
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {reports?.order_status_summary?.map((s, idx) => (
              <div key={idx} className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-2xl font-bold text-gray-900 mb-1">{s.count}</p>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
