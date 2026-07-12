import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { DashboardStats } from "../../types";
import { Users, Package, ShoppingBag, TrendingUp, Clock } from "lucide-react";

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminService.getDashboard().then((r) => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;

  const cards: StatCard[] = [
    {
      label: "Total Pengguna",
      value: stats?.total_users ?? 0,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      label: "Total Produk",
      value: stats?.total_products ?? 0,
      icon: Package,
      color: "bg-green-500",
    },
    {
      label: "Total Pesanan",
      value: stats?.total_orders ?? 0,
      icon: ShoppingBag,
      color: "bg-purple-500",
    },
    {
      label: "Total Pendapatan",
      value: formatCurrency(stats?.total_revenue ?? 0),
      icon: TrendingUp,
      color: "bg-orange-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div
                className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}
              >
                <Icon size={22} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending orders alert */}
      {(stats?.pending_orders ?? 0) > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Clock size={20} className="text-yellow-600" />
          <p className="text-yellow-800">
            Ada <strong>{stats?.pending_orders}</strong> pesanan menunggu
            konfirmasi pembayaran
          </p>
        </div>
      )}

      {/* Recent orders */}
      <div className="card">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pesanan Terbaru</h2>
        </div>
        <div className="overflow-x-auto">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats?.recent_orders?.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium">
                    {order.order_number}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {order.user_name}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
