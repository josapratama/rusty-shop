import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

const faqs: FaqItem[] = [
  {
    q: "Bagaimana cara memesan produk?",
    a: "Pilih produk yang diinginkan, tambahkan ke keranjang, lalu lanjutkan ke checkout. Isi alamat pengiriman dan pilih metode pembayaran.",
  },
  {
    q: "Metode pembayaran apa yang tersedia?",
    a: "Kami menerima pembayaran via transfer bank (BCA, Mandiri, BNI, BRI) dan bayar di tempat (COD).",
  },
  {
    q: "Berapa lama pengiriman?",
    a: "Estimasi pengiriman 2-5 hari kerja tergantung lokasi tujuan.",
  },
  {
    q: "Apakah bisa melacak pesanan?",
    a: "Ya, Anda bisa memantau status pesanan di halaman Riwayat Pesanan setelah login.",
  },
  {
    q: "Bagaimana jika produk yang diterima rusak?",
    a: "Hubungi kami dalam 24 jam setelah menerima produk dengan menyertakan foto kerusakan. Kami akan segera menindaklanjuti.",
  },
  {
    q: "Apakah bisa membatalkan pesanan?",
    a: 'Pesanan bisa dibatalkan selama masih berstatus "Menunggu Pembayaran". Hubungi kami untuk proses pembatalan.',
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">FAQ</h1>
      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <div key={idx} className="card overflow-hidden">
            <button
              onClick={() => setOpen(open === idx ? null : idx)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-medium text-gray-900">{faq.q}</span>
              {open === idx ? (
                <ChevronUp size={18} className="text-gray-500 shrink-0" />
              ) : (
                <ChevronDown size={18} className="text-gray-500 shrink-0" />
              )}
            </button>
            {open === idx && (
              <div className="px-4 pb-4 text-gray-600 text-sm border-t border-gray-100 pt-3">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
