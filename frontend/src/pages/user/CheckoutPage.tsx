import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cartService } from "../../services/cartService";
import { addressService } from "../../services/addressService";
import { orderService } from "../../services/orderService";
import { couponService } from "../../services/couponService";
import { formatCurrency } from "../../utils/format";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import type {
  Address,
  Cart,
  CouponValidationResponse,
  CreateAddressRequest,
  PaymentMethod,
} from "../../types";
import { Plus, MapPin, CreditCard, Tag, Check, X } from "lucide-react";
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

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResponse | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

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
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddress) {
      const def = addresses.find((a) => a.is_default) ?? addresses[0];
      setSelectedAddress(def.id);
    }
  }, [addresses, selectedAddress]);

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

  const handleApplyCoupon = async (e: FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim();
    if (!code) return;
    const subtotal = cart?.total ?? 0;
    setValidatingCoupon(true);
    try {
      const res = await couponService.validate(code, subtotal);
      setAppliedCoupon(res.data.data);
      toast.success(`Kupon ${res.data.data.code} berhasil digunakan!`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Kupon tidak valid";
      toast.error(msg);
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.success("Kupon dibatalkan");
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
        coupon_code: appliedCoupon?.code,
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

  const subtotal = cart?.total ?? 0;
  const discountAmount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount);

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
                className="text-sm text-primary-600 flex items-center gap-1 hover:underline font-medium"
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
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100"
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn-primary text-sm py-1.5 px-4">
                    Simpan Alamat
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {addresses?.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAddress === addr.id
                      ? "border-primary-500 bg-primary-50/30"
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
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {addr.recipient_name}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {addr.label}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-0.5">{addr.phone}</p>
                    <p className="text-gray-600 mt-0.5">
                      {addr.address_line}, {addr.city}, {addr.province}{" "}
                      {addr.postal_code}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-primary-600" />
              Metode Pembayaran
            </h3>
            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === method.value
                      ? "border-primary-500 bg-primary-50/30"
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
        <div className="space-y-4">
          {/* Coupon Input Card */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Tag size={16} className="text-primary-600" />
              Kupon Promo / Diskon
            </h3>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-green-700 text-sm">
                    <Check size={16} />
                    {appliedCoupon.code}
                  </div>
                  <p className="text-xs text-green-600 mt-0.5">
                    Hemat {formatCurrency(appliedCoupon.discount_amount)}
                  </p>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-gray-400 hover:text-red-500 p-1"
                  title="Hapus kupon"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Kode kupon (contoh: DISKON10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="input-field text-sm flex-1 uppercase"
                />
                <button
                  type="submit"
                  disabled={validatingCoupon || !couponCode.trim()}
                  className="btn-primary text-sm px-4 py-2"
                >
                  {validatingCoupon ? "..." : "Pakai"}
                </button>
              </form>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Coba kode: <strong>DISKON10</strong> atau <strong>HEMAT20RB</strong>
            </p>
          </div>

          {/* Order Summary */}
          <div className="card p-5 h-fit">
            <h3 className="font-semibold text-gray-900 mb-4">
              Ringkasan Pesanan
            </h3>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate mr-2">
                    {item.product_name} x{item.quantity}
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Diskon Kupon ({appliedCoupon.code})</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Ongkos kirim</span>
                <span className="text-gray-500 text-xs">(Dihitung saat pesanan dibuat)</span>
              </div>
            </div>
            <div className="border-t mt-3 pt-3">
              <div className="flex justify-between font-bold text-lg">
                <span>Total Estimasi</span>
                <span className="text-primary-600">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={loading || !selectedAddress}
              className="btn-primary w-full py-3 mt-4 font-semibold text-base"
            >
              {loading ? "Memproses..." : "Buat Pesanan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
