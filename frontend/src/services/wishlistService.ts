import api from "./api";
import type { ApiResponse, WishlistItem } from "../types";

export const wishlistService = {
  list: () => api.get<ApiResponse<WishlistItem[]>>("/wishlist"),

  getIds: () => api.get<ApiResponse<string[]>>("/wishlist/ids"),

  toggle: (productId: string) =>
    api.post<ApiResponse<{ in_wishlist: boolean; product_id: string }>>(
      `/wishlist/${productId}`
    ),
};

