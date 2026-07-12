// ============================================================
// Domain Types
// ============================================================

export type UserRole = "user" | "admin";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export type PaymentMethod = "bank_transfer" | "cash_on_delivery";

// ============================================================
// User
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// ============================================================
// Auth
// ============================================================

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

// ============================================================
// Category
// ============================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
}

// ============================================================
// Product
// ============================================================

export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  category_name: string;
  category_slug: string;
  primary_image: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface ProductDetail {
  id: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  weight: number | null;
  is_active: boolean;
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface ProductImageInput {
  image_url: string;
  is_primary?: boolean;
  sort_order?: number;
}

export interface CreateProductRequest {
  category_id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  weight?: number;
  is_active?: boolean;
  images?: ProductImageInput[];
}

export interface UpdateProductRequest {
  category_id?: string;
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  weight?: number;
  is_active?: boolean;
  images?: ProductImageInput[];
}

export interface ProductQueryParams {
  page?: number;
  per_page?: number;
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
}

// ============================================================
// Cart
// ============================================================

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image: string | null;
  price: number;
  quantity: number;
  stock: number;
  subtotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total: number;
}

export interface AddToCartRequest {
  product_id: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

// ============================================================
// Address
// ============================================================

export interface Address {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
}

export interface CreateAddressRequest {
  label?: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
  is_default?: boolean;
}

export interface UpdateAddressRequest {
  label?: string;
  recipient_name?: string;
  phone?: string;
  address_line?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  is_default?: boolean;
}

// ============================================================
// Order
// ============================================================

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_proof: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_province: string;
  shipping_postal: string;
  notes: string | null;
  items?: OrderItem[];
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderListItem {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  shipping_cost: number;
  total: number;
  user_name?: string;
  user_email?: string;
  created_at: string;
}

export interface CheckoutRequest {
  address_id: string;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface OrderQueryParams {
  page?: number;
  per_page?: number;
  status?: OrderStatus;
}

// ============================================================
// Pagination
// ============================================================

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ============================================================
// Admin
// ============================================================

export interface DashboardStats {
  total_users: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  recent_orders: OrderListItem[];
}

export interface MonthlySale {
  month: string | null;
  order_count: number;
  revenue: number | null;
}

export interface TopProduct {
  product_name: string;
  total_sold: number;
  total_revenue: number | null;
}

export interface OrderStatusSummary {
  status: OrderStatus;
  count: number;
}

export interface SalesReport {
  monthly_sales: MonthlySale[];
  top_products: TopProduct[];
  order_status_summary: OrderStatusSummary[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// ============================================================
// Profile
// ============================================================

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
