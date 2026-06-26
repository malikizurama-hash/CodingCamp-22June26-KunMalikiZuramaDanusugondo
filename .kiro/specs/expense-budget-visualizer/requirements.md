# Requirements Document

## Introduction

**Expense & Budget Visualizer** adalah aplikasi web mobile-friendly yang dibangun menggunakan pure HTML, CSS, dan Vanilla JavaScript tanpa framework apapun. Aplikasi ini memungkinkan pengguna melacak pengeluaran harian mereka secara visual — menampilkan total saldo, riwayat transaksi yang dapat di-scroll, form input transaksi, serta pie chart distribusi pengeluaran per kategori yang ditenagai Chart.js.

Aplikasi ini menyimpan seluruh data di Browser LocalStorage, sehingga data tetap tersedia setelah halaman di-refresh. MVP mencakup empat fitur utama (Total Balance, Input Form, Transaction List, Visual Chart) beserta tiga optional challenge (Dark/Light Mode Toggle, Sort Transaksi, Highlight Pengeluaran Tinggi).

Struktur file wajib mengikuti satu file HTML (`index.html`), satu file CSS (`css/style.css`), dan satu file JavaScript (`js/app.js`).

---

## Glossary

- **App**: Aplikasi web Expense & Budget Visualizer secara keseluruhan.
- **Storage**: Browser LocalStorage API yang digunakan untuk menyimpan dan membaca data transaksi.
- **Transaction**: Satu entri pengeluaran yang terdiri dari Item Name, Amount, dan Category.
- **Transaction List**: Daftar scrollable yang menampilkan semua transaksi yang tersimpan.
- **Balance**: Total akumulasi semua nilai Amount dari seluruh transaksi yang tersimpan.
- **Balance_Display**: Komponen UI yang menampilkan nilai Balance terkini di bagian atas halaman.
- **Input_Form**: Form HTML yang digunakan pengguna untuk menambahkan transaksi baru.
- **Validator**: Logika validasi yang memastikan semua field Input_Form terisi sebelum data disimpan.
- **Chart**: Komponen pie chart yang menggambarkan distribusi pengeluaran per kategori menggunakan Chart.js.
- **Category**: Klasifikasi transaksi; nilainya adalah salah satu dari: Food, Transport, atau Fun.
- **Delete_Button**: Tombol pada setiap item di Transaction List yang menghapus transaksi tersebut.
- **Theme_Toggle**: Tombol UI yang beralih antara mode gelap (dark) dan mode terang (light).
- **Sort_Control**: Elemen UI yang mengatur urutan tampilan Transaction List berdasarkan Amount atau Category.
- **Highlight_Rule**: Aturan visual yang menandai transaksi dengan Amount melebihi batas tertentu.
- **Threshold**: Nilai batas Amount untuk Highlight_Rule; default adalah Rp 500.000.

---

## Requirements

---

### Requirement 1: Total Balance

**User Story:** Sebagai pengguna, saya ingin melihat total pengeluaran saya secara real-time, agar saya dapat memantau kondisi keuangan saya setiap saat.

#### Acceptance Criteria

1. THE App SHALL menampilkan Balance_Display di bagian paling atas halaman setiap kali halaman dimuat.
2. WHEN sebuah transaksi baru berhasil ditambahkan, THE Balance_Display SHALL memperbarui nilai Balance secara otomatis dalam satu siklus render yang sama tanpa memuat ulang halaman.
3. WHEN sebuah transaksi dihapus, THE Balance_Display SHALL memperbarui nilai Balance secara otomatis dalam satu siklus render yang sama tanpa memuat ulang halaman.
4. THE Balance_Display SHALL menampilkan nilai Balance dalam format mata uang Rupiah dengan simbol "Rp" diikuti spasi, angka bulat, dan pemisah ribuan berupa titik (contoh: Rp 1.250.000).
5. WHEN tidak ada transaksi yang tersimpan, THE Balance_Display SHALL menampilkan nilai "Rp 0".
6. WHEN halaman dimuat dan Storage mengandung data transaksi yang valid, THE Balance_Display SHALL menghitung ulang dan menampilkan Balance berdasarkan seluruh data tersebut sebelum interaksi pertama pengguna.

---

### Requirement 2: Input Form

**User Story:** Sebagai pengguna, saya ingin mengisi form sederhana untuk mencatat pengeluaran baru, agar proses input terasa cepat dan tidak membingungkan.

#### Acceptance Criteria

1. THE Input_Form SHALL menyediakan field teks untuk Item Name (maksimal 100 karakter), field angka untuk Amount (antara 0,01 hingga 9.999.999.999,99), dan dropdown untuk Category dengan pilihan Food, Transport, dan Fun.
2. WHEN pengguna menekan tombol submit, THE Validator SHALL memeriksa apakah semua field — Item Name, Amount, dan Category — telah terisi dengan nilai yang valid.
3. IF pengguna menekan tombol submit dengan satu atau lebih field kosong atau Item Name hanya berisi spasi, THEN THE Validator SHALL menampilkan pesan error yang menjelaskan field mana yang belum terisi, tanpa menyimpan data.
4. IF pengguna mengisi Amount dengan nilai nol, nilai negatif, atau bukan angka, THEN THE Validator SHALL menampilkan pesan error bahwa Amount harus berupa angka positif lebih dari nol.
5. WHEN semua field terisi valid (Item Name tidak kosong dan bukan hanya spasi, Amount adalah angka positif lebih dari nol, Category adalah salah satu dari Food/Transport/Fun) dan pengguna menekan tombol submit, THE App SHALL menyimpan transaksi baru ke Storage dan mengosongkan semua field Input_Form.
6. WHEN transaksi baru berhasil disimpan, THE App SHALL memperbarui Transaction List, Balance_Display, dan Chart secara otomatis dalam satu siklus render yang sama tanpa memuat ulang halaman.

---

### Requirement 3: Transaction List

**User Story:** Sebagai pengguna, saya ingin melihat seluruh riwayat transaksi saya dalam satu daftar, agar saya dapat meninjau dan mengelola catatan pengeluaran saya.

#### Acceptance Criteria

1. WHEN halaman dimuat dan Storage dapat diakses, THE App SHALL membaca seluruh data transaksi dari Storage dan menampilkannya di Transaction List dengan urutan terbaru-pertama (newest-first) sebelum interaksi pertama pengguna.
2. THE Transaction List SHALL menampilkan setiap transaksi dengan informasi: Item Name, Amount dalam format "Rp" diikuti spasi dan angka bulat dengan pemisah ribuan berupa titik (contoh: Rp 10.000), Category sebagai badge/tag, dan Delete_Button.
3. THE Transaction List SHALL dapat di-scroll secara vertikal ketika jumlah item melebihi tinggi tampilan area daftar.
4. WHEN pengguna menekan Delete_Button pada sebuah transaksi, THE App SHALL menghapus transaksi tersebut dari Storage dan memperbarui Transaction List, Balance_Display, serta Chart langsung dalam satu siklus render yang sama.
5. WHEN akses ke Storage gagal saat halaman dimuat, THE App SHALL menampilkan pesan error yang memberi tahu pengguna bahwa data tidak dapat dimuat, dan Transaction List SHALL tetap ditampilkan dalam kondisi kosong.
6. WHEN tidak ada transaksi yang tersimpan atau seluruh transaksi telah dihapus, THE Transaction List SHALL menampilkan pesan "Belum ada transaksi."

---

### Requirement 4: Visual Chart (Pie Chart)

**User Story:** Sebagai pengguna, saya ingin melihat distribusi pengeluaran saya per kategori dalam bentuk pie chart, agar saya dapat memahami pola pengeluaran saya secara visual.

#### Acceptance Criteria

1. THE Chart SHALL merender pie chart menggunakan library Chart.js yang menampilkan distribusi persentase pengeluaran untuk setiap Category yang aktif (yaitu Category dengan total Amount lebih dari nol).
2. THE Chart SHALL menggunakan warna yang konsisten per Category: Food = hijau, Transport = biru, Fun = oranye.
3. THE Chart SHALL menampilkan legenda (legend) yang memuat nama Category beserta warna yang bersesuaian.
4. WHEN sebuah transaksi ditambahkan atau dihapus, THE Chart SHALL memperbarui data dan tampilan pie chart secara otomatis dalam satu siklus render yang sama tanpa memuat ulang halaman.
5. WHEN semua transaksi dihapus sehingga tidak ada data, THE Chart SHALL menampilkan pesan "Tidak ada data untuk ditampilkan."
6. WHEN sebuah Category tidak memiliki transaksi aktif (total Amount = 0), THE Chart SHALL menyembunyikan slice dan legend entry Category tersebut dari tampilan pie chart.
7. THE Chart SHALL ditempatkan sejajar secara horizontal dengan Transaction List dalam layout dua kolom pada layar dengan lebar minimal 768px, dan ditumpuk secara vertikal (Transaction List di atas, Chart di bawah) pada layar yang lebih sempit.

---

### Requirement 5: Dark / Light Mode Toggle

**User Story:** Sebagai pengguna, saya ingin dapat beralih antara tampilan terang dan gelap, agar saya nyaman menggunakan aplikasi dalam kondisi pencahayaan apapun.

#### Acceptance Criteria

1. THE App SHALL menyediakan Theme_Toggle berupa tombol atau switch yang dapat diakses dan diklik pada semua ukuran layar, termasuk layar sentuh dengan ukuran minimum 320px.
2. WHEN pengguna mengaktifkan Theme_Toggle dan tema saat ini adalah light, THE App SHALL beralih ke mode gelap dengan mengubah skema warna latar belakang, teks, card, input, dan komponen UI lainnya sesuai palet dark mode.
3. WHEN pengguna mengaktifkan Theme_Toggle dan tema saat ini adalah dark, THE App SHALL kembali ke mode terang dengan menerapkan kembali palet light mode.
4. WHEN mode tema berubah, THE App SHALL menyimpan preferensi tema ke Storage dengan kunci yang telah ditentukan.
5. WHEN halaman dimuat, THE App SHALL membaca preferensi tema dari Storage sebelum merender konten halaman; IF preferensi tema tersimpan ditemukan, THEN THE App SHALL menerapkan tema tersebut; IF tidak ada preferensi tema di Storage, THEN THE App SHALL menerapkan tema light sebagai default — sehingga tidak ada efek kedip (flash) perubahan tema yang terlihat oleh pengguna.
6. THE Theme_Toggle SHALL menampilkan indikator visual (misalnya ikon atau label) yang mencerminkan tema aktif saat ini.

---

### Requirement 6: Sort Transaksi

**User Story:** Sebagai pengguna, saya ingin dapat mengurutkan daftar transaksi berdasarkan jumlah atau kategori, agar saya dapat menganalisis pengeluaran dengan lebih mudah.

#### Acceptance Criteria

1. THE App SHALL menyediakan Sort_Control dengan pilihan: Amount Tertinggi, Amount Terendah, dan Category (A–Z); untuk transaksi dengan Amount yang sama pada pengurutan Amount, urutan tiebreaker adalah urutan penyisipan terbaru-pertama (newest-first).
2. WHEN pengguna memilih opsi urutan pada Sort_Control, THE Transaction List SHALL menampilkan ulang semua transaksi sesuai urutan yang dipilih dalam waktu tidak lebih dari 500ms.
3. THE App SHALL menerapkan pengurutan hanya pada tampilan Transaction List; membaca langsung data dari Storage harus mengembalikan urutan penyisipan asli, bukan urutan tampilan.
4. WHEN sebuah transaksi baru ditambahkan saat Sort_Control aktif, THE Transaction List SHALL menampilkan daftar yang sudah menyertakan transaksi baru dalam urutan yang sedang aktif dalam waktu tidak lebih dari 500ms.
5. WHEN Sort_Control diatur ulang ke kondisi default (tidak ada pengurutan aktif), THE Transaction List SHALL menampilkan transaksi dalam urutan penyisipan terbaru-pertama (newest-first).

---

### Requirement 7: Highlight Pengeluaran Tinggi

**User Story:** Sebagai pengguna, saya ingin transaksi dengan jumlah besar ditandai secara visual, agar saya langsung mengetahui pengeluaran yang perlu diperhatikan.

#### Acceptance Criteria

1. THE App SHALL menerapkan Highlight_Rule dengan Threshold default sebesar Rp 500.000, di mana setiap transaksi dengan Amount lebih dari Rp 500.000 (tidak termasuk tepat Rp 500.000) dianggap melebihi Threshold.
2. WHEN Amount sebuah transaksi melebihi Threshold, THE Transaction List SHALL menampilkan item tersebut dengan latar belakang berwarna merah sebagai penanda visual yang membedakannya dari item lain.
3. WHEN Sort_Control mengubah urutan tampilan Transaction List, THE Transaction List SHALL tetap menampilkan penanda visual pada semua transaksi yang Amount-nya melebihi Threshold.
4. WHEN sebuah transaksi dengan Amount di atas Threshold dihapus, THE Transaction List SHALL menghapus penanda visual tersebut bersama item yang dihapus.
5. WHEN Amount sebuah transaksi diubah sehingga nilai barunya tidak lagi melebihi Threshold, THE Transaction List SHALL menghilangkan penanda visual pada item tersebut.

---

### Requirement 8: Persistensi Data (LocalStorage)

**User Story:** Sebagai pengguna, saya ingin data pengeluaran saya tetap tersedia setelah me-refresh halaman atau menutup browser, agar saya tidak kehilangan catatan yang sudah saya masukkan.

#### Acceptance Criteria

1. WHEN sebuah transaksi baru ditambahkan, THE App SHALL menyimpan data transaksi ke Storage dalam format JSON terstruktur sebagai array of objects, di mana setiap object memiliki field: `id` (string unik), `name` (string Item Name), `amount` (number), `category` (string: "Food", "Transport", atau "Fun"), dan `date` (string ISO 8601 timestamp).
2. WHEN sebuah transaksi dihapus, THE App SHALL menghapus entri transaksi yang bersesuaian dari Storage berdasarkan `id` uniknya, sehingga hanya entri tersebut yang terhapus.
3. WHEN halaman dimuat dan Storage mengandung data JSON yang valid, THE App SHALL mem-parse data tersebut dan menampilkannya di Transaction List, Balance_Display, dan Chart.
4. WHEN halaman dimuat dan Storage mengandung data yang tidak dapat di-parse sebagai JSON valid, THE App SHALL menampilkan pesan error bahwa data tersimpan rusak, mengosongkan Storage, dan memulai sesi baru dengan daftar transaksi kosong.
5. IF Storage tidak tersedia (misalnya karena mode private/incognito yang memblokir LocalStorage) atau operasi tulis ke Storage gagal, THEN THE App SHALL menampilkan pesan error yang memberi tahu pengguna bahwa data tidak dapat disimpan, dan tetap memungkinkan penggunaan sesi tanpa persistensi (data hanya ada di memori selama sesi berlangsung).

---

### Requirement 9: Kompatibilitas Browser & Responsivitas

**User Story:** Sebagai pengguna, saya ingin aplikasi berjalan dengan baik di berbagai browser modern dan perangkat, agar saya dapat mengaksesnya dari mana saja.

#### Acceptance Criteria

1. THE App SHALL berfungsi secara penuh di Chrome, Firefox, Safari, dan Edge pada versi N dan N-1 (dua versi terbaru) tanpa tambahan kode polyfill.
2. THE App SHALL menampilkan layout yang responsif: dua kolom (Transaction List | Chart) pada layar dengan lebar minimal 768px, dan satu kolom pada layar yang lebih sempit dari 768px.
3. THE App SHALL memastikan semua elemen interaktif — tombol, input, dropdown — memiliki area sentuh minimal 44×44 piksel CSS dan dapat dijangkau pada layar sentuh berukuran 320px ke atas.
4. THE App SHALL memuat semua aset (HTML, CSS, JS, Chart.js via CDN) dan mencapai Time to Interactive kurang dari 3 detik pada koneksi broadband 10 Mbps.

---

### Requirement 10: Struktur File & Arsitektur Kode

**User Story:** Sebagai developer, saya ingin kode terorganisir dalam struktur yang jelas dan minimal, agar mudah dipahami, di-review, dan dipelihara.

#### Acceptance Criteria

1. THE App SHALL terdiri dari tepat tiga file: `index.html` di root, `css/style.css`, dan `js/app.js`.
2. THE App SHALL dibangun menggunakan HTML5, CSS3, dan Vanilla JavaScript (ES6+) tanpa menggunakan framework UI, library JavaScript, atau dependency eksternal apa pun selain Chart.js.
3. THE App SHALL memuat Chart.js melalui CDN di dalam `index.html` menggunakan tag `<script>` dengan atribut `src` yang mengarah ke URL CDN Chart.js.
4. THE `js/app.js` SHALL mengorganisir logika ke dalam fungsi-fungsi yang terpisah, di mana setiap fungsi menangani tepat satu tanggung jawab, mencakup minimal: satu fungsi untuk membaca data dari Storage, satu fungsi untuk menulis data ke Storage, satu fungsi untuk merender Transaction List, dan satu fungsi untuk merender Chart.
