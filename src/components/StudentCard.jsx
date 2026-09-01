import { school as defaultSchool } from "../data/school";
import { QRCodeSVG } from "qrcode.react";

function getPreviewUrl(siswa) {
  if (typeof window === "undefined") return "";
  const base = window.location.origin + window.location.pathname;
  // QR menuju preview kartu — saat discan akan buka preview otomatis via ?preview=noInduk
  const id = siswa?.noInduk || siswa?.nisn || "";
  if (!id) return base;
  return `${base}?preview=${encodeURIComponent(id)}`;
}

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
      className="relative bg-white rounded-[12px] overflow-hidden shadow-[0_3px_12px_rgba(0,0,0,0.15)] border border-gray-200 flex flex-col"
      style={{
        width: `${88 * scale}mm`,
        height: `${56 * scale}mm`,
        fontFamily: "Poppins, sans-serif",
      }}
    >
      {/* Header hijau - sedikit lebih tinggi untuk logo besar */}
      <div className="bg-[#0e7a4b] text-white px-2.5 py-[6px] flex items-center gap-2.5">
        <img
          src={sch.logoMijafa}
          alt="logo mijafa"
          className="w-[32px] h-[32px] rounded-full bg-transparent object-contain shrink-0"
          style={{ background: "transparent" }}
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <div className="flex-1 min-w-0 text-center leading-none">
          <div className="text-[7px] tracking-[0.6px] font-semibold opacity-90">YAYASAN PENDIDIKAN ISLAM JAMIYATUL FALAH</div>
          <div className="text-[9.5px] font-bold tracking-wide leading-tight">MADRASAH IBTIDAIYAH JAMIYATUL FALAH</div>
          <div className="text-[6px] opacity-90 leading-tight">Jl. Pusponegoro No.62 Kedungneng - Losari - Brebes 52255 • Terakreditasi B</div>
        </div>
        <img
          src={sch.logoKemenag || sch.logoTutWuri || sch.logoYayasan}
          alt="logo kemenag"
          className="w-[32px] h-[32px] rounded-full bg-transparent object-contain shrink-0"
          style={{ background: "transparent" }}
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      </div>

      {/* Title KARTU PELAJAR */}
      <div className="bg-[#f4b400] text-[#1a1a1a] text-center py-[3px]">
        <div className="text-[8px] font-bold tracking-[1.4px]">KARTU PELAJAR • STUDENT CARD</div>
      </div>

      {/* Body - font lebih besar, foto proporsional */}
      <div className="flex flex-1 gap-2.5 p-2.5">
        {/* Foto */}
        <div className="w-[24mm] shrink-0 flex flex-col items-center">
          <div className="w-full h-[32mm] rounded-[8px] overflow-hidden border-2 border-[#0e7a4b] bg-gray-100 relative">
            {siswa.foto ? (
              <img src={siswa.foto} alt={siswa.nama} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-200">
                <span className="text-[20px]">👤</span>
                <span className="text-[6px] font-medium">FOTO 3×4</span>
              </div>
            )}
          </div>
        </div>

        {/* Data - font diperbesar */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
          <div>
            <div className="text-[6px] text-[#0e7a4b] font-bold tracking-widest">NAMA LENGKAP</div>
            <div className="text-[11px] font-extrabold leading-tight text-[#1a1a1a] uppercase line-clamp-2 tracking-tight">{siswa.nama}</div>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div>
              <div className="text-[6px] text-gray-500 font-bold tracking-wide">NISN</div>
              <div className="text-[8px] font-extrabold font-mono text-[#1a1a1a]">{siswa.nisn || "-"}</div>
            </div>
            <div>
              <div className="text-[6px] text-gray-500 font-bold tracking-wide">NO. INDUK</div>
              <div className="text-[7px] font-extrabold font-mono text-[#1a1a1a] leading-none">{siswa.noInduk || "-"}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[6px] text-gray-500 font-bold tracking-wide">TEMPAT, TANGGAL LAHIR</div>
              <div className="text-[7.5px] font-bold text-[#1a1a1a] leading-tight">{ttl}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[6px] text-gray-500 font-bold tracking-wide">ALAMAT</div>
              <div className="text-[7px] font-semibold text-[#1a1a1a] leading-tight line-clamp-2">{siswa.alamat || "Kedungneng, Losari, Brebes"}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[6.5px] bg-[#0e7a4b] text-white px-3 py-1 rounded-full font-bold tracking-wide">Berlaku selama menjadi siswa</span>
          </div>
        </div>
      </div>

      {/* QR pojok kanan bawah depan — absolute tidak menggeser layout lain */}
      <div className="absolute bottom-[6px] right-1.5 bg-white border border-gray-200 rounded-[5px] p-[2px] flex flex-col items-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="w-[13mm] h-[13mm] flex items-center justify-center">
          <QRCodeSVG value={getPreviewUrl(siswa)} size={50} level="M" bgColor="#FFFFFF" fgColor="#000000" className="w-full h-full" />
        </div>
        <div className="text-[3.5px] font-bold text-gray-500 tracking-wide leading-none mt-[1px]">Scan preview</div>
      </div>

      {/* Footer line */}
      <div className="h-[4px] bg-gradient-to-r from-[#0e7a4b] via-[#f4b400] to-[#0e7a4b]" />
    </div>
  );
}

export function CardBack({ siswa, school }) {
  const sch = school || defaultSchool;
  return (
    <div
      className="relative bg-white rounded-[12px] overflow-hidden shadow-[0_3px_12px_rgba(0,0,0,0.15)] border border-gray-200 flex flex-col p-2.5"
      style={{
        width: "88mm",
        height: "56mm",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div className="flex-1 flex gap-2.5">
        <div className="flex-1 flex flex-col">
          <div className="text-[7.5px] font-extrabold text-[#0e7a4b] tracking-widest border-b-2 border-[#f4b400] pb-1 mb-1.5">TATA TERTIB & PERATURAN</div>
          <ol className="text-[6.5px] leading-[1.5] text-gray-800 space-y-1 list-decimal pl-4 font-medium">
            {sch.peraturan.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
          <div className="mt-2 bg-[#f0fdf4] border border-[#0e7a4b]/25 rounded-lg p-2">
            <div className="text-[6px] font-extrabold text-[#0e7a4b] tracking-wide">ALAMAT SEKOLAH</div>
            <div className="text-[6px] leading-tight text-gray-700 font-medium">
              {sch.alamat}, {sch.desa}, Kec. {sch.kecamatan}, Kab. {sch.kabupaten} {sch.kodePos}
              <br />
              Telp. {sch.telepon} • {sch.email}
            </div>
          </div>
          {/* spacer kecil - tidak terlalu besar agar tidak ada ruang kosong */}
          <div className="flex-1 min-h-[4px]"></div>
        </div>

        <div className="w-[36mm] flex flex-col items-center text-center shrink-0">
          <div className="text-[6px] text-gray-500 font-medium">Kedungneng, {new Date().getFullYear()}</div>
          {/* Ruang tanda tangan — tanpa emotikon, garis solid rapi — urutan: label di atas, nama di bawah garis */}
          <div className="flex-1 flex flex-col items-center justify-center w-full py-2">
            <div className="text-[6.5px] font-extrabold text-[#0e7a4b] leading-tight px-1">Kepala Madrasah</div>
            <div className="w-20 h-14 mx-auto border-b border-gray-400 mt-1" />
            <div className="text-[6px] font-bold text-[#1a1a1a] leading-tight px-1 mt-1.5">{sch.kepalaMadrasah}</div>
            {sch.nipKepala !== "-" && <div className="text-[5px] font-mono text-gray-500 mt-0.5">{sch.nipKepala}</div>}
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-1.5 w-full">
            <div className="text-[5px] font-bold tracking-widest text-gray-600">KETERANGAN</div>
            <div className="text-[6px] font-mono font-bold text-[#1a1a1a] break-all leading-tight">{siswa.noInduk}</div>
            <div className="text-[5px] text-gray-500">NSM: {sch.nsm}</div>
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[5px] text-gray-400 border-t border-gray-100 pt-1.5">
        <span>© MI JAMIYATUL FALAH KEDUNGNENG • Dicetak: {new Date().toLocaleDateString("id-ID")}</span>
        <span className="font-mono font-bold">{siswa.nisn}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-[#0e7a4b]" />
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
