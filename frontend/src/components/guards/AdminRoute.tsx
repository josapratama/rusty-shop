import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface Props {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: Props) {
  const { token, user } = useAuthStore();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
