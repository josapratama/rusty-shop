import api from "./api";
import type {
  Address,
  ApiResponse,
  CreateAddressRequest,
  UpdateAddressRequest,
} from "../types";

export const addressService = {
  list: () => api.get<ApiResponse<Address[]>>("/addresses"),

  create: (data: CreateAddressRequest) =>
    api.post<ApiResponse<Address>>("/addresses", data),

  update: (id: string, data: UpdateAddressRequest) =>
    api.put<ApiResponse<Address>>(`/addresses/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse<null>>(`/addresses/${id}`),
};
