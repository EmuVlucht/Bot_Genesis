# VaultVerse - Secure Password Vault Management System

VaultVerse adalah aplikasi password manager full-stack yang aman dengan enkripsi end-to-end menggunakan AES-256. Aplikasi ini dirancang untuk menyimpan dan mengelola kredensial akun Anda dengan keamanan tingkat enterprise dan antarmuka yang modern dan intuitif.

## 🔐 Fitur Keamanan

- **Enkripsi Berlapis**: Password pengguna di-hash dengan bcrypt, password vault dienkripsi dengan AES-256
- **JWT Authentication**: Session management dengan access token dan refresh token
- **Rate Limiting**: Proteksi terhadap brute force attacks
- **Audit Logging**: Pencatatan lengkap semua aktivitas pengguna
- **Session Management**: Tracking dan kontrol session di berbagai perangkat
- **Input Validation**: Validasi ketat untuk semua input pengguna

## ✨ Fitur Utama

- Manajemen akun vault dengan kategori dan tag favorit
- Pencarian dan filter akun yang powerful
- Export dan import data terenkripsi untuk backup
- Password strength indicator real-time
- Copy to clipboard dengan feedback visual
- Responsive design untuk desktop dan mobile
- Dark mode interface yang modern
- Offline mode dengan IndexedDB (bonus)

## 🏗️ Teknologi Stack

### Backend
- Node.js 18+ dengan Express.js
- SQLite dengan better-sqlite3 (atau MongoDB opsional)
- Bcrypt untuk password hashing
- AES-256-CBC untuk enkripsi data
- JWT untuk session management
- Helmet untuk security headers

### Frontend
- React 18 dengan Vite
- React Router untuk navigation
- Axios untuk HTTP client
- Tailwind CSS untuk styling
- Lucide React untuk icons
- Dexie untuk IndexedDB (offline mode)

## 📦 Instalasi

### Prerequisites
- Node.js versi 18 atau lebih baru
- npm atau yarn package manager

### Setup Backend

```bash
# Masuk ke folder server
cd server

# Install dependencies
npm install

# Copy environment example
cp .env.example .env

# Edit file .env dan isi dengan konfigurasi Anda
nano .env

# Generate encryption keys
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # untuk JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # untuk AES_ENCRYPTION_KEY

# Inisialisasi database dan seed data (opsional)
npm run seed

# Jalankan server
npm run dev
```

### Setup Frontend

```bash
# Masuk ke folder client
cd client

# Install dependencies
npm install

# Copy environment example (jika ada)
# cp .env.example .env

# Jalankan development server
npm run dev
```

## 🚀 Menjalankan Aplikasi

### Development Mode

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

Aplikasi akan berjalan di:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Production Build

Backend:
```bash
cd server
NODE_ENV=production npm start
```

Frontend:
```bash
cd client
npm run build
npm run preview
```

## 🔑 Konfigurasi Environment

### Server (.env)

```env
# Server
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database
DB_TYPE=sqlite
SQLITE_PATH=./db/vaultverse.db

# JWT (generate dengan crypto.randomBytes)
JWT_SECRET=your_64_char_jwt_secret_here
JWT_EXPIRES_IN=7d

# AES Encryption (generate dengan crypto.randomBytes(32))
AES_ENCRYPTION_KEY=your_32_byte_aes_key_here

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS=100
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Registrasi user baru
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile

### Vault Accounts
- `GET /api/accounts` - Get all accounts dengan filter
- `GET /api/accounts/:id` - Get detail account dengan password terdekripsi
- `POST /api/accounts` - Create account baru
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `GET /api/categories` - Get kategori yang tersedia

### Export/Import
- `POST /api/export` - Export vault data terenkripsi
- `POST /api/import` - Import vault data
- `POST /api/import/validate` - Validasi file import

### System
- `GET /api/health` - Health check
- `GET /api/info` - API information

## 👤 Default Test Account

Setelah menjalankan seed script, Anda dapat login dengan:

```
Username: demo_user
Password: TestPassword123!
```

Atau:

```
Username: john_doe  
Password: TestPassword123!
```

## 🔒 Keamanan Best Practices

### Untuk Production:
1. Gunakan HTTPS untuk semua komunikasi
2. Generate secret keys yang kuat dan unik
3. Ubah default BCRYPT_SALT_ROUNDS sesuai hardware
4. Set JWT_EXPIRES_IN yang sesuai kebijakan security
5. Aktifkan CORS dengan origin spesifik
6. Set NODE_ENV=production
7. Gunakan environment variables yang aman
8. Backup database secara teratur
9. Monitor activity logs untuk suspicious behavior
10. Update dependencies secara berkala

### Password Requirements:
- Minimal 8 karakter
- Mengandung huruf besar dan kecil
- Mengandung angka
- Mengandung karakter spesial

## 📱 Penggunaan Aplikasi

### Registrasi
1. Klik "Daftar sekarang" di halaman login
2. Isi username (minimal 3 karakter, alphanumeric)
3. Isi email yang valid
4. Buat password yang kuat (sistem akan menampilkan strength indicator)
5. Konfirmasi password
6. Klik "Daftar"

### Menambah Akun ke Vault
1. Klik tombol "Tambah Akun" di dashboard
2. Isi nama situs (wajib)
3. Isi URL situs (opsional tapi direkomendasikan)
4. Isi username atau email
5. Masukkan password akun tersebut
6. Pilih kategori yang sesuai
7. Tambahkan catatan jika perlu
8. Centang "Tandai sebagai favorit" jika ingin
9. Klik "Tambah Akun"

### Melihat Detail Akun
1. Klik pada card akun di dashboard
2. Password akan tersembunyi secara default
3. Klik ikon mata untuk menampilkan password
4. Klik ikon copy untuk menyalin password ke clipboard
5. Gunakan tombol "Edit" atau "Hapus" sesuai kebutuhan

### Export Data
1. Klik tombol "Export" di header
2. Masukkan password untuk enkripsi file export
3. File JSON terenkripsi akan didownload
4. Simpan file ini di tempat yang aman untuk backup

### Import Data
1. Klik tombol "Import" di header
2. Upload file JSON yang telah diekspor sebelumnya
3. Masukkan password yang digunakan saat export
4. Pilih mode: "Merge" (tambahkan ke existing) atau "Replace" (ganti semua)
5. Klik "Import"

## 🛠️ Development

### Struktur Proyek

```
vaultverse/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── utils/         # Utility functions
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   ├── public/
│   └── package.json
│
├── server/                # Backend Express
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions
│   └── server.js         # Entry point
│
├── db/                   # Database
│   ├── schema.sql        # SQLite schema
│   ├── database.js       # DB connection
│   └── seed.js           # Sample data
│
├── config/               # Configuration
│   └── config.js         # App config
│
└── README.md
```

## 🐛 Troubleshooting

### Database Connection Error
- Pastikan path database benar di .env
- Check permission folder db/
- Coba hapus file database dan run seed ulang

### JWT Token Invalid
- Check JWT_SECRET sudah di-set dengan benar
- Clear browser localStorage dan login ulang
- Pastikan JWT_SECRET tidak berubah di production

### CORS Error
- Pastikan CLIENT_URL di .env match dengan frontend URL
- Check corsOptions di server.js
- Untuk development, pastikan ports 3000 dan 5000 terbuka

### Enkripsi Error
- Pastikan AES_ENCRYPTION_KEY tepat 32 karakter (64 hex)
- Jangan ubah AES key jika sudah ada data terenkripsi
- Backup data sebelum mengubah encryption key

## 📄 License

MIT License - Lihat LICENSE file untuk detail lengkap.

## 👥 Credits

Dikembangkan dengan ❤️ untuk keamanan data Anda.

**VaultVerse** - Your passwords, secured.