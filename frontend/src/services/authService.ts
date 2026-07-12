import api from "./api";
import type {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "../types";

export const authService = {
  register: (data: RegisterRequest) =>
    api.post<ApiResponse<AuthResponse>>("/auth/register", data),

  login: (data: LoginRequest) =>
    api.post<ApiResponse<AuthResponse>>("/auth/login", data),

  me: () => api.get<ApiResponse<User>>("/auth/me"),
};
