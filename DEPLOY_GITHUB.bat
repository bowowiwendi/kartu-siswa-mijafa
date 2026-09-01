@echo off
REM Deploy Kartu Siswa MIJAFA ke GitHub - double klik file ini setelah buat repo
REM GANTI username dan repo jika perlu

set USERNAME=bowowiwendi
set REPO=kartu-siswa-mijafa

echo === Buat repo baru di https://github.com/new ===
echo Nama repo: %REPO% (Public, jangan centang README)
echo Lalu jalankan script ini
echo.

git remote remove origin 2>nul
git remote add origin https://github.com/%USERNAME%/%REPO%.git
git branch -M main
git push -u origin main

echo.
echo Jika minta login, pakai Personal Access Token (PAT) sebagai password
echo Buat PAT: https://github.com/settings/tokens -> Generate new token (classic) -> centang repo
echo.
pause
