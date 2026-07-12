import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cartService } from "../../services/cartService";
import { addressService } from "../../services/addressService";
import { orderService } from "../../services/orderService";
import { formatCurrency } from "../../utils/format";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type {
  Address,
  Cart,
  CreateAddressRequest,
  PaymentMethod,
} from "../../types";
import { Plus, MapPin, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

interface PaymentOption {
  value: PaymentMethod;
  label: string;
  desc: string;
}

const PAYMENT_METHODS: PaymentOption[] = [
  {
    value: "bank_transfer",
    label: "Transfer Bank",
    desc: "BCA, Mandiri, BNI, BRI",
  },
  {
    value: "cash_on_delivery",
    label: "Bayar di Tempat (COD)",
    desc: "Bayar saat barang tiba",
  },
];

const emptyAddress: CreateAddressRequest = {
  label: "Rumah",
  recipient_name: "",
  phone: "",
  address_line: "",
  city: "",
  province: "",
  postal_code: "",
  is_default: false,
};

export default function CheckoutPage() {
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("bank_transfer");
  const [notes, setNotes] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] =
    useState<CreateAddressRequest>(emptyAddress);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cart, isLoading: loadingCart } = useQuery<Cart>({
    queryKey: ["cart"],
    queryFn: () => cartService.get().then((r) => r.data.data),
  });

  const {
    data: addresses,
    isLoading: loadingAddresses,
    refetch: refetchAddresses,
  } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: () => addressService.list().then((r) => r.data.data),
  });

  // Auto-select default address
  useState(() => {
    if (addresses && addresses.length > 0 && !selectedAddress) {
      const def = addresses.find((a) => a.is_default) ?? addresses[0];
      setSelectedAddress(def.id);
    }
  });

  const handleAddAddress = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addressService.create(newAddress);
      toast.success("Alamat ditambahkan");
      setShowAddressForm(false);
      setNewAddress(emptyAddress);
      const result = await refetchAddresses();
      if (result.data && result.data.length > 0 && !selectedAddress) {
        setSelectedAddress(result.data[0].id);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal menambahkan alamat";
      toast.error(msg);
    }
  };

  const handleCheckout = async () => {
    if (!selectedAddress) {
      toast.error("Pilih alamat pengiriman terlebih dahulu");
      return;
    }
    setLoading(true);
    try {
      const res = await orderService.checkout({
        address_id: selectedAddress,
        payment_method: paymentMethod,
        notes: notes || undefined,
      });
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Pesanan berhasil dibuat!");
      navigate(`/orders/${res.data.data.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Checkout gagal";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingCart || loadingAddresses) return <LoadingSpinner />;

  const items = cart?.items ?? [];
  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Address */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin size={18} className="text-primary-600" />
                Alamat Pengiriman
              </h3>
              <button
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-sm text-primary-600 flex items-center gap-1 hover:underline"
              >
                <Plus size={14} /> Tambah Alamat
              </button>
            </div>

            {showAddressForm && (
              <form
                onSubmit={handleAddAddress}
                className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Label
                    </label>
                    <input
                      value={newAddress.label ?? ""}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, label: e.target.value })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nama Penerima *
                    </label>
                    <input
                      required
                      value={newAddress.recipient_name}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          recipient_name: e.target.value,
                        })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    No. Telepon *
                  </label>
                  <input
                    required
                    value={newAddress.phone}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, phone: e.target.value })
                    }
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Alamat Lengkap *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={newAddress.address_line}
                    onChange={(e) =>
                      setNewAddress({
                        ...newAddress,
                        address_line: e.target.value,
                      })
                    }
                    className="input-field text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Kota *
                    </label>
                    <input
                      required
                      value={newAddress.city}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, city: e.target.value })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Provinsi *
                    </label>
                    <input
                      required
                      value={newAddress.province}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          province: e.target.value,
                        })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Kode Pos *
                    </label>
                    <input
                      required
                      value={newAddress.postal_code}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          postal_code: e.target.value,
                        })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-sm py-1.5">
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="btn-secondary text-sm py-1.5"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {addresses?.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  Belum ada alamat. Tambahkan alamat pengiriman.
                </p>
              ) : (
                addresses?.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedAddress === addr.id
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddress === addr.id}
                      onChange={() => setSelectedAddress(addr.id)}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
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
                      <p className="text-gray-600 mt-0.5">{addr.phone}</p>
                      <p className="text-gray-600">
                        {addr.address_line}, {addr.city}, {addr.province}{" "}
                        {addr.postal_code}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <CreditCard size={18} className="text-primary-600" />
              Metode Pembayaran
            </h3>
            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.value}
                  className={`flex gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    paymentMethod === method.value
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-sm">{method.label}</p>
                    <p className="text-xs text-gray-500">{method.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">
              Catatan (opsional)
            </h3>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan untuk penjual..."
              className="input-field text-sm"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="card p-5 h-fit">
          <h3 className="font-semibold text-gray-900 mb-4">
            Ringkasan Pesanan
          </h3>
          <div className="space-y-2 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate mr-2">
                  {item.product_name} x{item.quantity}
                </span>
                <span className="shrink-0">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(cart?.total ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ongkos kirim</span>
              <span className="text-green-600">Gratis</span>
            </div>
          </div>
          <div className="border-t mt-3 pt-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary-600">
                {formatCurrency(cart?.total ?? 0)}
              </span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading || !selectedAddress}
            className="btn-primary w-full py-3 mt-4"
          >
            {loading ? "Memproses..." : "Buat Pesanan"}
          </button>
        </div>
      </div>
    </div>
  );
}
