# Kartu Pelajar — MI JAMIYATUL FALAH KEDUNGNENG

Aplikasi web untuk membuat & mencetak **Kartu Pelajar** siswa MI JAMIYATUL FALAH KEDUNGNENG  
Yayasan Pendidikan Islam Jamiyatul Falah • Jl. Pusponegoro No.62 Kedungneng, Losari, Brebes 52255 • Akreditasi B • TP 2025/2026

**Live Demo (GitHub Pages):** `https://<username>.github.io/kartu-siswa-mijafa/` ← ganti `<username>` setelah deploy

![version](https://img.shields.io/badge/version-1.0.0-green) ![vite](https://img.shields.io/badge/vite-8.x-646CFF) ![react](https://img.shields.io/badge/react-19.x-61DAFB) ![tailwind](https://img.shields.io/badge/tailwind-4.x-38BDF8)

---

## ✨ Fitur

- **CRUD Siswa** lengkap: NISN, No Induk (18 digit NSM), NIK, Nama, TTL, Alamat, Kelas 1-6, Ortu, Foto 3×4
- **Import Excel massal** (`DATA SISWA MIJAFA.xlsx` & `DATABASE SISWA 2025-2026.xlsx` kompatibel) + validasi header fleksibel
- **Export Excel** & **Download Template** import
- **Desain Kartu CR80 (85.6×54mm)** depan-belakang: header Yayasan hijau `#0e7a4b` + emas `#f4b400`, foto, QR Code (NISN|NoInduk), tata tertib, TTD Kepala Madrasah
- **Preview live** & **Cetak massal**: pilih per kelas / ceklis manual / search, 10 kartu / halaman A4, crop marks, support duplex (depan-belakang)
- **Cetak via Browser** (`window.print` + `@page A4`) & fallback print view jika popup diblokir
- **Filter & Statistik** per kelas, search NISN/Nama/No Induk
- **Penyimpanan lokal** (`localStorage`) — tetap jalan offline, cocok untuk TU tanpa server
- **Pengaturan sekolah** editable: nama, alamat, kepala, tahun pelajaran, masa berlaku, peraturan belakang kartu
- **229 data awal** sudah terisi dari Excel 2025/2026 (Kelas 1≈46, 2≈34, 3≈41, 4≈39, 5≈33, 6≈36)

## 📐 Skema Database

Lihat **`SCHEMA.md`** — sumber kebenaran untuk:
- JSON schema frontend (dipakai `localStorage`)
- SQL DDL (MySQL/Postgres/SQLite) untuk `sekolah`, `kelas`, `siswa`, `setting_kartu`, `log_cetak`
- Spesifikasi header Excel import
- Ukuran fisik CR80 & layout A4

## 🚀 Cara Jalan Lokal

```bash
# 1. Clone (atau download zip dari GitHub)
git clone https://github.com/<username>/kartu-siswa-mijafa.git
cd kartu-siswa-mijafa

# 2. Install
npm install

# 3. Jalan dev
npm run dev
# buka http://localhost:5173

# 4. Build production
npm run build
npm run preview
```

> Node.js ≥ 18 required. Tested Node 22.23.2

## 📤 Deploy ke GitHub Pages (3 cara)

### Cara A — Otomatis via GitHub Actions (Recommended)
1. Buat repo baru di GitHub: `kartu-siswa-mijafa` (Public)
2. Push code:
   ```bash
   git init
   git add .
   git commit -m "feat: kartu pelajar MIJAFA v1"
   git branch -M main
   git remote add origin https://github.com/<username>/kartu-siswa-mijafa.git
   git push -u origin main
   ```
3. Di repo GitHub → **Settings → Pages** → Source: **GitHub Actions** (bukan branch)
4. Push lagi atau **Actions → Deploy to GitHub Pages → Run** — site akan live di `https://<username>.github.io/kartu-siswa-mijafa/`

Workflow sudah ada di `.github/workflows/deploy.yml`.

### Cara B — Manual `gh-pages`
```bash
npm run deploy
# akan push folder dist ke branch gh-pages
# lalu Settings → Pages → Source: gh-pages / root
```

### Cara C — Upload `dist` manual
`npm run build` → upload isi folder `dist/` ke hosting (cPanel, Vercel, Netlify).

**Catatan Vite base:** `vite.config.js` sudah `base: './'` agar jalan di subpath GitHub Pages. Jika username repo beda, `package.json` → `homepage` bisa dihapus, tidak pengaruh.

## 🖨️ Cara Cetak

1. Filter kelas / cari siswa → centang yang mau dicetak (atau kosong = cetak semua yang terfilter)
2. Klik **Cetak** → popup print preview terbuka (izinkan popup)
   - Jika popup diblokir, pakai fallback preview di halaman → **Print (Ctrl+P)**
3. Di dialog print: atur **Margins: None / Minimum**, **Scale: 100%**, **Background graphics: ✅**
4. Kertas **A4**, bahan: PVC 0.76mm atau Art Paper 260gsm laminasi, potong 85.6×54mm dengan bleed 3mm

## 📁 Struktur Projek

```
kartu-siswa-mijafa/
├── public/
│   ├── logo-mijafa.jpg        # Logo MI (dari FILE NAPISAH/LOGO MI)
│   └── logo-yayasan.jpg
├── src/
│   ├── data/
│   │   ├── school.js          # Identitas sekolah
│   │   └── students.js        # 229 data awal (dari Excel)
│   ├── components/
│   │   └── StudentCard.jsx    # CardFront & CardBack (CR80)
│   ├── App.jsx                # Main app: table, filter, import, print
│   ├── main.jsx
│   └── index.css              # Tailwind 4 + print CSS
├── SCHEMA.md                  # Skema DB lengkap
├── vite.config.js
└── package.json
```

## 🔧 Kustomisasi

- **Ganti logo:** replace `public/logo-mijafa.jpg` & `logo-yayasan.jpg`, lalu rebuild
- **Ganti warna identitas:** edit `src/components/StudentCard.jsx` (`#0e7a4b`, `#f4b400`) atau `src/data/school.js`
- **Tambah kelas 7+ / paralel A/B:** edit `KELAS_OPTIONS` di `App.jsx`
- **Backend fullstack (next):** ganti `localStorage` dengan API — schema SQL sudah siap di `SCHEMA.md` (tinggal `prisma db push` + `Next.js API`)

## 📊 Data Source

- `Documents/DATA SISWA/DATA SISWA MI JAMIYATUL FALAH KEDUNGNENG.xlsx` (No, Nama, Tempat, Tanggal, Kelas, JK)
- `Documents/DATA SISWA/DATABASE SISWA 2025-2026.xlsx` (NO INDUK, NISN, NAMA, KELAMIN, Tempat/Tgl Lahir, ALAMAT, KELAS, TAHUN MASUK)
- `Documents/DATA SISWA/DATA SISWA MIJAFA.xlsx` (+ NISN, NIK, Nama Ayah/Ibu)
- Logo: `FILE NAPISAH/LOGO MI/LOGO MI JAFA.jpg` & `logo yayasan.jpg`
- Kop: `kop mijafa.docx` → Yayasan, MI, Akreditasi B, alamat, telp, email

## 📄 Lisensi

MIT — Bebas dipakai internal MI JAMIYATUL FALAH KEDUNGNENG. Untuk publikasi, mohon anonimkan NIK/NISN siswa.

---

**TU MIJAFA:** jika butuh bantuan deploy, chat admin — cukup kirim link repo GitHub, akan dibantu setting Pages sampai live. Telp sekolah: 0858 7216 6251 • Email: mijafakedungneng@yahoo.co.id
