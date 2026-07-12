import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../services/userService";
import { addressService } from "../../services/addressService";
import { useAuthStore } from "../../store/authStore";
import type {
  Address,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from "../../types";
import toast from "react-hot-toast";
import { User, MapPin, Lock, Trash2 } from "lucide-react";

type Tab = "profile" | "addresses" | "password";

interface TabItem {
  id: Tab;
  label: string;
  icon: React.ElementType;
}

const tabs: TabItem[] = [
  { id: "profile", label: "Profil", icon: User },
  { id: "addresses", label: "Alamat", icon: MapPin },
  { id: "password", label: "Password", icon: Lock },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { user, setAuth, token } = useAuthStore();
  const queryClient = useQueryClient();

  const [profileForm, setProfileForm] = useState<UpdateProfileRequest>({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
  });
  const [passwordForm, setPasswordForm] = useState<ChangePasswordRequest>({
    current_password: "",
    new_password: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: addresses, refetch: refetchAddresses } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: () => addressService.list().then((r) => r.data.data),
    enabled: activeTab === "addresses",
  });

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await userService.updateProfile(profileForm);
      if (user && token) {
        setAuth({ ...user, ...res.data.data }, token);
      }
      toast.success("Profil berhasil diperbarui");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal memperbarui profil";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.changePassword(passwordForm);
      toast.success("Password berhasil diubah");
      setPasswordForm({ current_password: "", new_password: "" });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal mengubah password";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Hapus alamat ini?")) return;
    try {
      await addressService.delete(id);
      toast.success("Alamat dihapus");
      void refetchAddresses();
    } catch {
      toast.error("Gagal menghapus alamat");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Akun Saya</h1>

      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "profile" && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Informasi Profil
              </h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    value={profileForm.name ?? ""}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, name: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    value={user?.email ?? ""}
                    disabled
                    className="input-field bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. Telepon
                  </label>
                  <input
                    value={profileForm.phone ?? ""}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                    className="input-field"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "addresses" && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Alamat Tersimpan
              </h2>
              {addresses?.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  Belum ada alamat tersimpan
                </p>
              ) : (
                <div className="space-y-3">
                  {addresses?.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {addr.recipient_name}
                            </span>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {addr.label}
                            </span>
                            {addr.is_default && (
                              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                                Utama
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{addr.phone}</p>
                          <p className="text-sm text-gray-600">
                            {addr.address_line}, {addr.city}, {addr.province}{" "}
                            {addr.postal_code}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "password" && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Ubah Password
              </h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Saat Ini
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        current_password: e.target.value,
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        new_password: e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="Minimal 6 karakter"
                  />
                </div>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Menyimpan..." : "Ubah Password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
