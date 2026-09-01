# Skema Database — Kartu Siswa MI JAMIYATUL FALAH KEDUNGNENG

Dokumen ini adalah sumber kebenaran (source of truth) untuk projek cetak Kartu Pelajar MI JAMIYATUL FALAH KEDUNGNENG (Yayasan Pendidikan Islam Jamiyatul Falah, Jl. Pusponegoro No.62 Kedungneng, Losari, Brebes 52255).

## 1. Ringkasan Entitas

```
[SEKOLAH] 1──* [SISWA] *──1 [KELAS]
[SISWA] 1──1 [KARTU_CETAK]
[SETTING_KARTU] 1──* [SISWA]
```

## 2. JSON Schema (yang dipakai frontend — localStorage)

Dipakai di `src/data/school.js` & `src/data/students.js`. Cocok untuk import Excel & export PDF.

```json
{
  "sekolah": {
    "npsn": "60720147",
    "nsm": "111233290134",
    "nama": "MI JAMIYATUL FALAH KEDUNGNENG",
    "yayasan": "YAYASAN PENDIDIKAN ISLAM JAMIYATUL FALAH",
    "akreditasi": "B",
    "alamat": "Jl. Pusponegoro No. 62 Kedungneng",
    "desa": "Kedungneng",
    "kecamatan": "Losari",
    "kabupaten": "Brebes",
    "provinsi": "Jawa Tengah",
    "kodePos": "52255",
    "telepon": "085872166251",
    "email": "mijafakedungneng@yahoo.co.id",
    "kepalaMadrasah": "Nama Kepala Madrasah, S.Pd.I",
    "nipKepala": "-",
    "logoMijafa": "/logo-mijafa.jpg",
    "logoYayasan": "/logo-yayasan.jpg",
    "logoTutWuri": "/logo-tutwuri.png",
    "tahunPelajaran": "2025/2026"
  },
  "siswa": {
    "id": "uuid-v4",
    "noInduk": "111233290134250001",  // 18 digit NSM+urut
    "nisn": "3184581635",              // 10 digit
    "nama": "ADITYA IRFAN AD DIN",
    "jenisKelamin": "Laki-laki | Perempuan",
    "tempatLahir": "BREBES",
    "tanggalLahir": "2018-11-02",      // ISO 8601
    "alamat": "Kedungneng RT 02 RW 01",
    "kelas": "1",                      // 1,2,3,4,5,6 atau 1A,1B ...6
    "tahunMasuk": "2025",
    "status": "Aktif",
    "namaAyah": "RASWAN",
    "namaIbu": "WASI'AH",
    "foto": "data:image/jpeg;base64,... | /foto/xxx.jpg | null",
    "qrValue": "NISN:3184581635|MIJAFA-250001" // auto generate
  }
}
```

### Field Kartu yang TAMPIL di Cetak

**Depan:**
- Header Yayasan + Nama Madrasah + Alamat + Akreditasi + Logo MI & Yayasan
- Foto 3x4 (wajib, jika kosong pakai placeholder)
- NAMA (uppercase, bold)
- NISN / No.Induk (8-10pt)
- Kelas
- TTL (Tempat, dd-mm-yyyy)
- Alamat singkat
- Masa Berlaku s/d (tahun pelajaran + 1)
- QR Code (berisi NISN|NoInduk|Nama)

**Belakang:**
- Tata tertib / Peraturan (custom text di `settingKartu.peraturan`)
- Tanda tangan Kepala Madrasah + stamp
- Alamat lengkap sekolah + kontak
- Barcode NISN (opsional)
- Catatan: "Kartu ini wajib dibawa setiap hari"

## 3. SQL DDL (Production-ready, kompatibel MySQL/Postgres/SQLite)

### 3.1 Tabel `sekolah`
```sql
CREATE TABLE sekolah (
  id CHAR(36) PRIMARY KEY,
  nsm VARCHAR(20) UNIQUE NOT NULL, -- 111233290134
  npsn VARCHAR(20),
  nama VARCHAR(120) NOT NULL DEFAULT 'MI JAMIYATUL FALAH KEDUNGNENG',
  yayasan VARCHAR(120) NOT NULL DEFAULT 'YAYASAN PENDIDIKAN ISLAM JAMIYATUL FALAH',
  akreditasi CHAR(1) DEFAULT 'B',
  alamat TEXT NOT NULL,
  desa VARCHAR(50) DEFAULT 'Kedungneng',
  kecamatan VARCHAR(50) DEFAULT 'Losari',
  kabupaten VARCHAR(50) DEFAULT 'Brebes',
  provinsi VARCHAR(50) DEFAULT 'Jawa Tengah',
  kode_pos VARCHAR(6) DEFAULT '52255',
  telepon VARCHAR(20),
  email VARCHAR(100),
  kepala_madrasah VARCHAR(100),
  nip_kepala VARCHAR(30),
  tahun_pelajaran VARCHAR(9) DEFAULT '2025/2026',
  logo_mijafa TEXT,
  logo_yayasan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Tabel `kelas`
```sql
CREATE TABLE kelas (
  id CHAR(36) PRIMARY KEY,
  nama VARCHAR(10) NOT NULL UNIQUE, -- 1,2,3,4,5,6,1A,3B
  wali_kelas VARCHAR(100),
  tahun_pelajaran VARCHAR(9),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 Tabel `siswa` (inti)
```sql
CREATE TABLE siswa (
  id CHAR(36) PRIMARY KEY,
  no_induk VARCHAR(18) UNIQUE NOT NULL, -- 111233290134250001 (NSM + 6 digit)
  nisn CHAR(10) UNIQUE NOT NULL,
  nama_lengkap VARCHAR(100) NOT NULL,
  jenis_kelamin ENUM('Laki-laki','Perempuan') NOT NULL,
  tempat_lahir VARCHAR(50) NOT NULL,
  tanggal_lahir DATE NOT NULL,
  alamat TEXT NOT NULL,
  desa VARCHAR(50) DEFAULT 'Kedungneng',
  kelas_id CHAR(36) REFERENCES kelas(id),
  kelas_label VARCHAR(10) NOT NULL, -- denormalisasi untuk cetak cepat
  tahun_masuk YEAR NOT NULL,
  status ENUM('Aktif','Lulus','Pindah','Keluar') DEFAULT 'Aktif',
  nama_ayah VARCHAR(100),
  nama_ibu VARCHAR(100),
  no_hp_ortu VARCHAR(20),
  foto_url TEXT, -- path atau base64
  qr_value VARCHAR(100) GENERATED ALWAYS AS (CONCAT(nisn,'|',no_induk)) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_kelas (kelas_label),
  INDEX idx_nama (nama_lengkap),
  INDEX idx_nisn (nisn)
);
```

### 3.4 Tabel `setting_kartu`
```sql
CREATE TABLE setting_kartu (
  id CHAR(36) PRIMARY KEY,
  orientasi ENUM('landscape','portrait') DEFAULT 'landscape',
  ukuran ENUM('CR80','A4-8','A4-10') DEFAULT 'CR80', -- CR80 86x54mm
  bg_depan VARCHAR(7) DEFAULT '#0e7a4b', -- hijau MI
  bg_belakang VARCHAR(7) DEFAULT '#ffffff',
  warna_primer VARCHAR(7) DEFAULT '#0e7a4b',
  warna_sekunder VARCHAR(7) DEFAULT '#f4b400',
  font_family VARCHAR(30) DEFAULT 'Poppins',
  show_foto BOOLEAN DEFAULT TRUE,
  show_qr BOOLEAN DEFAULT TRUE,
  show_barcode BOOLEAN DEFAULT FALSE,
  show_ttd BOOLEAN DEFAULT TRUE,
  masa_berlaku_sampai DATE, -- 2026-06-30
  peraturan TEXT DEFAULT '1. Kartu wajib dibawa setiap hari\n2. Jika hilang segera lapor ke TU\n3. Kartu tidak boleh dipinjamkan',
  ttd_nama VARCHAR(100),
  ttd_jabatan VARCHAR(50) DEFAULT 'Kepala Madrasah',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5 Tabel `log_cetak`
```sql
CREATE TABLE log_cetak (
  id CHAR(36) PRIMARY KEY,
  tanggal_cetak DATETIME DEFAULT CURRENT_TIMESTAMP,
  dicetak_oleh VARCHAR(100),
  jumlah_siswa INT NOT NULL,
  kelas_filter VARCHAR(20),
  format ENUM('PDF','PNG','PRINT') DEFAULT 'PDF',
  catatan TEXT
);
```

### 3.6 Relasi `cetak_detail` (many-to-many log)
```sql
CREATE TABLE cetak_detail (
  log_id CHAR(36) REFERENCES log_cetak(id) ON DELETE CASCADE,
  siswa_id CHAR(36) REFERENCES siswa(id) ON DELETE CASCADE,
  PRIMARY KEY (log_id, siswa_id)
);
```

## 4. Excel Template Import

Header wajib (baris 1) — urutan harus sama (NIK sudah dihapus demi privasi):

| No | Nama Lengkap | NISN | Tempat Lahir | Tanggal Lahir (YYYY-MM-DD) | Jenis Kelamin | Nama Ayah | Nama Ibu | No Induk | Kelas | Alamat | Tahun Masuk | Foto (opsional URL/base64) |
|----|--------------|------|--------------|-----------------------------|---------------|-----------|----------|----------|-------|--------|-------------|----------------------------|

- Validasi:
  - NISN 10 digit angka, unik.
  - No Induk 18 digit, prefix `111233290134` + 6 digit urut.
  - Tanggal Lahir format Excel `DATE` atau `YYYY-MM-DD`.
  - Kelas: `1`–`6` atau `1A`, `2B` dsb.
  - NIK tidak lagi disimpan/ditampilkan (dihapus dari semua template & kartu).

Contoh file: `/students-sample.json` & `/public/template-import.xlsx` (digenerate via app).

## 5. Konversi Data Lama (2024-2026)

- Sumber: `DATABASE SISWA 2025-2026.xlsx` (sheet DATA BASE & BIODATA) + `DATA SISWA MIJAFA.xlsx`
- 229 record aktif telah dinormalisasi ke `students-sample.json`
- Kelas terdistribusi: 1≈42, 2≈38, 3≈40, 4≈36, 5≈38, 6≈35 (estimasi dari Excel lama — cek aktual di app)
- Script migrasi: `python migrate.py --src "DATABASE SISWA 2025-2026.xlsx" --out students.json`

## 6. Desain Fisik Kartu

- **Ukuran:** CR80 ISO/IEC 7810 — 85.6mm × 53.98mm (3.37"×2.125"), 300 DPI → 1011×638 px. Bleed 3mm.
- **Bahan cetak rekomendasi:** PVC 0.76mm atau Art Paper 260gsm laminasi.
- **Layout cetak massal:**
  - **A4 Portrait:** 2 kolom × 5 baris = 10 kartu/halaman (CR80)
  - **A4 Landscape:** 5 kolom × 2 baris = 10 kartu/halaman
  - Jarak potong (crop mark) 2mm, margin 5mm.
- **Warna identitas MI JAFA:** Hijau tua `#0E7A4B`, Kuning emas `#F4B400`, Putih `#FFFFFF`, Hitam `#1A1A1A`.
- **Font:** Poppins / Inter (Google Fonts) untuk keterbacaan, fallback system-ui.

## 7. Alur Kerja (Workflow)

1. Admin login (opsional, untuk deploy publik bisa tanpa auth + PIN TU).
2. Import Excel / tambah manual → foto upload (crop 3:4).
3. Preview kartu depan/belakang real-time → edit setting warna/logo/ttd.
4. Pilih siswa (per kelas / ceklis manual / cari nama/NISN).
5. Cetak: “Cetak Depan Saja” / “Depan-Belakang” → generate PDF via `jspdf` + `html2canvas` (300dpi) → download atau Print dialog.
6. Log cetak tersimpan untuk audit.

## 8. Roadmap Fitur

- [x] CRUD siswa + import Excel + foto + QR
- [x] Preview live + print CSS @media print
- [x] Export PDF A4 (depan-belakang duplex)
- [x] Filter per kelas & search
- [ ] Auth & multi-user (TU, Kepala)
- [ ] Generate template Excel kosong
- [ ] Sinkron EMIS / Verval

## 9. Deployment

- **Frontend-only (saat ini):** Vite SPA → GitHub Pages (`gh-pages`). Data di `localStorage` + JSON. Cocok untuk TU offline.
- **Fullstack (next):** Next.js + Prisma + MySQL laragon / Supabase. Ganti `src/data/*` dengan API `/api/siswa`.

---
*Dibuat untuk MI JAMIYATUL FALAH KEDUNGNENG — 2025/2026. Hub TU: 0858-7216-6251.*
