import api from "./api";
import type {
  ApiResponse,
  CreateProductRequest,
  PaginatedResponse,
  ProductDetail,
  ProductListItem,
  ProductQueryParams,
  UpdateProductRequest,
} from "../types";

export const productService = {
  list: (params?: ProductQueryParams) =>
    api.get<PaginatedResponse<ProductListItem>>("/products", { params }),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<ProductDetail>>(`/products/${slug}`),

  getRelated: (slug: string) =>
    api.get<ApiResponse<ProductListItem[]>>(`/products/${slug}/related`),

  // Admin
  adminList: (params?: ProductQueryParams) =>
    api.get<PaginatedResponse<ProductListItem>>("/admin/products", { params }),

  adminGet: (id: string) =>
    api.get<ApiResponse<ProductDetail>>(`/admin/products/${id}`),

  create: (data: CreateProductRequest) =>
    api.post<ApiResponse<ProductDetail>>("/admin/products", data),

  update: (id: string, data: UpdateProductRequest) =>
    api.put<ApiResponse<ProductDetail>>(`/admin/products/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/products/${id}`),
};
