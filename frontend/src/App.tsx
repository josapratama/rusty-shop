import { Routes, Route } from "react-router-dom";

// Layouts
import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";

// Guards
import PrivateRoute from "./components/guards/PrivateRoute";
import AdminRoute from "./components/guards/AdminRoute";

// User Pages
import HomePage from "./pages/user/HomePage";
import CatalogPage from "./pages/user/CatalogPage";
import ProductDetailPage from "./pages/user/ProductDetailPage";
import CategoryPage from "./pages/user/CategoryPage";
import SearchPage from "./pages/user/SearchPage";
import CartPage from "./pages/user/CartPage";
import CheckoutPage from "./pages/user/CheckoutPage";
import LoginPage from "./pages/user/LoginPage";
import RegisterPage from "./pages/user/RegisterPage";
import ProfilePage from "./pages/user/ProfilePage";
import OrderHistoryPage from "./pages/user/OrderHistoryPage";
import OrderDetailPage from "./pages/user/OrderDetailPage";
import AboutPage from "./pages/user/AboutPage";
import ContactPage from "./pages/user/ContactPage";
import FaqPage from "./pages/user/FaqPage";
import PrivacyPage from "./pages/user/PrivacyPage";
import TermsPage from "./pages/user/TermsPage";

// Admin Pages
import AdminDashboard from "./pages/admin/DashboardPage";
import AdminCategories from "./pages/admin/CategoriesPage";
import AdminProducts from "./pages/admin/ProductsPage";
import AdminUsers from "./pages/admin/UsersPage";
import AdminOrders from "./pages/admin/OrdersPage";
import AdminReports from "./pages/admin/ReportsPage";
import AdminLoginPage from "./pages/admin/LoginPage";

export default function App() {
  return (
    <Routes>
      {/* Admin Login */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      {/* User Routes */}
      <Route path="/" element={<UserLayout />}>
        <Route index element={<HomePage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />

        {/* Protected user routes */}
        <Route
          path="cart"
          element={
            <PrivateRoute>
              <CartPage />
            </PrivateRoute>
          }
        />
        <Route
          path="checkout"
          element={
            <PrivateRoute>
              <CheckoutPage />
            </PrivateRoute>
          }
        />
        <Route
          path="profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="orders"
          element={
            <PrivateRoute>
              <OrderHistoryPage />
            </PrivateRoute>
          }
        />
        <Route
          path="orders/:id"
          element={
            <PrivateRoute>
              <OrderDetailPage />
            </PrivateRoute>
          }
        />
      </Route>
    </Routes>
  );
}
