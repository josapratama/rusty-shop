import api from "./api";
import type { ApiResponse, DashboardStats, SalesReport } from "../types";

export const adminService = {
  getDashboard: () => api.get<ApiResponse<DashboardStats>>("/admin/dashboard"),

  getReports: () => api.get<ApiResponse<SalesReport>>("/admin/reports"),
};
