import { Topbar } from '../components/layout/Topbar'

const sources = [
  {
    name: 'LewatMana',
    url: 'https://lewatmana.com/',
    note: 'Halaman CCTV publik; stream via player mereka.',
  },
  {
    name: 'Jakarta Smart City (jakcctv)',
    url: 'https://jakcctv.jakarta.go.id/publik',
    note: 'Portal CCTV publik resmi DKI (~52 kamera, embed Balitower). Domain lama cctv.jakarta.go.id tidak aktif.',
  },
  {
    name: 'Molecool',
    url: 'https://www.molecool.id/live-cctv',
    note: 'Akses penuh memerlukan Sign In aplikasi.',
  },
  {
    name: 'Bina Marga',
    url: 'https://binamarga.pu.go.id/contents/cctv_tol',
    note: 'Portal CCTV tol; audit otomatis sempat timeout.',
  },
]

export function AboutPage() {
  return (
    <div>
      <Topbar title="Tentang HI VISION" />
      <div className="mx-auto max-w-3xl space-y-6 p-4 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-base font-medium">Apa ini?</h2>
          <p className="text-[var(--muted)]">
            HI VISION adalah aggregator independen untuk menemukan dan membuka
            sumber CCTV publik di sekitar Bundaran HI dan koridor Jakarta
            (Thamrin, Sudirman, Dukuh Atas, Semanggi, Monas). Bukan produk
            resmi pemerintah, dan tidak berafiliasi dengan Jakarta Smart City,
            LewatMana, Molecool, Bina Marga, atau Jasa Marga.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium">Sumber & batasan</h2>
          <ul className="list-disc space-y-2 pl-5 text-[var(--muted)]">
            <li>Kamera dioperasikan oleh pihak ketiga.</li>
            <li>Ketersediaan, syarat, dan akses bisa berubah sewaktu-waktu.</li>
            <li>
              Jika embed/stream resmi tidak tersedia, aplikasi mengarahkan ke
              halaman penyedia.
            </li>
            <li>
              Status default adalah &quot;tidak diketahui&quot; kecuali ada
              pengecekan nyata.
            </li>
            <li>
              Tidak ada rekaman ulang, proxy bypass, face recognition, atau
              pelacakan individu.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium">Atribusi sumber</h2>
          <ul className="space-y-3">
            {sources.map((s) => (
              <li
                key={s.url}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4"
              >
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--accent)]"
                >
                  {s.name}
                </a>
                <p className="mt-1 text-[var(--muted)]">{s.note}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-xs text-[var(--muted)]">
          Detail audit teknis: lihat <code>docs/source-audit.md</code>.
        </p>
      </div>
    </div>
  )
}
