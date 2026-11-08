import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { configService, type BankAccount } from "../../services/configService";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Settings, Save, Plus, Trash2, Building, DollarSign, Phone, Store } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [shopName, setShopName] = useState("Rusty Shop");
  const [shippingRate, setShippingRate] = useState("0.5");
  const [whatsappNumber, setWhatsappNumber] = useState("6281234567890");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { bank: "BCA", account_number: "1234567890", holder_name: "Rusty Shop" },
    { bank: "Mandiri", account_number: "9876543210", holder_name: "Rusty Shop" },
  ]);
  const [saving, setSaving] = useState(false);

  const { data: configData, isLoading } = useQuery({
    queryKey: ["admin-config"],
    queryFn: () => configService.adminGet().then((r) => r.data.data),
  });

  useEffect(() => {
    if (configData) {
      if (configData.shop_name) setShopName(configData.shop_name);
      if (configData.shipping_cost_per_gram)
        setShippingRate(configData.shipping_cost_per_gram);
      if (configData.whatsapp_number)
        setWhatsappNumber(configData.whatsapp_number);
      if (configData.bank_accounts) {
        try {
          const parsed = JSON.parse(configData.bank_accounts);
          if (Array.isArray(parsed)) setBankAccounts(parsed);
        } catch (e) {
          console.error("Failed to parse bank accounts config:", e);
        }
      }
    }
  }, [configData]);

  const handleAddBank = () => {
    setBankAccounts((prev) => [
      ...prev,
      { bank: "BCA", account_number: "", holder_name: shopName },
    ]);
  };

  const handleUpdateBank = (
    index: number,
    field: keyof BankAccount,
    value: string
  ) => {
    setBankAccounts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveBank = (index: number) => {
    setBankAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await configService.adminUpdate({
        shop_name: shopName.trim(),
        shipping_cost_per_gram: shippingRate.trim(),
        whatsapp_number: whatsappNumber.trim(),
        bank_accounts: JSON.stringify(bankAccounts),
      });
      toast.success("Pengaturan toko berhasil disimpan!");
      void queryClient.invalidateQueries({ queryKey: ["admin-config"] });
      void queryClient.invalidateQueries({ queryKey: ["config"] });
    } catch {
      toast.error("Gagal menyimpan pengaturan toko");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const ratePerKg = Number(shippingRate || 0) * 1000;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="text-primary-600" size={24} />
            Pengaturan Toko
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola identitas toko, tarif ongkir per berat, dan rekening pembayaran transfer bank.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identitas Toko */}
        <div className="card p-6 shadow-sm border border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Store size={18} className="text-primary-600" />
            Informasi Umum & Kontak
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Toko
              </label>
              <input
                required
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="input-field"
                placeholder="Contoh: Rusty Shop"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Phone size={14} /> Nomor WhatsApp Customer Service
              </label>
              <input
                required
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="input-field"
                placeholder="6281234567890"
              />
              <p className="text-xs text-gray-400 mt-1">
                Gunakan format internasional tanpa tanda + (contoh: 628123456789)
              </p>
            </div>
          </div>
        </div>

        {/* Tarif Ongkos Kirim */}
        <div className="card p-6 shadow-sm border border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign size={18} className="text-primary-600" />
            Tarif Ongkos Kirim Berbasis Berat
          </h2>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tarif Ongkir per Gram (Rp)
            </label>
            <div className="flex items-center gap-3">
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={shippingRate}
                onChange={(e) => setShippingRate(e.target.value)}
                className="input-field max-w-[200px]"
                placeholder="0.5"
              />
              <span className="text-sm font-semibold text-gray-700">
                / gram
              </span>
            </div>
            <div className="mt-2.5 p-3 bg-blue-50 rounded-lg text-xs text-blue-800 border border-blue-100">
              💡 <strong>Simulasi Tarif:</strong> Rp {shippingRate || "0"}/gram setara dengan{" "}
              <strong>Rp {ratePerKg.toLocaleString("id-ID")}/kg</strong>. Ongkir dihitung otomatis saat pembeli checkout berdasarkan akumulasi berat produk di keranjang.
            </div>
          </div>
        </div>

        {/* Rekening Bank Transfer */}
        <div className="card p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Building size={18} className="text-primary-600" />
              Rekening Bank Tujuan Transfer
            </h2>
            <button
              type="button"
              onClick={handleAddBank}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-xs font-semibold hover:bg-primary-100 transition-colors"
            >
              <Plus size={14} /> Tambah Rekening
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Daftar rekening ini akan ditampilkan kepada pembeli pada instruksi pembayaran transfer bank di halaman pesanan.
          </p>

          <div className="space-y-3">
            {bankAccounts.map((acc, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="w-full sm:w-1/4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Nama Bank
                  </label>
                  <input
                    required
                    type="text"
                    value={acc.bank}
                    onChange={(e) => handleUpdateBank(idx, "bank", e.target.value)}
                    className="input-field text-sm bg-white"
                    placeholder="BCA / Mandiri / BRI"
                  />
                </div>
                <div className="w-full sm:w-2/5">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Nomor Rekening
                  </label>
                  <input
                    required
                    type="text"
                    value={acc.account_number}
                    onChange={(e) =>
                      handleUpdateBank(idx, "account_number", e.target.value)
                    }
                    className="input-field text-sm bg-white font-mono"
                    placeholder="1234567890"
                  />
                </div>
                <div className="w-full sm:w-2/5">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Atas Nama (Pemilik)
                  </label>
                  <input
                    required
                    type="text"
                    value={acc.holder_name}
                    onChange={(e) =>
                      handleUpdateBank(idx, "holder_name", e.target.value)
                    }
                    className="input-field text-sm bg-white"
                    placeholder="Nama Pemilik Rekening"
                  />
                </div>
                <div className="self-end sm:self-center pt-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => handleRemoveBank(idx)}
                    disabled={bankAccounts.length <= 1}
                    className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-30"
                    title="Hapus rekening"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 py-2.5 px-8 font-semibold shadow-md"
          >
            <Save size={16} />
            {saving ? "Menyimpan..." : "Simpan Semua Pengaturan"}
          </button>
        </div>
      </form>
    </div>
  );
}
