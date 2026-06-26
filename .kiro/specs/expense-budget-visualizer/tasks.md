# Implementation Plan: Expense & Budget Visualizer

## Overview

Implementasi aplikasi web single-page tanpa framework: tepat tiga file (`index.html`, `css/style.css`, `js/app.js`). Pendekatan reactive render loop — setiap mutasi state memanggil `renderAll()` yang merender ulang Balance, Transaction List, dan Chart secara sinkron dari `AppState.transactions`. Chart.js dimuat via CDN; data persisten di LocalStorage dengan defensive try/catch.

---

## Tasks

- [x] 1. Buat struktur file dan kerangka HTML
  - Buat `index.html` di root dengan boilerplate HTML5, tag `<meta viewport>`, link ke `css/style.css`, dan dua tag `<script>`: satu untuk Chart.js CDN (`https://cdn.jsdelivr.net/npm/chart.js`) dan satu untuk `js/app.js` dengan atribut `defer`
  - Tambahkan semua elemen DOM yang diperlukan: `#balance-display`, `#transaction-form` (dengan `#input-name`, `#input-amount`, `#input-category`, `#form-error`), `#sort-control`, `#theme-toggle`, `#transaction-list`, `#chart-container` (dengan `#expense-chart` canvas dan `#chart-empty-message`)
  - Buat `css/style.css` kosong dan `js/app.js` kosong agar file structure tepat tiga file
  - _Requirements: 10.1, 10.2, 10.3, 9.3_

- [x] 2. Implementasi AppState, konstanta, dan fungsi utility
  - [x] 2.1 Definisikan `AppState` dan `STORAGE_KEYS` di `js/app.js`
    - Tulis objek `AppState` dengan field: `transactions`, `currentSort`, `currentTheme`, `storageAvailable`, `chartInstance`
    - Tulis `const STORAGE_KEYS = { TRANSACTIONS: 'ebv_transactions', THEME: 'ebv_theme' }`
    - _Requirements: 10.4, 8.1_

  - [x] 2.2 Implementasi `generateId()` dan `formatCurrency(amount)`
    - `generateId()`: kembalikan string unik format `ebv_${Date.now()}_${Math.random().toString(36).slice(2)}`
    - `formatCurrency(amount)`: format angka ke `"Rp X.XXX"` (pembulatan ke integer, pemisah ribuan titik, prefiks `"Rp "`)
    - _Requirements: 1.4, 3.2, 8.1_


- [x] 3. Implementasi LocalStorage (readStorage / writeStorage)
  - [x] 3.1 Implementasi `readStorage()` dan `writeStorage(transactions)`
    - `readStorage()`: bungkus `localStorage.getItem` dengan try/catch; jika JSON invalid, hapus key dan return `[]`; jika storage tidak tersedia, set `AppState.storageAvailable = false` dan return `[]`
    - `writeStorage(transactions)`: bungkus `localStorage.setItem` dengan try/catch; jika gagal, set `AppState.storageAvailable = false` dan panggil `showStorageError()`
    - Implementasi `showStorageError()`: tampilkan banner peringatan persisten di atas halaman
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 3.5_


- [x] 4. Implementasi validasi form dan perhitungan balance
  - [x] 4.1 Implementasi `validateForm(data)` dan `calculateBalance(transactions)`
    - `validateForm(data)`: periksa name tidak kosong/whitespace-only, amount adalah angka > 0 dan ≤ 9.999.999.999,99, category adalah salah satu "Food"/"Transport"/"Fun"; kembalikan `{ valid, errors }`
    - `calculateBalance(transactions)`: kembalikan `transactions.reduce((sum, t) => sum + t.amount, 0)`
    - _Requirements: 2.2, 2.3, 2.4, 1.2, 1.3, 1.5_


- [x] 5. Implementasi `sortTransactions` dan `aggregateByCategory`
  - [x] 5.1 Implementasi `sortTransactions(transactions, mode)`
    - Kembalikan **salinan** array (jangan mutasi aslinya) yang diurutkan sesuai mode: `'amount-high'`, `'amount-low'`, `'category-az'`, `'newest'`
    - Tiebreaker untuk Amount: urutkan berdasarkan date descending (newest-first)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


  - [x] 5.3 Implementasi `aggregateByCategory(transactions)`
    - Jumlahkan amount per kategori (Food, Transport, Fun); kembalikan `CategoryTotals`
    - Kategori dengan total 0 tidak boleh muncul di output
    - _Requirements: 4.1, 4.6_


- [x] 6. Implementasi `renderBalance()` dan `renderTransactionList()`
  - [x] 6.1 Implementasi `renderBalance()`
    - Hitung balance dari `AppState.transactions` menggunakan `calculateBalance()`
    - Update teks `#balance-display` dengan `formatCurrency(balance)`; jika 0 tampilkan `"Rp 0"`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 6.2 Implementasi `renderTransactionList()`
    - Ambil transaksi dari `AppState.transactions`, terapkan `sortTransactions()` sesuai `AppState.currentSort`
    - Render `<ul>` dengan `<li>` per transaksi: tampilkan name, `formatCurrency(amount)`, category badge, Delete_Button dengan `data-id`
    - Transaksi dengan `amount > 500000` diberi class `highlight-high`
    - Jika array kosong, tampilkan `"Belum ada transaksi."`
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 7.1, 7.2_

- [x] 7. Implementasi `renderChart()`
  - [x] 7.1 Implementasi `renderChart()`
    - Panggil `aggregateByCategory(AppState.transactions)` untuk mendapat data per kategori
    - Jika tidak ada data, sembunyikan canvas dan tampilkan `#chart-empty-message`
    - Jika `AppState.chartInstance` belum ada, buat Chart.js instance baru (type `'doughnut'` atau `'pie'`) pada `#expense-chart`; jika sudah ada, update `chart.data.labels`, `chart.data.datasets[0].data`, dan panggil `chart.update()`
    - Warna konsisten: Food = hijau (`#4CAF50`), Transport = biru (`#2196F3`), Fun = oranye (`#FF9800`)
    - Tampilkan legend dengan nama kategori dan warna
    - Tangani `window.Chart` tidak terdefinisi (CDN gagal load): tampilkan pesan fallback di `#chart-container`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 8. Implementasi `renderAll()`, `addTransaction()`, dan `deleteTransaction()`
  - [x] 8.1 Implementasi `renderAll()`, `addTransaction(data)`, dan `deleteTransaction(id)`
    - `renderAll()`: panggil `renderBalance()`, `renderTransactionList()`, `renderChart()` secara berurutan
    - `addTransaction(data)`: validasi dengan `validateForm()`; jika invalid tampilkan error di `#form-error` tanpa menyimpan; jika valid, buat objek Transaction (dengan `generateId()` dan `new Date().toISOString()`), push ke `AppState.transactions`, panggil `writeStorage()` lalu `renderAll()`, kemudian reset semua field form
    - `deleteTransaction(id)`: filter `AppState.transactions`, panggil `writeStorage()` lalu `renderAll()`
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 3.4, 8.1, 8.2_



- [x] 9. Checkpoint — Pastikan semua tests pass
  - Pastikan semua tests pass, tanyakan kepada user jika ada pertanyaan.

- [x] 10. Implementasi event listener, Sort_Control, dan Theme_Toggle
  - [x] 10.1 Pasang event listener untuk form submit, delete button, sort control, dan theme toggle
    - Form submit: `#transaction-form` listen `submit`, panggil `addTransaction()`
    - Delete button: delegasikan event `click` pada `#transaction-list`, cari `data-id`, panggil `deleteTransaction(id)`
    - Sort: `#sort-control` listen `change`, update `AppState.currentSort`, panggil `renderTransactionList()`
    - Theme toggle: `#theme-toggle` listen `click`, panggil `toggleTheme()`
    - _Requirements: 2.5, 3.4, 6.2, 5.1_

  - [x] 10.2 Implementasi `toggleTheme()`
    - Flip `AppState.currentTheme` antara `'light'` dan `'dark'`
    - Tambah/hapus class `dark` pada `<body>`
    - Simpan preferensi ke `localStorage.setItem(STORAGE_KEYS.THEME, ...)`
    - Update indikator visual di `#theme-toggle` (ikon atau label)
    - _Requirements: 5.2, 5.3, 5.4, 5.6_


- [x] 11. Implementasi inisialisasi aplikasi (DOMContentLoaded)
  - [x] 11.1 Tulis fungsi `init()` dan daftarkan ke `DOMContentLoaded`
    - Baca preferensi tema dari `localStorage.getItem(STORAGE_KEYS.THEME)` **sebelum** render konten; terapkan tema yang tersimpan (atau `'light'` sebagai default) dengan menambahkan class ke `<body>` untuk menghindari flash
    - Panggil `readStorage()` untuk mengisi `AppState.transactions`
    - Atur `AppState.currentSort` ke `'newest'` sebagai default
    - Panggil `renderAll()` untuk render state awal
    - _Requirements: 1.6, 3.1, 5.5, 8.3, 8.4_

- [x] 12. Styling: layout, tema, komponen UI
  - [x] 12.1 Tulis CSS custom properties dan layout utama di `css/style.css`
    - Definisikan CSS custom properties di `:root` untuk light mode: `--color-bg`, `--color-surface`, `--color-text`, `--color-border`, `--color-highlight`, dll.
    - Definisikan override untuk `body.dark` dengan palet dark mode
    - Layout utama: CSS Grid `grid-template-columns: 1fr 1fr` untuk area Transaction List dan Chart pada `min-width: 768px`
    - `@media (max-width: 767px)`: single column, Transaction List di atas, Chart di bawah
    - _Requirements: 4.7, 9.2, 5.2, 5.3_

  - [x] 12.2 Styling komponen: Balance_Display, Input_Form, Transaction List, Chart container
    - Balance_Display: tipografi besar, posisi atas halaman
    - Input_Form: field dengan label, tombol submit, area `#form-error` (tersembunyi saat tidak ada error)
    - `#transaction-list`: scrollable (`overflow-y: auto`, tinggi terbatas), setiap `<li>` berisi name, amount, category badge, dan delete button
    - Class `highlight-high`: background merah pada `<li>`
    - Theme_Toggle: tombol/switch dengan indikator visual, area sentuh ≥ 44×44px
    - Sort_Control: `<select>` dengan pilihan Amount Tertinggi, Amount Terendah, Category A-Z
    - Semua elemen interaktif: touch target ≥ 44×44px CSS
    - _Requirements: 3.3, 7.2, 5.6, 9.3, 2.1_

- [ ] 13. Checkpoint — Validasi fitur lengkap dan responsivitas
  - Pastikan semua tests pass, tanyakan kepada user jika ada pertanyaan.

## Notes

- Task bertanda `*` bersifat opsional dan dapat dilewati untuk MVP lebih cepat
- Setiap task merujuk ke requirements spesifik untuk traceability
- Design menggunakan Vanilla JS ES6+ sehingga tidak ada pertanyaan bahasa implementasi
- Property-based test menggunakan **fast-check** (ESM compatible, berjalan di browser maupun Node.js)
- Minimal **100 iterasi** per properti (`numRuns: 100`)
- Tag format per test: `// Feature: expense-budget-visualizer, Property N: <teks properti>`
- `arbitraryTransaction()` didefinisikan sekali dan digunakan oleh semua PBT
- `renderAll()` dipanggil setelah setiap mutasi — tidak ada render parsial yang berdiri sendiri
- Urutan implementasi: state/utils → storage → validasi → sort/agregasi → render → events → init → styling

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2"] },
    { "id": 1, "tasks": ["2.3", "3.1", "4.1", "5.1", "5.3"] },
    { "id": 2, "tasks": ["3.2", "4.2", "4.3", "5.2", "5.4"] },
    { "id": 3, "tasks": ["6.1", "6.2", "7.1", "8.1"] },
    { "id": 4, "tasks": ["6.3", "6.4", "8.2", "8.3", "10.1", "10.2"] },
    { "id": 5, "tasks": ["10.3", "11.1"] },
    { "id": 6, "tasks": ["12.1"] },
    { "id": 7, "tasks": ["12.2"] }
  ]
}
```
