export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Tentang Kami</h1>
      <div className="space-y-4 text-gray-600">
        <p>
          Online Shop adalah toko online terpercaya yang menyediakan berbagai
          produk berkualitas dengan harga yang terjangkau. Kami berkomitmen
          untuk memberikan pengalaman belanja yang mudah, aman, dan
          menyenangkan.
        </p>
        <p>
          Didirikan dengan semangat untuk memudahkan masyarakat dalam
          berbelanja, kami terus berinovasi untuk menghadirkan layanan terbaik
          bagi pelanggan kami.
        </p>
        <h2 className="text-xl font-semibold text-gray-900 mt-6">
          Visi & Misi
        </h2>
        <p>
          <strong>Visi:</strong> Menjadi toko online terpercaya dan terdepan di
          Indonesia.
        </p>
        <p>
          <strong>Misi:</strong> Menyediakan produk berkualitas dengan harga
          terjangkau dan layanan pelanggan yang prima.
        </p>
        <h2 className="text-xl font-semibold text-gray-900 mt-6">
          Mengapa Belanja di Sini?
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Produk berkualitas dan terjamin keasliannya</li>
          <li>Harga kompetitif dan transparan</li>
          <li>Proses pemesanan yang mudah dan cepat</li>
          <li>Layanan pelanggan yang responsif</li>
          <li>Pengiriman ke seluruh Indonesia</li>
        </ul>
      </div>
    </div>
  );
}
