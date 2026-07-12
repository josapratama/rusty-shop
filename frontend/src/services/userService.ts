import api from "./api";
import type {
  AdminUser,
  ApiResponse,
  ChangePasswordRequest,
  PaginatedResponse,
  UpdateProfileRequest,
  User,
} from "../types";

export interface UserQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export const userService = {
  getProfile: () => api.get<ApiResponse<User>>("/profile"),

  updateProfile: (data: UpdateProfileRequest) =>
    api.put<ApiResponse<User>>("/profile", data),

  changePassword: (data: ChangePasswordRequest) =>
    api.put<ApiResponse<null>>("/profile/password", data),

  // Admin
  adminList: (params?: UserQueryParams) =>
    api.get<PaginatedResponse<AdminUser>>("/admin/users", { params }),

  toggleStatus: (id: string) =>
    api.patch<ApiResponse<AdminUser>>(`/admin/users/${id}/toggle-status`),
};
