import { school as defaultSchool } from "../data/school";

function formatTTL(s) {
  if (!s.tanggalLahir) return s.tempatLahir || "-";
  try {
    const d = new Date(s.tanggalLahir);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${s.tempatLahir}, ${dd}-${mm}-${yyyy}`;
  } catch {
    return `${s.tempatLahir}, ${s.tanggalLahir}`;
  }
}

export function CardFront({ siswa, school, scale = 1 }) {
  const ttl = formatTTL(siswa);
  const sch = school || defaultSchool;
  return (
    <div
      className="relative bg-white rounded-[10px] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.12)] border border-gray-200 flex flex-col"
      style={{
        width: `${85.6 * scale}mm`,
        height: `${53.98 * scale}mm`,
        fontFamily: "Poppins, sans-serif",
      }}
    >
      {/* Header hijau */}
      <div className="bg-[#0e7a4b] text-white px-2 py-[5px] flex items-center gap-2">
        <img
          src={sch.logoMijafa}
          alt="logo mijafa"
          className="w-[28px] h-[28px] rounded-full bg-white object-cover p-[1px] shrink-0"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <div className="flex-1 min-w-0 text-center leading-none">
          <div className="text-[6.5px] tracking-[0.6px] font-semibold opacity-90">YAYASAN PENDIDIKAN ISLAM JAMIYATUL FALAH</div>
          <div className="text-[8.5px] font-bold tracking-wide leading-tight">MADRASAH IBTIDAIYAH JAMIYATUL FALAH</div>
          <div className="text-[5.5px] opacity-90 leading-tight">Jl. Pusponegoro No.62 Kedungneng - Losari - Brebes 52255 • Terakreditasi B</div>
        </div>
        <img
          src={sch.logoYayasan}
          alt="logo yayasan"
          className="w-[28px] h-[28px] rounded-full bg-white object-cover p-[1px] shrink-0"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      </div>

      {/* Title KARTU PELAJAR */}
      <div className="bg-[#f4b400] text-[#1a1a1a] text-center py-[2px]">
        <div className="text-[7px] font-bold tracking-[1.2px]">KARTU PELAJAR • STUDENT CARD</div>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-2 p-2">
        {/* Foto - QR dan KELAS dihapus sesuai permintaan */}
        <div className="w-[22mm] shrink-0 flex flex-col items-center">
          <div className="w-full h-[30mm] rounded-[6px] overflow-hidden border-2 border-[#0e7a4b] bg-gray-100 relative">
            {siswa.foto ? (
              <img src={siswa.foto} alt={siswa.nama} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-200">
                <span className="text-[18px]">👤</span>
                <span className="text-[5px] font-medium">FOTO 3×4</span>
              </div>
            )}
          </div>
        </div>

        {/* Data */}
        <div className="flex-1 min-w-0 flex flex-col gap-[2.5px] justify-center">
          <div>
            <div className="text-[5px] text-[#0e7a4b] font-semibold tracking-widest">NAMA LENGKAP</div>
            <div className="text-[8.5px] font-bold leading-tight text-[#1a1a1a] uppercase line-clamp-2">{siswa.nama}</div>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-[2px]">
            <div>
              <div className="text-[4.5px] text-gray-500 font-semibold tracking-wide">NISN</div>
              <div className="text-[6.5px] font-bold font-mono text-[#1a1a1a]">{siswa.nisn || "-"}</div>
            </div>
            <div>
              <div className="text-[4.5px] text-gray-500 font-semibold tracking-wide">NO. INDUK</div>
              <div className="text-[6px] font-bold font-mono text-[#1a1a1a] leading-none">{siswa.noInduk || "-"}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[4.5px] text-gray-500 font-semibold tracking-wide">TEMPAT, TANGGAL LAHIR</div>
              <div className="text-[6px] font-semibold text-[#1a1a1a] leading-tight">{ttl}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[4.5px] text-gray-500 font-semibold tracking-wide">ALAMAT</div>
              <div className="text-[6px] font-medium text-[#1a1a1a] leading-tight line-clamp-2">{siswa.alamat || "Kedungneng, Losari, Brebes"}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[5px] bg-[#0e7a4b] text-white px-2 py-0.5 rounded-full font-bold">Berlaku selama menjadi siswa</span>
          </div>
        </div>
      </div>

      {/* Footer line */}
      <div className="h-[3px] bg-gradient-to-r from-[#0e7a4b] via-[#f4b400] to-[#0e7a4b]" />
    </div>
  );
}

export function CardBack({ siswa, school }) {
  const sch = school || defaultSchool;
  return (
    <div
      className="relative bg-white rounded-[10px] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.12)] border border-gray-200 flex flex-col p-2"
      style={{
        width: "85.6mm",
        height: "53.98mm",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div className="flex-1 flex gap-2">
        <div className="flex-1">
          <div className="text-[6px] font-bold text-[#0e7a4b] tracking-widest border-b border-[#f4b400] pb-0.5 mb-1">TATA TERTIB & PERATURAN</div>
          <ol className="text-[5px] leading-[1.4] text-gray-700 space-y-0.5 list-decimal pl-3">
            {sch.peraturan.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
          <div className="mt-1 bg-[#f0fdf4] border border-[#0e7a4b]/20 rounded p-1">
            <div className="text-[5px] font-bold text-[#0e7a4b]">ALAMAT SEKOLAH</div>
            <div className="text-[5px] leading-tight text-gray-700">
              {sch.alamat}, {sch.desa}, Kec. {sch.kecamatan}, Kab. {sch.kabupaten} {sch.kodePos}
              <br />
              Telp. {sch.telepon} • {sch.email}
            </div>
          </div>
        </div>

        <div className="w-[32mm] flex flex-col items-center justify-between text-center shrink-0">
          <div className="text-[5px] text-gray-500">Kedungneng, {new Date().getFullYear()}</div>
          <div className="space-y-1">
            <div className="text-[5px] font-semibold text-[#1a1a1a]">{sch.kepalaMadrasah.includes(",") ? sch.kepalaMadrasah : `${sch.kepalaMadrasah}`}</div>
            <div className="w-16 h-8 mx-auto border-b border-dashed border-gray-300 flex items-center justify-center text-[10px] opacity-40">✍️</div>
            <div className="text-[5px] font-bold text-[#0e7a4b]">Kepala Madrasah</div>
            {sch.nipKepala !== "-" && <div className="text-[4px] font-mono text-gray-500">{sch.nipKepala}</div>}
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-1 w-full">
            <div className="text-[4px] font-bold tracking-widest text-gray-600">KETERANGAN</div>
            <div className="text-[5px] font-mono font-bold text-[#1a1a1a]">{siswa.noInduk}</div>
            <div className="text-[4px] text-gray-500">NSM: {sch.nsm}</div>
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between text-[4.5px] text-gray-400 border-t border-gray-100 pt-1">
        <span>© MI JAMIYATUL FALAH KEDUNGNENG • Dicetak: {new Date().toLocaleDateString("id-ID")}</span>
        <span className="font-mono">{siswa.nisn}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0e7a4b]" />
    </div>
  );
}

export function CardPair({ siswa, school }) {
  return (
    <div className="flex flex-col gap-3 items-center">
      <CardFront siswa={siswa} school={school} />
      <CardBack siswa={siswa} school={school} />
    </div>
  );
}
