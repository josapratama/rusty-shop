import api from "./api";
import type { ApiResponse, CreateReviewRequest, Review } from "../types";

export const reviewService = {
  getProductReviews: (productId: string) =>
    api.get<ApiResponse<Review[]>>(`/products/${productId}/reviews`),

  createReview: (data: CreateReviewRequest) =>
    api.post<ApiResponse<Review>>("/reviews", data),
};

