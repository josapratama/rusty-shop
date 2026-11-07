import api from "./api";
import type {
  ApiResponse,
  Coupon,
  CouponValidationResponse,
  CreateCouponRequest,
  UpdateCouponRequest,
} from "../types";

export const couponService = {
  validate: (code: string, subtotal: number) =>
    api.post<ApiResponse<CouponValidationResponse>>("/coupons/validate", {
      code,
      subtotal,
    }),

  adminList: () => api.get<ApiResponse<Coupon[]>>("/admin/coupons"),

  adminCreate: (data: CreateCouponRequest) =>
    api.post<ApiResponse<Coupon>>("/admin/coupons", data),

  adminUpdate: (id: string, data: UpdateCouponRequest) =>
    api.put<ApiResponse<Coupon>>(`/admin/coupons/${id}`, data),

  adminDelete: (id: string) => api.delete(`/admin/coupons/${id}`),
};

