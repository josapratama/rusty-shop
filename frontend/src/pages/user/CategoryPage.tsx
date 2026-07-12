import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { productService } from "../../services/productService";
import { categoryService } from "../../services/categoryService";
import ProductCard from "../../components/ui/ProductCard";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type { Category, PaginatedResponse, ProductListItem } from "../../types";
import { ChevronRight } from "lucide-react";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);

  const { data: category } = useQuery<Category>({
    queryKey: ["category", slug],
    queryFn: () => categoryService.getBySlug(slug!).then((r) => r.data.data),
    enabled: !!slug,
  });

  const { data, isLoading } = useQuery<PaginatedResponse<ProductListItem>>({
    queryKey: ["products", { category: slug, page }],
    queryFn: () =>
      productService
        .list({ category: slug, page, per_page: 12 })
        .then((r) => r.data),
    enabled: !!slug,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">
          Home
        </Link>
        <ChevronRight size={14} />
        <Link to="/catalog" className="hover:text-primary-600">
          Katalog
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-900">{category?.name ?? slug}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {category?.name}
      </h1>
      {category?.description && (
        <p className="text-gray-500 mb-6">{category.description}</p>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {data?.meta?.total ?? 0} produk
          </p>
          {data?.data?.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              Belum ada produk di kategori ini
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {data?.data?.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          <Pagination meta={data?.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
