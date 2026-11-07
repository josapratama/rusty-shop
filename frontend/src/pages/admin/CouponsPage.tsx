import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { couponService } from "../../services/couponService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { Coupon, CreateCouponRequest } from "../../types";
import { Plus, Trash2, X, Tag, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

const emptyCouponForm: {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  min_purchase: string;
  max_discount: string;
  usage_limit: string;
  expires_at: string;
  is_active: boolean;
} = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  min_purchase: "",
  max_discount: "",
  usage_limit: "",
  expires_at: "",
  is_active: true,
};

export default function CouponsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyCouponForm);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ["admin-coupons"],
    queryFn: () => couponService.adminList().then((r) => r.data.data),
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: CreateCouponRequest = {
      code: form.code.trim().toUpperCase(),
      description: form.description || undefined,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_purchase: form.min_purchase ? parseFloat(form.min_purchase) : 0,
      max_discount: form.max_discount ? parseFloat(form.max_discount) : undefined,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
      is_active: form.is_active,
    };

    try {
      await couponService.adminCreate(payload);
      toast.success("Kupon berhasil dibuat");
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setShowModal(false);
      setForm(emptyCouponForm);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal membuat kupon";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Yakin ingin menghapus kupon ${code}?`)) return;
    try {
      await couponService.adminDelete(id);
      toast.success("Kupon dihapus");
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch {
      toast.error("Gagal menghapus kupon");
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await couponService.adminUpdate(coupon.id, {
        is_active: !coupon.is_active,
      });
      toast.success(
        coupon.is_active ? "Kupon dinonaktifkan" : "Kupon diaktifkan"
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch {
      toast.error("Gagal memperbarui status kupon");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manajemen Kupon & Promo
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Buat voucher diskon belanja persentase atau potongan tetap
          </p>
        </div>
        <button
          onClick={() => {
            setForm(emptyCouponForm);
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Tambah Kupon
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !coupons || coupons.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          Belum ada kupon promo yang dibuat. Klik "Tambah Kupon" untuk membuat kupon pertama Anda.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Kode Kupon
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Tipe & Nilai Diskon
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Min. Belanja
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Pemakaian
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Kedaluwarsa
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono font-bold text-sm text-primary-700">
                    <div className="flex items-center gap-1.5">
                      <Tag size={15} />
                      {c.code}
                    </div>
                    {c.description && (
                      <div className="font-sans text-xs text-gray-500 font-normal mt-0.5">
                        {c.description}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 font-medium">
                    {c.discount_type === "percentage" ? (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold text-xs">
                        {c.discount_value}% OFF
                        {c.max_discount && ` (Maks ${formatCurrency(c.max_discount)})`}
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-xs">
                        Potongan {formatCurrency(c.discount_value)}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {formatCurrency(c.min_purchase)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{c.used_count}</span>
                    {c.usage_limit ? ` / ${c.usage_limit}` : " / ∞"}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggleActive(c)}
                      className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium transition-colors ${
                        c.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {c.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {c.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {c.expires_at ? formatDateTime(c.expires_at) : "Selamanya"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(c.id, c.code)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Hapus Kupon"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah Kupon */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 my-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Buat Kupon Promo Baru</h2>
              <button onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kode Kupon * (Huruf Kapital, Contoh: PROMO50)
                </label>
                <input
                  required
                  type="text"
                  placeholder="DISKON10"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="input-field uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keterangan / Deskripsi
                </label>
                <input
                  type="text"
                  placeholder="Diskon spesial awal bulan"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipe Diskon *
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discount_type: e.target.value as "percentage" | "fixed",
                      })
                    }
                    className="input-field text-sm"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nilai Diskon * {form.discount_type === "percentage" ? "(%)" : "(Rp)"}
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder={form.discount_type === "percentage" ? "10" : "20000"}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min. Belanja (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 50000"
                    value={form.min_purchase}
                    onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maks. Diskon (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Khusus persentase"
                    value={form.max_discount}
                    onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batas Kuota Pemakaian
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Kosongkan jika tak terbatas"
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Kedaluwarsa
                  </label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-sm px-5 py-2 font-medium"
                >
                  {saving ? "Menyimpan..." : "Simpan Kupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

