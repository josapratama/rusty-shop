import api from "./api";
import type {
  ApiResponse,
  CheckoutRequest,
  Order,
  OrderListItem,
  OrderQueryParams,
  OrderStatus,
  PaginatedResponse,
  UpdateOrderStatusRequest,
} from "../types";

export const orderService = {
  checkout: (data: CheckoutRequest) =>
    api.post<ApiResponse<Order>>("/orders", data),

  list: (params?: OrderQueryParams) =>
    api.get<PaginatedResponse<OrderListItem>>("/orders", { params }),

  get: (id: string) => api.get<ApiResponse<Order>>(`/orders/${id}`),

  // Admin
  adminList: (params?: OrderQueryParams) =>
    api.get<PaginatedResponse<OrderListItem>>("/admin/orders", { params }),

  adminGet: (id: string) => api.get<ApiResponse<Order>>(`/admin/orders/${id}`),

  updateStatus: (id: string, status: OrderStatus) =>
    api.patch<ApiResponse<Order>>(`/admin/orders/${id}/status`, {
      status,
    } satisfies UpdateOrderStatusRequest),
};
