import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../services/userService";
import { formatDate } from "../../utils/format";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Pagination from "../../components/ui/Pagination";
import type { AdminUser, PaginatedResponse } from "../../types";
import { Search, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PaginatedResponse<AdminUser>>({
    queryKey: ["admin-users", { page, search }],
    queryFn: () =>
      userService
        .adminList({ page, per_page: 15, search: search || undefined })
        .then((r) => r.data),
  });

  const handleToggle = async (id: string) => {
    try {
      await userService.toggleStatus(id);
      toast.success("Status pengguna diperbarui");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Manajemen Pengguna
      </h1>

      <div className="relative mb-4 max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cari nama atau email..."
          className="input-field pl-9"
        />
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
                    Nama
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Bergabung
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-sm">
                      {user.name}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          user.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleToggle(user.id)}
                        className={`p-1.5 rounded transition-colors ${
                          user.is_active
                            ? "text-green-600 hover:bg-green-50"
                            : "text-gray-400 hover:bg-gray-100"
                        }`}
                        title={user.is_active ? "Nonaktifkan" : "Aktifkan"}
                      >
                        {user.is_active ? (
                          <ToggleRight size={20} />
                        ) : (
                          <ToggleLeft size={20} />
                        )}
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
    </div>
  );
}
