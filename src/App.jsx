import React, { useEffect, useMemo, useRef, useState } from "react";
import { school as defaultSchool } from "./data/school";
import { initialStudents } from "./data/students";
import { CardFront, CardBack } from "./components/StudentCard";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";

const KELAS_OPTIONS = ["1", "2", "3", "4", "5", "6"];
const STORAGE_KEY = "mijafa-students-v2";
const SCHOOL_KEY = "mijafa-school-v2";

function usePersistedStudents() {
  const [students, setStudents] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // migration: hapus NIK jika masih ada di data lama (privasi)
        if (Array.isArray(parsed)) return parsed.map(({ nik, ...rest }) => rest);
        return parsed;
      }
    } catch {}
    return initialStudents;
  });
  useEffect(() => {
    // pastikan NIK tidak pernah tersimpan lagi
    const cleaned = students.map(({ nik, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  }, [students]);
  return [students, setStudents];
}

function usePersistedSchool() {
  const [sch, setSch] = useState(() => {
    try {
      const raw = localStorage.getItem(SCHOOL_KEY);
      if (raw) return { ...defaultSchool, ...JSON.parse(raw) };
    } catch {}
    return defaultSchool;
  });
  useEffect(() => {
    localStorage.setItem(SCHOOL_KEY, JSON.stringify(sch));
  }, [sch]);
  return [sch, setSch];
}

function formatTanggalIndo(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export default function App() {
  const [students, setStudents] = usePersistedStudents();
  const [schoolData, setSchoolData] = usePersistedSchool();
  const [search, setSearch] = useState("");
  const [kelasFilter, setKelasFilter] = useState("Semua");
  const [selected, setSelected] = useState(() => new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);
  const printRef = useRef(null);
  const previewCardRef = useRef(null);
  const bulkExportRef = useRef(null);

  // form state
  const emptyForm = {
    noInduk: "",
    nisn: "",
    nama: "",
    jenisKelamin: "Laki-laki",
    tempatLahir: "BREBES",
    tanggalLahir: "",
    alamat: "Kedungneng",
    kelas: "1",
    tahunMasuk: "2025",
    namaAyah: "",
    namaIbu: "",
    foto: "",
  };
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    let r = students;
    if (kelasFilter !== "Semua") r = r.filter((s) => String(s.kelas) === String(kelasFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          s.nisn.includes(q) ||
          s.noInduk.includes(q)
      );
    }
    return r;
  }, [students, search, kelasFilter]);

  const stats = useMemo(() => {
    const c = {};
    KELAS_OPTIONS.forEach((k) => (c[k] = students.filter((s) => String(s.kelas) === k).length));
    return c;
  }, [students]);

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function toggleSelect(id) {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  }
  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.noInduk)));
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowAdd(true);
  }
  function openEdit(s) {
    setEditing(s.noInduk);
    const { nik, ...clean } = s;
    setForm({ ...emptyForm, ...clean });
    setShowAdd(true);
  }
  function handleDelete(noInduk) {
    if (!confirm("Hapus data siswa ini?")) return;
    setStudents((p) => p.filter((s) => s.noInduk !== noInduk));
    notify("Data dihapus");
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama || !form.nisn || !form.noInduk) {
      notify("Nama, NISN, No Induk wajib diisi");
      return;
    }
    const { nik, ...cleanForm } = form;
    if (editing) {
      setStudents((p) => p.map((s) => {
        const { nik: _nik, ...rest } = s;
        return s.noInduk === editing ? { ...rest, ...cleanForm } : rest;
      }));
      notify("Data diperbarui");
    } else {
      if (students.some((s) => s.noInduk === cleanForm.noInduk)) {
        notify("No Induk sudah ada");
        return;
      }
      if (students.some((s) => s.nisn === cleanForm.nisn)) {
        notify("NISN sudah ada");
        return;
      }
      setStudents((p) => [{ ...cleanForm }, ...p]);
      notify("Siswa ditambahkan");
    }
    setShowAdd(false);
  }

  function handleFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify("Foto maksimal 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, foto: reader.result }));
    reader.readAsDataURL(file);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) throw new Error("File kosong");
        const header = rows[0].map((h) => String(h).trim().toLowerCase());
        // flexible mapping
        const idx = {
          nama: header.findIndex((h) => h.includes("nama")),
          nisn: header.findIndex((h) => h.includes("nisn")),
          tempat: header.findIndex((h) => h.includes("tempat")),
          tanggal: header.findIndex((h) => h.includes("tanggal")),
          jk: header.findIndex((h) => h.includes("kelamin") || h.includes("jk")),
          ayah: header.findIndex((h) => h.includes("ayah")),
          ibu: header.findIndex((h) => h.includes("ibu")),
          induk: header.findIndex((h) => h.includes("induk")),
          kelas: header.findIndex((h) => h.includes("kelas")),
          alamat: header.findIndex((h) => h.includes("alamat")),
          tahun: header.findIndex((h) => h.includes("tahun")),
        };
        const imported = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0 || !r[idx.nama]) continue;
          const nama = String(r[idx.nama] || "").trim().toUpperCase();
          if (!nama) continue;
          const nisn = String(r[idx.nisn] || "").trim();
          const noInduk = String(r[idx.induk] || "").trim() || `111233290134${String(250000 + i).padStart(6, "0")}`;
          let tgl = r[idx.tanggal];
          let iso = "";
          if (tgl) {
            if (typeof tgl === "number") {
              const d = XLSX.SSF.parse_date_code(tgl);
              iso = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
            } else {
              const d = new Date(tgl);
              if (!isNaN(d)) iso = d.toISOString().slice(0, 10);
              else iso = String(tgl);
            }
          }
          imported.push({
            noInduk,
            nisn: nisn || "-",
            nama,
            jenisKelamin: String(r[idx.jk] || "Laki-laki").includes("P") ? "Perempuan" : "Laki-laki",
            tempatLahir: String(r[idx.tempat] || "BREBES"),
            tanggalLahir: iso,
            alamat: String(r[idx.alamat] || "Kedungneng"),
            kelas: String(r[idx.kelas] || "1"),
            tahunMasuk: String(r[idx.tahun] || "2025"),
            namaAyah: String(r[idx.ayah] || ""),
            namaIbu: String(r[idx.ibu] || ""),
            foto: "",
          });
        }
        if (imported.length === 0) throw new Error("Tidak ada data valid");
        setStudents((p) => {
          const existing = new Set(p.map((s) => s.nisn));
          const filteredNew = imported.filter((s) => !existing.has(s.nisn));
          return [...filteredNew, ...p];
        });
        notify(`Berhasil import ${imported.length} siswa`);
      } catch (err) {
        notify("Gagal import: " + err.message);
      }
      e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  }

  function handleExport() {
    const ws = XLSX.utils.json_to_sheet(
      students.map((s, i) => ({
        No: i + 1,
        "Nama Lengkap": s.nama,
        NISN: s.nisn,
        "Tempat Lahir": s.tempatLahir,
        "Tanggal Lahir": s.tanggalLahir,
        "Jenis Kelamin": s.jenisKelamin,
        "Nama Ayah": s.namaAyah,
        "Nama Ibu": s.namaIbu,
        "No Induk": s.noInduk,
        Kelas: s.kelas,
        Alamat: s.alamat,
        "Tahun Masuk": s.tahunMasuk,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DATA SISWA");
    XLSX.writeFile(wb, `DATA_SISWA_MIJAFA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function handleDownloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["No", "Nama Lengkap", "NISN", "Tempat Lahir", "Tanggal Lahir", "Jenis Kelamin", "Nama Ayah", "Nama Ibu", "No Induk", "Kelas", "Alamat", "Tahun Masuk"],
      [1, "CONTOH NAMA", "3184581635", "BREBES", "2018-11-02", "Laki-laki", "Nama Ayah", "Nama Ibu", "111233290134250001", "1", "Kedungneng", "2025"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TEMPLATE");
    XLSX.writeFile(wb, "TEMPLATE_IMPORT_MIJAFA.xlsx");
  }

  function doPrint() {
    const selectedStudents = students.filter((s) => selected.has(s.noInduk));
    const toPrint = selectedStudents.length ? selectedStudents : filtered;
    if (toPrint.length === 0) {
      notify("Tidak ada data untuk dicetak");
      return;
    }
    setShowPrint(toPrint);
  }

  async function handleDownloadJPG() {
    const toPrint = selected.size ? students.filter((s) => selected.has(s.noInduk)) : filtered;
    if (toPrint.length === 0) {
      notify("Tidak ada data untuk diunduh");
      return;
    }
    if (toPrint.length > 12) {
      notify(`Terlalu banyak (${toPrint.length}), akan download 12 pertama. Pilih max 12 atau filter per kelas.`);
    }
    const el = bulkExportRef.current;
    if (!el) {
      notify("Gagal capture JPG - elemen tidak siap");
      return;
    }
    try {
      notify("Menyiapkan JPG...");
      // tunggu render update jika baru ganti seleksi
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: "#ffffff", logging: false, imageTimeout: 8000 });
      const link = document.createElement("a");
      const count = Math.min(toPrint.length, 12);
      link.download = `kartu-MIJAFA-${new Date().toISOString().slice(0, 10)}-${count}siswa.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.92);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify(`JPG ${count} siswa diunduh${toPrint.length > 12 ? " (12 pertama)" : ""}`);
    } catch (e) {
      console.error(e);
      notify("Gagal download JPG: " + (e.message || String(e)));
    }
  }

  async function handleDownloadSingleJPG(siswa) {
    const el = previewCardRef.current;
    if (!el) {
      notify("Gagal capture kartu - buka preview dulu");
      return;
    }
    try {
      notify("Menyiapkan JPG...");
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, allowTaint: false, backgroundColor: "#ffffff", logging: false, imageTimeout: 5000 });
      const link = document.createElement("a");
      const safeName = (siswa.nama || "kartu").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
      link.download = `${safeName}-${siswa.nisn || siswa.noInduk}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify("JPG kartu diunduh");
    } catch (e) {
      console.error(e);
      notify("Gagal download JPG: " + (e.message || String(e)));
    }
  }

  // print window - sinkron dengan pengaturan (schoolData), tanpa QR/KELAS/TP, masa berlaku permanen
  useEffect(() => {
    if (!showPrint) return;
    const html = `
      <html><head><meta charset="utf-8"><title>Cetak Kartu - MIJAFA</title>
      <style>
        @page { size: A4 portrait; margin: 3mm; }
        * { box-sizing: border-box; margin:0; padding:0; }
        body { font-family: Poppins, sans-serif; background: white; }
        .page { display: grid; grid-template-columns: repeat(2, 88mm); grid-auto-rows: 56mm; gap: 3mm; justify-content: center; padding: 3mm; }
        .card { width: 88mm; height: 56mm; border: 1px solid #ddd; border-radius: 12px; overflow:hidden; page-break-inside: avoid; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div style="text-align:center; padding: 6px; font-size:10px; border-bottom:1px dashed #ccc; margin-bottom:4mm;">
        ${schoolData.nama} — Cetak Kartu Pelajar — SATU LEMBAR (Depan & Belakang Berdampingan) — ${new Date().toLocaleDateString("id-ID")} — ${showPrint.length} siswa = ${Math.ceil(showPrint.length/4)} lembar A4 (4 siswa/lembar, kartu 88×56mm) — Potong sesuai garis
      </div>
      <div id="root"></div>
      <script>window.onload=()=>setTimeout(()=>window.print(), 500)</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      // fallback: render inline print area
      return;
    }
    w.document.write(html);
    // render cards via stringified HTML (sinkron pengaturan, tanpa QR/KELAS/TP) - logo transparan, preview == cetak
    const peraturanHtml = schoolData.peraturan.map((p) => `<li>${p}</li>`).join("");
    const logoMijafaUrl = new URL(schoolData.logoMijafa, window.location.href).href;
    const logoKemenagUrl = new URL(schoolData.logoKemenag || schoolData.logoTutWuri || schoolData.logoYayasan, window.location.href).href;
    // SATU LEMBAR: depan & belakang berdampingan per siswa (4 siswa = 8 sisi per lembar A4, kartu 88x56mm lebih besar)
    const pairHtml = showPrint
      .map(
        (s) => `
        <div class="card" style="position:relative; display:flex; flex-direction:column; background:white; border-radius:12px;">
          <div style="background:#0e7a4b; color:white; padding:5px 8px; display:flex; align-items:center; gap:8px; font-size:6px;">
            <img src="${logoMijafaUrl}" style="width:26px; height:26px; border-radius:50%; object-fit:contain; background:transparent;" onerror="this.style.display='none'" />
            <div style="flex:1; text-align:center; line-height:1;">
              <div style="font-size:6px; letter-spacing:0.6px; font-weight:600; opacity:0.95;">${schoolData.yayasan}</div>
              <div style="font-size:8.5px; font-weight:800;">${schoolData.nama}</div>
              <div style="font-size:5.5px; opacity:0.9;">${schoolData.alamat} • Terakreditasi ${schoolData.akreditasi}</div>
            </div>
            <img src="${logoKemenagUrl}" style="width:26px; height:26px; border-radius:50%; object-fit:contain; background:transparent;" onerror="this.style.display='none'" />
          </div>
          <div style="background:#f4b400; text-align:center; font-size:7px; font-weight:800; padding:3px; letter-spacing:1px;">KARTU PELAJAR</div>
          <div style="flex:1; display:flex; gap:10px; padding:10px;">
            <div style="width:24mm; display:flex; flex-direction:column; align-items:center;">
              <div style="width:100%; height:32mm; background:#f3f4f6; border:2.5px solid #0e7a4b; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:9px; color:#999; overflow:hidden;">
                ${s.foto ? `<img src="${s.foto}" style="width:100%; height:100%; object-fit:cover;" />` : "FOTO 3×4"}
              </div>
            </div>
            <div style="flex:1; font-size:6px; line-height:1.3; display:flex; flex-direction:column; justify-content:center; gap:2px;">
              <div>
                <div style="font-size:6px; color:#0e7a4b; font-weight:800; letter-spacing:1px;">NAMA LENGKAP</div>
                <div style="font-size:11px; font-weight:800; text-transform:uppercase; line-height:1.1; color:#1a1a1a;">${s.nama}</div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-top:2px;">
                <div><div style="font-size:6px; color:#888; font-weight:700;">NISN</div><div style="font-weight:800; font-family:monospace; font-size:8px; color:#1a1a1a;">${s.nisn}</div></div>
                <div><div style="font-size:6px; color:#888; font-weight:700;">NO INDUK</div><div style="font-weight:800; font-family:monospace; font-size:7px; color:#1a1a1a;">${s.noInduk}</div></div>
                <div style="grid-column: span 2;"><div style="font-size:6px; color:#888; font-weight:700;">TTL</div><div style="font-weight:700; font-size:7.5px; color:#1a1a1a;">${s.tempatLahir}, ${s.tanggalLahir}</div></div>
                <div style="grid-column: span 2;"><div style="font-size:6px; color:#888; font-weight:700;">ALAMAT</div><div style="font-weight:600; font-size:7px; color:#1a1a1a;">${s.alamat}</div></div>
              </div>
              <div style="margin-top:4px;"><span style="background:#0e7a4b; color:white; padding:3px 10px; border-radius:999px; font-size:6.5px; font-weight:800;">Berlaku selama menjadi siswa</span></div>
            </div>
          </div>
          <div style="height:4px; background: linear-gradient(90deg, #0e7a4b, #f4b400, #0e7a4b);"></div>
        </div>
        <div class="card" style="padding:10px; font-size:5px; display:flex; flex-direction:column; background:white; border-radius:12px;">
          <div style="font-size:7.5px; font-weight:800; color:#0e7a4b; border-bottom:2px solid #f4b400; padding-bottom:3px; margin-bottom:6px; letter-spacing:1px;">TATA TERTIB & PERATURAN</div>
          <ol style="padding-left:14px; line-height:1.5; color:#222; font-size:6.5px; font-weight:500;">
            ${peraturanHtml}
          </ol>
          <div style="margin-top:8px; background:#f0fdf4; border:1px solid #ccebd9; border-radius:8px; padding:6px; font-size:6px;">
            <div style="font-weight:800; color:#0e7a4b; font-size:6px;">ALAMAT SEKOLAH</div>
            <div style="font-size:6px; color:#333; font-weight:500;">${schoolData.alamat}, ${schoolData.desa}, Kec. ${schoolData.kecamatan}, Kab. ${schoolData.kabupaten} ${schoolData.kodePos}<br/>Telp. ${schoolData.telepon} • ${schoolData.email}</div>
          </div>
          <div style="flex:1; min-height:6px;"></div>
          <div style="text-align:center; font-size:6px; margin-top:6px;">
            <div style="color:#666; font-size:6px;">Kedungneng, ${new Date().getFullYear()}</div>
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; margin-top:4px;">
              <div style="font-size:6px; font-weight:700; color:#1a1a1a;">${schoolData.kepalaMadrasah}</div>
              <div style="width:80px; height:52px; border-bottom:2px dashed #bbb; display:flex; align-items:center; justify-content:center; font-size:12px; opacity:0.25; margin-top:2px;">✍️</div>
              <div style="font-size:6.5px; font-weight:800; color:#0e7a4b; margin-top:4px;">Kepala Madrasah</div>
            </div>
          </div>
        </div>
      `
      )
      .join("");

    // Satu lembar: depan & belakang berdampingan (2 kolom), potong tengah - 4 siswa/lembar dengan kartu 56mm
    const full = `<div class="page">${pairHtml}</div>`;
    w.document.body.innerHTML = w.document.body.innerHTML.replace('<div id="root"></div>', full);
    w.document.close();
  }, [showPrint, schoolData]);

  const selectedCount = selected.size;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm no-print">
        <div className="max-w-[1280px] mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={schoolData.logoMijafa} alt="logo" className="w-10 h-10 rounded-full object-contain border-2 border-[#0e7a4b] bg-transparent" style={{background:"transparent"}} />
            <div className="leading-tight">
              <div className="text-[11px] font-semibold tracking-widest text-[#0e7a4b]">YAYASAN PENDIDIKAN ISLAM JAMIYATUL FALAH</div>
              <div className="text-[15px] font-bold text-[#1a1a1a] tracking-tight">MI JAMIYATUL FALAH KEDUNGNENG</div>
              <div className="text-[11px] text-gray-500">Kartu Pelajar • TP {schoolData.tahunPelajaran} • {students.length} siswa</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleDownloadTemplate} className="hidden md:inline-flex text-xs border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50">📄 Template Excel</button>
            <label className="inline-flex items-center gap-2 bg-[#0e7a4b] text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-[#0a5c38]">
              <span>⬆️ Import Excel</span>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>
            <button onClick={handleExport} className="hidden md:inline-flex bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">⬇️ Export</button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">⚙️</button>
          </div>
        </div>
        {/* stats bar */}
        <div className="bg-[#0e7a4b] text-white">
          <div className="max-w-[1280px] mx-auto px-4 py-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold">Statistik:</span>
            {KELAS_OPTIONS.map((k) => (
              <span key={k} className={`px-2 py-1 rounded-full font-bold ${kelasFilter === k ? "bg-[#f4b400] text-[#1a1a1a]" : "bg-white/20"}`}>
                Kelas {k}: {stats[k] || 0}
              </span>
            ))}
            <span className="ml-auto hidden md:inline opacity-80">NSM {schoolData.nsm} • Akreditasi {schoolData.akreditasi} • {schoolData.alamat}</span>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="max-w-[1280px] mx-auto w-full px-4 py-4 flex flex-col lg:flex-row gap-3 no-print">
        <div className="flex-1 flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {["Semua", ...KELAS_OPTIONS].map((k) => (
              <button
                key={k}
                onClick={() => setKelasFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${kelasFilter === k ? "bg-[#0e7a4b] text-white shadow" : "text-gray-600 hover:bg-white"}`}
              >
                {k === "Semua" ? "Semua" : `Kelas ${k}`}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[220px] max-w-[360px]">
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NISN, No Induk…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0e7a4b]/20 focus:border-[#0e7a4b] text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-600 hidden lg:inline">
            {filtered.length} siswa • {selectedCount} dipilih
          </span>
          <button onClick={openAdd} className="bg-[#f4b400] text-[#1a1a1a] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#e0a500]">+ Tambah Siswa</button>
          <button
            onClick={doPrint}
            disabled={filtered.length === 0}
            className="bg-[#0e7a4b] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0a5c38] disabled:opacity-50 flex items-center gap-2"
          >
            🖨️ Cetak {selectedCount ? `(${selectedCount})` : `(${filtered.length})`}
          </button>
          <button
            onClick={handleDownloadJPG}
            disabled={filtered.length === 0}
            className="bg-white border border-[#0e7a4b] text-[#0e7a4b] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#f0fdf4] disabled:opacity-50 flex items-center gap-2"
            title="Download semua kartu terpilih sebagai JPG (satu lembar A4)"
          >
            📷 JPG {selectedCount ? `(${selectedCount})` : `(${filtered.length})`}
          </button>
          {selectedCount > 0 && (
            <button
              onClick={() => {
                if (confirm(`Hapus ${selectedCount} siswa terpilih?`)) {
                  setStudents((p) => p.filter((s) => !selected.has(s.noInduk)));
                  setSelected(new Set());
                  notify(`${selectedCount} data dihapus`);
                }
              }}
              className="text-sm text-red-600 border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50"
            >
              Hapus Terpilih
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <main className="max-w-[1280px] mx-auto w-full px-4 pb-8 flex-1">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="p-3 w-10">
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
                  </th>
                  <th className="p-3 text-left">No</th>
                  <th className="p-3 text-left">Foto</th>
                  <th className="p-3 text-left">Nama / NISN / No Induk</th>
                  <th className="p-3 text-left">TTL</th>
                  <th className="p-3 text-center">Kelas</th>
                  <th className="p-3 text-left hidden md:table-cell">Orang Tua</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400">
                      Tidak ada data. Coba ganti filter atau import Excel.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, i) => (
                    <tr key={s.noInduk} className={`hover:bg-[#f0fdf4] ${selected.has(s.noInduk) ? "bg-[#ecfdf5]" : ""}`}>
                      <td className="p-3">
                        <input type="checkbox" checked={selected.has(s.noInduk)} onChange={() => toggleSelect(s.noInduk)} />
                      </td>
                      <td className="p-3 text-gray-500">{i + 1}</td>
                      <td className="p-3">
                        <div className="w-10 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                          {s.foto ? <img src={s.foto} alt={s.nama} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">👤</div>}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-[#1a1a1a] uppercase leading-tight">{s.nama}</div>
                        <div className="text-xs font-mono text-gray-600">
                          NISN: {s.nisn} • Induk: {s.noInduk}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs font-medium">{s.tempatLahir}</div>
                        <div className="text-xs text-gray-600">{formatTanggalIndo(s.tanggalLahir)}</div>
                        <div className="text-[11px] text-gray-500">{s.jenisKelamin}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex bg-[#0e7a4b] text-white text-xs font-bold px-2.5 py-1 rounded-full"> {s.kelas} </span>
                        <div className="text-[11px] text-gray-500 mt-1">{s.tahunMasuk}</div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="text-xs">Ay: {s.namaAyah || "-"}</div>
                        <div className="text-xs">Ibu: {s.namaIbu || "-"}</div>
                        <div className="text-[11px] text-gray-500 truncate max-w-[160px]">{s.alamat}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setPreview(s)} className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50">
                            👁️ Preview
                          </button>
                          <button onClick={() => openEdit(s)} className="px-2.5 py-1.5 bg-[#f4b400] rounded-lg text-xs font-bold hover:bg-[#e0a500]">
                            ✏️
                          </button>
                          <button onClick={() => handleDelete(s.noInduk)} className="px-2.5 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500 flex flex-wrap gap-2 justify-between">
            <span>
              Menampilkan {filtered.length} dari {students.length} siswa • Centang untuk cetak massal • Ukuran kartu CR80 (85.6×54mm) • 10 kartu / halaman A4
            </span>
            <span className="hidden md:inline">💡 Tip: Klik Preview untuk lihat desain kartu depan-belakang sebelum cetak</span>
          </div>
        </div>

        {/* Preview inline grid for quick visual */}
        {filtered.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Pratinjau Cepat (3 teratas filter) — klik Preview untuk cetak</h3>
            <div className="grid md:grid-cols-3 gap-6 justify-items-center">
              {filtered.slice(0, 3).map((s) => (
                <div key={s.noInduk} className="scale-[0.95] origin-top">
                  <CardFront siswa={s} school={schoolData} />
                  <div className="text-center mt-2">
                    <button onClick={() => setPreview(s)} className="text-xs text-[#0e7a4b] font-semibold hover:underline">
                      Lihat depan & belakang →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 text-center text-xs text-gray-500 no-print">
        <div>© {new Date().getFullYear()} MI JAMIYATUL FALAH KEDUNGNENG • Yayasan Pendidikan Islam Jamiyatul Falah • NSM {schoolData.nsm} • Dibuat untuk TU Madrasah</div>
        <div className="mt-1">
          Alamat: {schoolData.alamat}, {schoolData.desa}, {schoolData.kecamatan}, {schoolData.kabupaten} {schoolData.kodePos} • Telp {schoolData.telepon} • {schoolData.email} • Deploy: GitHub Pages
        </div>
      </footer>

      {/* Modals */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <form onSubmit={handleSubmit} className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold">{editing ? "Edit Siswa" : "Tambah Siswa Baru"}</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200">
                ✕
              </button>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex gap-4">
                <div className="w-28 h-36 rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center shrink-0 relative">
                  {form.foto ? (
                    <img src={form.foto} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <span className="text-2xl">📷</span>
                      <span className="text-[10px] text-gray-500">Foto 3×4</span>
                    </>
                  )}
                  <label className="absolute bottom-1 bg-[#0e7a4b] text-white text-[11px] px-2 py-1 rounded-full cursor-pointer">
                    Pilih Foto
                    <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                  </label>
                </div>
                <div className="flex-1 grid grid-cols-1 gap-3">
                  <label className="text-xs font-semibold">
                    Nama Lengkap <span className="text-red-500">*</span>
                    <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value.toUpperCase() })} placeholder="NAMA LENGKAP" className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm uppercase" required />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold">
                      NISN <span className="text-red-500">*</span>
                      <input value={form.nisn} onChange={(e) => setForm({ ...form, nisn: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm font-mono" required />
                    </label>
                    <label className="text-xs font-semibold">
                      No Induk <span className="text-red-500">*</span>
                      <input value={form.noInduk} onChange={(e) => setForm({ ...form, noInduk: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm font-mono" required />
                    </label>
                  </div>
                </div>
              </div>


              <label className="text-xs font-semibold">
                Kelas
                <select value={form.kelas} onChange={(e) => setForm({ ...form, kelas: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm">
                  {KELAS_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold">
                Tempat Lahir
                <input value={form.tempatLahir} onChange={(e) => setForm({ ...form, tempatLahir: e.target.value.toUpperCase() })} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-semibold">
                Tanggal Lahir
                <input type="date" value={form.tanggalLahir} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-semibold">
                Jenis Kelamin
                <select value={form.jenisKelamin} onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm">
                  <option>Laki-laki</option>
                  <option>Perempuan</option>
                </select>
              </label>
              <label className="text-xs font-semibold">
                Tahun Masuk
                <input value={form.tahunMasuk} onChange={(e) => setForm({ ...form, tahunMasuk: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-semibold md:col-span-2">
                Alamat
                <input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-semibold">
                Nama Ayah
                <input value={form.namaAyah} onChange={(e) => setForm({ ...form, namaAyah: e.target.value.toUpperCase() })} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm uppercase" />
              </label>
              <label className="text-xs font-semibold">
                Nama Ibu
                <input value={form.namaIbu} onChange={(e) => setForm({ ...form, namaIbu: e.target.value.toUpperCase() })} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm uppercase" />
              </label>
              <div className="md:col-span-2 flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-[#0e7a4b] text-white py-3 rounded-xl font-bold hover:bg-[#0a5c38]">
                  {editing ? "Simpan Perubahan" : "Tambahkan Siswa"}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-3 border rounded-xl font-semibold hover:bg-gray-50">
                  Batal
                </button>
              </div>
              <p className="md:col-span-2 text-[11px] text-gray-400 text-center">Foto akan tercetak di kartu. Rekomendasi: foto 3×4, background merah/biru, max 2MB, jpg/png.</p>
            </div>
          </form>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPreview(null)} />
          <div className="relative bg-[#f3f4f6] rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Preview Kartu — {preview.nama} • Kelas {preview.kelas}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadSingleJPG(preview)}
                  className="bg-white border border-[#0e7a4b] text-[#0e7a4b] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#f0fdf4]"
                >
                  📷 Download JPG
                </button>
                <button
                  onClick={() => {
                    setSelected(new Set([preview.noInduk]));
                    setPreview(null);
                    setTimeout(() => doPrint(), 300);
                  }}
                  className="bg-[#0e7a4b] text-white px-4 py-2 rounded-xl text-sm font-bold"
                >
                  🖨️ Cetak Kartu Ini
                </button>
                <button onClick={() => setPreview(null)} className="w-8 h-8 rounded-full bg-white border hover:bg-gray-50">
                  ✕
                </button>
              </div>
            </div>
            <div ref={previewCardRef} className="flex flex-col lg:flex-row gap-8 justify-center items-center bg-white p-8 rounded-xl border">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-[#0e7a4b]">DEPAN</span>
                <CardFront siswa={preview} school={schoolData} />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-[#0e7a4b]">BELAKANG</span>
                <CardBack siswa={preview} school={schoolData} />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500 text-center">Ukuran: 85.6mm × 54mm (CR80) • 300 DPI → 1011×638 px • Bahan: PVC / Art Paper 260gsm laminasi</div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSettings(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold">Pengaturan Sekolah & Kartu</h3>
              <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-gray-100">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold">
                  Nama Madrasah
                  <input value={schoolData.nama} onChange={(e) => setSchoolData({ ...schoolData, nama: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-semibold">
                  Tahun Pelajaran
                  <input value={schoolData.tahunPelajaran} onChange={(e) => setSchoolData({ ...schoolData, tahunPelajaran: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-semibold">
                  Kepala Madrasah
                  <input value={schoolData.kepalaMadrasah} onChange={(e) => setSchoolData({ ...schoolData, kepalaMadrasah: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-semibold">
                  Masa Berlaku
                  <input value={schoolData.masaBerlaku} onChange={(e) => setSchoolData({ ...schoolData, masaBerlaku: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-semibold col-span-2">
                  Alamat
                  <input value={schoolData.alamat} onChange={(e) => setSchoolData({ ...schoolData, alamat: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-semibold">
                  Telepon
                  <input value={schoolData.telepon} onChange={(e) => setSchoolData({ ...schoolData, telepon: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-semibold">
                  Email
                  <input value={schoolData.email} onChange={(e) => setSchoolData({ ...schoolData, email: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </label>
              </div>
              <div>
                <div className="text-xs font-bold mb-2">Peraturan Belakang Kartu (satu baris satu poin)</div>
                <textarea
                  value={schoolData.peraturan.join("\n")}
                  onChange={(e) => setSchoolData({ ...schoolData, peraturan: e.target.value.split("\n").filter(Boolean) })}
                  rows={5}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(SCHOOL_KEY);
                    location.reload();
                  }}
                  className="text-xs border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
                >
                  Reset Data Awal
                </button>
                <button onClick={() => setShowSettings(false)} className="ml-auto bg-[#0e7a4b] text-white px-6 py-2 rounded-lg text-sm font-bold">
                  Tutup & Simpan
                </button>
              </div>
              <div className="text-[11px] text-gray-400">
                Data disimpan di browser (localStorage). Untuk backup, gunakan Export Excel. Skema lengkap lihat <code>SCHEMA.md</code> di repo.
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white px-4 py-2 rounded-full text-sm shadow-lg z-50">{toast}</div>}

      {/* Hidden print area fallback (if popup blocked) */}
      {Array.isArray(showPrint) && showPrint.length > 0 && (
        <div className="fixed inset-0 z-40 bg-white overflow-auto p-4 no-print" style={{ display: showPrint ? "block" : "none" }}>
          <div className="max-w-[210mm] mx-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="font-bold">Pratinjau Cetak — {showPrint.length} kartu • Popup diblokir? Cetak dari sini</h2>
              <div className="flex gap-2">
                <button onClick={handleDownloadJPG} className="bg-white border border-[#0e7a4b] text-[#0e7a4b] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#f0fdf4]">
                  📷 Download JPG
                </button>
                <button onClick={() => window.print()} className="bg-[#0e7a4b] text-white px-4 py-2 rounded-lg text-sm font-bold">
                  🖨️ Print (Ctrl+P)
                </button>
                <button onClick={() => setShowPrint(false)} className="border px-4 py-2 rounded-lg text-sm">
                  Tutup
                </button>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 mb-3">SATU LEMBAR — Depan & Belakang berdampingan (4 siswa per lembar A4, kartu 88×56mm) — Potong sesuai garis putus</div>
            <div ref={printRef} className="grid grid-cols-2 gap-4 bg-white p-2">
              {showPrint.map((s) => (
                <React.Fragment key={s.noInduk}>
                  <CardFront siswa={s} school={schoolData} />
                  <CardBack siswa={s} school={schoolData} />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Hidden offscreen export for JPG bulk - selalu dirender agar download tanpa harus buka cetak */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, width: "210mm", background: "white", padding: "3mm", pointerEvents: "none" }} aria-hidden="true">
        <div ref={bulkExportRef} className="grid grid-cols-2 gap-3 bg-white">
          {(selected.size ? students.filter((s) => selected.has(s.noInduk)) : filtered).slice(0, 12).map((s) => (
            <React.Fragment key={s.noInduk}>
              <CardFront siswa={s} school={schoolData} />
              <CardBack siswa={s} school={schoolData} />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}