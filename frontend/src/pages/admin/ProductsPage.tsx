import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productService } from "../../services/productService";
import { categoryService } from "../../services/categoryService";
import { formatCurrency } from "../../utils/format";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Pagination from "../../components/ui/Pagination";
import type {
  Category,
  PaginatedResponse,
  ProductImageInput,
  ProductListItem,
} from "../../types";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";
import toast from "react-hot-toast";

interface ProductForm {
  category_id: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  weight: string;
  is_active: boolean;
  images: ProductImageInput[];
}

const emptyForm: ProductForm = {
  category_id: "",
  name: "",
  description: "",
  price: "",
  stock: "",
  weight: "",
  is_active: true,
  images: [{ image_url: "", is_primary: true, sort_order: 0 }],
};

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PaginatedResponse<ProductListItem>>({
    queryKey: ["admin-products", { page, search }],
    queryFn: () =>
      productService
        .adminList({ page, per_page: 15, search: search || undefined })
        .then((r) => r.data),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoryService.list().then((r) => r.data.data),
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = async (id: string) => {
    try {
      const res = await productService.adminGet(id);
      const p = res.data.data;
      setEditId(id);
      setForm({
        category_id: p.category_id,
        name: p.name,
        description: p.description ?? "",
        price: String(p.price),
        stock: String(p.stock),
        weight: p.weight ? String(p.weight) : "",
        is_active: p.is_active,
        images:
          p.images?.length > 0
            ? p.images.map((i) => ({
                image_url: i.image_url,
                is_primary: i.is_primary,
                sort_order: i.sort_order,
              }))
            : [{ image_url: "", is_primary: true, sort_order: 0 }],
      });
      setShowModal(true);
    } catch {
      toast.error("Gagal memuat data produk");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      category_id: form.category_id,
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      weight: form.weight ? parseFloat(form.weight) : undefined,
      is_active: form.is_active,
      images: form.images.filter((i) => i.image_url),
    };
    try {
      if (editId) {
        await productService.update(editId, payload);
        toast.success("Produk diperbarui");
      } else {
        await productService.create(payload);
        toast.success("Produk ditambahkan");
      }
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
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
    if (!confirm("Hapus produk ini?")) return;
    try {
      await productService.delete(id);
      toast.success("Produk dihapus");
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal menghapus";
      toast.error(msg);
    }
  };

  const updateImage = (idx: number, value: string) => {
    const imgs = [...form.images];
    imgs[idx] = { ...imgs[idx], image_url: value };
    setForm({ ...form, images: imgs });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Produk</h1>
        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      {/* Search */}
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
          placeholder="Cari produk..."
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
                    Produk
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Kategori
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Harga
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Stok
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
                {data?.data?.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            p.primary_image ??
                            "https://placehold.co/40x40?text=?"
                          }
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className="font-medium text-sm">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {p.category_name}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <span
                        className={
                          p.stock === 0 ? "text-red-600 font-medium" : ""
                        }
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          p.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(p.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
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
          <Pagination meta={data?.meta} onPageChange={setPage} />
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 my-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editId ? "Edit Produk" : "Tambah Produk"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori *
                </label>
                <select
                  required
                  value={form.category_id}
                  onChange={(e) =>
                    setForm({ ...form, category_id: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="">Pilih kategori</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Produk *
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Harga *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stok *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Berat (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.weight}
                    onChange={(e) =>
                      setForm({ ...form, weight: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Gambar
                </label>
                {form.images.map((img, idx) => (
                  <input
                    key={idx}
                    value={img.image_url}
                    onChange={(e) => updateImage(idx, e.target.value)}
                    className="input-field mb-2"
                    placeholder="https://..."
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      images: [
                        ...form.images,
                        {
                          image_url: "",
                          is_primary: false,
                          sort_order: form.images.length,
                        },
                      ],
                    })
                  }
                  className="text-sm text-primary-600 hover:underline"
                >
                  + Tambah gambar
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prod_active"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                <label htmlFor="prod_active" className="text-sm text-gray-700">
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
