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

  cancel: (id: string) =>
    api.post<
      ApiResponse<{
        id: string;
        order_number: string;
        status: string;
        updated_at: string;
      }>
    >(`/orders/${id}/cancel`),

  /** Upload a payment proof image file, returns the public URL */
  uploadPaymentProof: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<ApiResponse<{ url: string }>>(
      "/upload/payment-proof",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
  },

  /** Attach an uploaded payment proof URL to an order */
  setPaymentProof: (orderId: string, paymentProofUrl: string) =>
    api.post<ApiResponse<{ message: string }>>(
      `/orders/${orderId}/payment-proof`,
      {
        payment_proof_url: paymentProofUrl,
      },
    ),

  // Admin
  adminList: (params?: OrderQueryParams) =>
    api.get<PaginatedResponse<OrderListItem>>("/admin/orders", { params }),

  adminGet: (id: string) => api.get<ApiResponse<Order>>(`/admin/orders/${id}`),

  updateStatus: (id: string, status: OrderStatus) =>
    api.patch<ApiResponse<Order>>(`/admin/orders/${id}/status`, {
      status,
    } satisfies UpdateOrderStatusRequest),
};
