-- VaultVerse SQLite Database Schema
-- Digunakan untuk menyimpan data pengguna dan vault dengan enkripsi

-- Tabel Users: Menyimpan informasi autentikasi pengguna
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  master_key_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  is_active INTEGER DEFAULT 1,
  CONSTRAINT username_length CHECK (LENGTH(username) >= 3),
  CONSTRAINT email_format CHECK (email LIKE '%_@__%.__%')
);

-- Tabel Accounts: Menyimpan akun vault yang terenkripsi
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  site_name TEXT NOT NULL,
  site_url TEXT,
  username TEXT,
  email TEXT,
  password_encrypted TEXT NOT NULL,
  notes_encrypted TEXT,
  category TEXT DEFAULT 'general',
  is_favorite INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT site_name_required CHECK (LENGTH(site_name) > 0)
);

-- Tabel Sessions: Tracking JWT sessions dan refresh tokens
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  device_info TEXT,
  ip_address TEXT,
  is_valid INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabel Activity Logs: Audit trail untuk keamanan
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id INTEGER,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Index untuk optimasi query performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_site_name ON accounts(site_name);
CREATE INDEX IF NOT EXISTS idx_accounts_category ON accounts(category);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Trigger untuk auto-update timestamp
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_accounts_timestamp 
AFTER UPDATE ON accounts
BEGIN
  UPDATE accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- View untuk statistik dashboard (tanpa data sensitif)
CREATE VIEW IF NOT EXISTS user_vault_stats AS
SELECT 
  u.id as user_id,
  u.username,
  COUNT(a.id) as total_accounts,
  SUM(CASE WHEN a.is_favorite = 1 THEN 1 ELSE 0 END) as favorite_accounts,
  COUNT(DISTINCT a.category) as total_categories,
  MAX(a.created_at) as last_account_added,
  MAX(a.last_accessed) as last_vault_access
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id
WHERE u.is_active = 1
GROUP BY u.id, u.username;