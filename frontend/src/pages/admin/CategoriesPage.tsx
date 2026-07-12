import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { categoryService } from "../../services/categoryService";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { Category, CreateCategoryRequest } from "../../types";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

interface CategoryForm {
  name: string;
  description: string;
  image_url: string;
  is_active: boolean;
}

const emptyForm: CategoryForm = {
  name: "",
  description: "",
  image_url: "",
  is_active: true,
};

export default function CategoriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: () => categoryService.adminList().then((r) => r.data.data),
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      description: cat.description ?? "",
      image_url: cat.image_url ?? "",
      is_active: cat.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: CreateCategoryRequest = {
      name: form.name,
      description: form.description || undefined,
      image_url: form.image_url || undefined,
      is_active: form.is_active,
    };
    try {
      if (editId) {
        await categoryService.update(editId, payload);
        toast.success("Kategori diperbarui");
      } else {
        await categoryService.create(payload);
        toast.success("Kategori ditambahkan");
      }
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setShowModal(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal menyimpan";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) return;
    try {
      await categoryService.delete(id);
      toast.success("Kategori dihapus");
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal menghapus";
      toast.error(msg);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Kategori</h1>
        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Tambah Kategori
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Nama
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Slug
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories?.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{cat.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {cat.slug}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        cat.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {cat.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editId ? "Edit Kategori" : "Tambah Kategori"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Gambar
                </label>
                <input
                  value={form.image_url}
                  onChange={(e) =>
                    setForm({ ...form, image_url: e.target.value })
                  }
                  className="input-field"
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Aktif
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
