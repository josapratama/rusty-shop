import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import toast from "react-hot-toast";

interface ContactForm {
  name: string;
  email: string;
  message: string;
}

interface ContactInfo {
  icon: React.ElementType;
  label: string;
  value: string;
}

const contactInfoItems: ContactInfo[] = [
  { icon: Mail, label: "Email", value: "info@onlineshop.com" },
  { icon: Phone, label: "Telepon", value: "021-12345678" },
  {
    icon: MapPin,
    label: "Alamat",
    value: "Jl. Contoh No. 123, Jakarta Selatan",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    toast.success(
      "Pesan Anda telah terkirim. Kami akan segera menghubungi Anda.",
    );
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Hubungi Kami</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Kirim Pesan
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pesan
              </label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="input-field"
              />
            </div>
            <button type="submit" className="btn-primary">
              Kirim Pesan
            </button>
          </form>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Informasi Kontak
          </h2>
          <div className="space-y-4">
            {contactInfoItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-gray-600">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Jam Operasional
            </p>
            <p className="text-sm text-gray-600">
              Senin - Jumat: 09.00 - 17.00 WIB
            </p>
            <p className="text-sm text-gray-600">Sabtu: 09.00 - 13.00 WIB</p>
          </div>
        </div>
      </div>
    </div>
  );
}
