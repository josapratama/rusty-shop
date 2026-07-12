export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Kebijakan Privasi
      </h1>
      <div className="space-y-6 text-gray-600">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            1. Informasi yang Kami Kumpulkan
          </h2>
          <p>
            Kami mengumpulkan informasi yang Anda berikan saat mendaftar,
            seperti nama, email, nomor telepon, dan alamat pengiriman.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            2. Penggunaan Informasi
          </h2>
          <p>
            Informasi Anda digunakan untuk memproses pesanan, mengirimkan
            konfirmasi, dan meningkatkan layanan kami.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            3. Keamanan Data
          </h2>
          <p>
            Kami menggunakan enkripsi dan langkah keamanan standar industri
            untuk melindungi data pribadi Anda.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            4. Berbagi Data
          </h2>
          <p>
            Kami tidak menjual atau membagikan data pribadi Anda kepada pihak
            ketiga tanpa persetujuan Anda.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            5. Hak Pengguna
          </h2>
          <p>
            Anda berhak mengakses, memperbarui, atau menghapus data pribadi Anda
            dengan menghubungi kami.
          </p>
        </section>
      </div>
    </div>
  );
}
