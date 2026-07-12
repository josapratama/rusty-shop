import api from "./api";
import type {
  AddToCartRequest,
  ApiResponse,
  Cart,
  UpdateCartItemRequest,
} from "../types";

export const cartService = {
  get: () => api.get<ApiResponse<Cart>>("/cart"),

  addItem: (data: AddToCartRequest) =>
    api.post<ApiResponse<null>>("/cart/items", data),

  updateItem: (id: string, data: UpdateCartItemRequest) =>
    api.put<ApiResponse<null>>(`/cart/items/${id}`, data),

  removeItem: (id: string) =>
    api.delete<ApiResponse<null>>(`/cart/items/${id}`),

  clear: () => api.delete<ApiResponse<null>>("/cart"),
};
