import { initializeSQLite, executeUpdate, getOne, closeDatabase } from './database.js';
import { hashPassword, encryptData, generateMasterKeyHash } from '../utils/encryption.js';

/**
 * Database Seed Script
 * Untuk development dan testing - membuat sample data
 */

async function seedDatabase() {
  try {
    console.log('🌱 Memulai database seeding...\n');

    initializeSQLite();

    const testPassword = 'TestPassword123!';

    const users = [
      {
        username: 'demo_user',
        email: 'demo@vaultverse.com',
        password: testPassword
      },
      {
        username: 'john_doe',
        email: 'john@example.com',
        password: testPassword
      }
    ];

    console.log('👤 Membuat test users...');
    const createdUsers = [];

    for (const userData of users) {
      const existingUser = getOne('SELECT id FROM users WHERE username = ?', [userData.username]);
      
      if (existingUser) {
        console.log(`   ⚠️  User ${userData.username} sudah ada, skip...`);
        createdUsers.push(existingUser);
        continue;
      }

      const passwordHash = await hashPassword(userData.password);
      const masterKeyHash = await generateMasterKeyHash(userData.username, userData.password);

      const result = executeUpdate(
        'INSERT INTO users (username, email, password_hash, master_key_hash) VALUES (?, ?, ?, ?)',
        [userData.username, userData.email, passwordHash, masterKeyHash]
      );

      createdUsers.push({ id: result.lastInsertRowid });
      console.log(`   ✅ User ${userData.username} berhasil dibuat (ID: ${result.lastInsertRowid})`);
    }

    console.log('\n🔐 Membuat sample vault accounts...');

    const sampleAccounts = [
      {
        siteName: 'Gmail',
        siteUrl: 'https://gmail.com',
        username: 'user@gmail.com',
        email: 'user@gmail.com',
        password: 'MyGmailPassword123!',
        notes: 'Akun email utama untuk pekerjaan',
        category: 'email',
        isFavorite: 1
      },
      {
        siteName: 'Facebook',
        siteUrl: 'https://facebook.com',
        username: 'myusername',
        email: 'user@gmail.com',
        password: 'FacebookSecure456!',
        notes: 'Akun sosial media pribadi',
        category: 'social',
        isFavorite: 1
      },
      {
        siteName: 'Netflix',
        siteUrl: 'https://netflix.com',
        username: 'netflixuser',
        email: 'user@gmail.com',
        password: 'NetflixPass789!',
        notes: 'Langganan premium family plan',
        category: 'entertainment',
        isFavorite: 0
      },
      {
        siteName: 'GitHub',
        siteUrl: 'https://github.com',
        username: 'devuser',
        email: 'dev@example.com',
        password: 'GitHubToken2024!',
        notes: 'Akun developer untuk project open source',
        category: 'work',
        isFavorite: 1
      },
      {
        siteName: 'Amazon',
        siteUrl: 'https://amazon.com',
        username: null,
        email: 'shopping@example.com',
        password: 'AmazonShop2024!',
        notes: 'Akun belanja online dengan Prime membership',
        category: 'shopping',
        isFavorite: 0
      },
      {
        siteName: 'Dropbox',
        siteUrl: 'https://dropbox.com',
        username: 'clouduser',
        email: 'cloud@example.com',
        password: 'DropboxSecure321!',
        notes: 'Cloud storage 2TB - backup penting',
        category: 'cloud',
        isFavorite: 0
      },
      {
        siteName: 'LinkedIn',
        siteUrl: 'https://linkedin.com',
        username: 'professional',
        email: 'career@example.com',
        password: 'LinkedInCareer2024!',
        notes: 'Profil profesional untuk networking',
        category: 'work',
        isFavorite: 1
      },
      {
        siteName: 'Spotify',
        siteUrl: 'https://spotify.com',
        username: 'musiclover',
        email: 'music@example.com',
        password: 'SpotifyMusic123!',
        notes: 'Premium subscription - playlist favorit tersimpan',
        category: 'entertainment',
        isFavorite: 0
      }
    ];

    let accountCount = 0;

    for (const userId of [createdUsers[0].id]) {
      for (const account of sampleAccounts) {
        const encryptedPassword = encryptData(account.password);
        const encryptedNotes = account.notes ? encryptData(account.notes) : null;

        executeUpdate(
          `INSERT INTO accounts 
          (user_id, site_name, site_url, username, email, password_encrypted, notes_encrypted, category, is_favorite)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            account.siteName,
            account.siteUrl,
            account.username,
            account.email,
            encryptedPassword,
            encryptedNotes,
            account.category,
            account.isFavorite
          ]
        );

        accountCount++;
      }
    }

    console.log(`   ✅ ${accountCount} vault accounts berhasil dibuat\n`);

    console.log('═══════════════════════════════════════════');
    console.log('✅ Database seeding selesai!');
    console.log('═══════════════════════════════════════════\n');
    console.log('📝 Test Credentials:');
    console.log('   Username: demo_user');
    console.log('   Password: TestPassword123!');
    console.log('');
    console.log('   Username: john_doe');
    console.log('   Password: TestPassword123!');
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error saat seeding database:', error);
    process.exit(1);
  } finally {
    closeDatabase();
    console.log('Database connection ditutup.\n');
  }
}

seedDatabase();