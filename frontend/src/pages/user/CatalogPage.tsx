import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productService } from "../../services/productService";
import { categoryService } from "../../services/categoryService";
import ProductCard from "../../components/ui/ProductCard";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type {
  Category,
  PaginatedResponse,
  ProductListItem,
  ProductQueryParams,
} from "../../types";
import { Filter, X } from "lucide-react";

interface Filters {
  category: string;
  search: string;
  min_price: string;
  max_price: string;
  sort: string;
}

const emptyFilters: Filters = {
  category: "",
  search: "",
  min_price: "",
  max_price: "",
  sort: "newest",
};

export default function CatalogPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);

  const queryParams: ProductQueryParams = {
    page,
    per_page: 12,
    ...(filters.category && { category: filters.category }),
    ...(filters.search && { search: filters.search }),
    ...(filters.min_price && { min_price: Number(filters.min_price) }),
    ...(filters.max_price && { max_price: Number(filters.max_price) }),
    ...(filters.sort && { sort: filters.sort }),
  };

  const { data, isLoading } = useQuery<PaginatedResponse<ProductListItem>>({
    queryKey: ["products", queryParams],
    queryFn: () => productService.list(queryParams).then((r) => r.data),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoryService.list().then((r) => r.data.data),
  });

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Katalog Produk</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="hidden sm:inline">Urutkan:</span>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange("sort", e.target.value)}
              className="input-field text-sm py-1.5 px-3 bg-white"
            >
              <option value="newest">Terbaru</option>
              <option value="price_asc">Harga: Rendah ke Tinggi</option>
              <option value="price_desc">Harga: Tinggi ke Rendah</option>
              <option value="name_asc">Nama (A - Z)</option>
            </select>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 btn-secondary md:hidden py-1.5"
          >
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside
          className={`w-64 shrink-0 space-y-6 ${showFilters ? "block" : "hidden"} md:block`}
        >
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filter</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-red-500 flex items-center gap-1"
                >
                  <X size={12} /> Reset
                </button>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="input-field text-sm"
              >
                <option value="">Semua Kategori</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harga
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Harga minimum"
                  value={filters.min_price}
                  onChange={(e) =>
                    handleFilterChange("min_price", e.target.value)
                  }
                  className="input-field text-sm"
                />
                <input
                  type="number"
                  placeholder="Harga maksimum"
                  value={filters.max_price}
                  onChange={(e) =>
                    handleFilterChange("max_price", e.target.value)
                  }
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Products */}
        <div className="flex-1">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {data?.meta?.total ?? 0} produk ditemukan
              </p>
              {data?.data?.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <p className="text-lg">Tidak ada produk ditemukan</p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-primary-600 hover:underline"
                  >
                    Reset filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {data?.data?.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
              <Pagination meta={data?.meta} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
