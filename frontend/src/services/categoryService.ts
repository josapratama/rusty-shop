import api from "./api";
import type {
  ApiResponse,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../types";

export const categoryService = {
  list: () => api.get<ApiResponse<Category[]>>("/categories"),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<Category>>(`/categories/${slug}`),

  // Admin
  adminList: () => api.get<ApiResponse<Category[]>>("/admin/categories"),

  create: (data: CreateCategoryRequest) =>
    api.post<ApiResponse<Category>>("/admin/categories", data),

  update: (id: string, data: UpdateCategoryRequest) =>
    api.put<ApiResponse<Category>>(`/admin/categories/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/categories/${id}`),
};
