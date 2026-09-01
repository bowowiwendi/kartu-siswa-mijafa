# Cara Deploy ke GitHub — MIJAFA

Projek sudah jadi di `C:\Users\SERVER MASTER\Desktop\kartu-siswa-mijafa` dan sudah `git commit`. Tinggal push.

## 1. Buat Repo di GitHub (1 menit)
1. Buka https://github.com/new
2. Repository name: `kartu-siswa-mijafa`
3. Visibility: **Public**
4. **JANGAN** centang Add README / .gitignore
5. Click **Create repository**

## 2. Push dari Laptop Ini (double klik)
- Double klik `DEPLOY_GITHUB.bat` di folder projek
- Jika `USERNAME` berbeda, edit dulu file tersebut: `set USERNAME=...`
- Saat diminta username/password: password = **Personal Access Token** (bukan password GitHub)
  - Buat token: https://github.com/settings/tokens → Generate new token (classic) → centang `repo` → Generate

Alternatif manual (PowerShell):
```powershell
cd "C:\Users\SERVER MASTER\Desktop\kartu-siswa-mijafa"
git remote add origin https://github.com/USERNAME/kartu-siswa-mijafa.git
git branch -M main
git push -u origin main
```

## 3. Aktifkan GitHub Pages (agar jadi website)
1. Di repo GitHub → **Settings** → **Pages** (menu kiri)
2. Build and deployment → Source: **GitHub Actions** (bukan Deploy from branch)
3. Tunggu 1-2 menit → buka **Actions** tab → lihat workflow **Deploy to GitHub Pages** berwarna hijau
4. Situs live di: `https://USERNAME.github.io/kartu-siswa-mijafa/`

## 4. Update Selanjutnya
Setiap edit, cukup:
```powershell
git add .
git commit -m "update"
git push
```
Otomatis deploy ulang via Actions.

## Troubleshooting
- `gh-pages` manual: `npm run deploy` (butuh token juga)
- Jika error `failed to push`, cek repo sudah dibuat dan username benar
- Jika Pages 404, pastikan Settings → Pages → Source = GitHub Actions dan workflow sudah success
