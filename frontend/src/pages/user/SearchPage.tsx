import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { productService } from "../../services/productService";
import ProductCard from "../../components/ui/ProductCard";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { PaginatedResponse, ProductListItem } from "../../types";
import { Search } from "lucide-react";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const query = searchParams.get("q") ?? "";

  useEffect(() => {
    setPage(1);
  }, [query]);

  const { data, isLoading } = useQuery<PaginatedResponse<ProductListItem>>({
    queryKey: ["products", { search: query, page }],
    queryFn: () =>
      productService
        .list({ search: query, page, per_page: 12 })
        .then((r) => r.data),
    enabled: !!query,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hasil pencarian: <span className="text-primary-600">"{query}"</span>
        </h1>
        {data && (
          <p className="text-gray-500 mt-1">
            {data.meta?.total ?? 0} produk ditemukan
          </p>
        )}
      </div>

      {!query ? (
        <div className="text-center py-16 text-gray-500">
          <Search size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Masukkan kata kunci untuk mencari produk</p>
        </div>
      ) : isLoading ? (
        <LoadingSpinner />
      ) : data?.data?.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Search size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Tidak ada produk yang cocok</p>
          <p className="text-sm mt-1">Coba kata kunci yang berbeda</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data?.data?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination meta={data?.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
