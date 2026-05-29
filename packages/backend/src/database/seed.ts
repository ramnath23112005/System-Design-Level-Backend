import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool, query } from './index';

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const adminId = uuidv4();
    const userId = uuidv4();
    const link1Id = uuidv4();
    const link2Id = uuidv4();
    const link3Id = uuidv4();
    const click1Id = uuidv4();
    const click2Id = uuidv4();
    const click3Id = uuidv4();
    const apiKey1Id = uuidv4();
    const apiKey2Id = uuidv4();

    const adminPasswordHash = await bcrypt.hash('Admin@123', 12);
    const userPasswordHash = await bcrypt.hash('User@123', 12);

    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role, api_key, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [adminId, 'admin@urlshortener.com', adminPasswordHash, 'Admin User', 'admin', 'admin-api-key-001', true]
    );

    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role, api_key, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [userId, 'user@urlshortener.com', userPasswordHash, 'Test User', 'user', 'user-api-key-001', true]
    );

    await client.query(
      `INSERT INTO links (id, user_id, original_url, short_code, custom_alias, title, tags, is_active, click_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (short_code) DO NOTHING`,
      [link1Id, userId, 'https://example.com/very-long-url-1', 'abc123', null, 'Example Link 1', ['example', 'demo'], true, 42]
    );

    await client.query(
      `INSERT INTO links (id, user_id, original_url, short_code, custom_alias, title, tags, is_active, click_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (short_code) DO NOTHING`,
      [link2Id, userId, 'https://docs.example.com/getting-started', 'def456', 'docs', 'Documentation', ['docs', 'guide'], true, 128]
    );

    await client.query(
      `INSERT INTO links (id, user_id, original_url, short_code, custom_alias, title, tags, is_active, click_count, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (short_code) DO NOTHING`,
      [link3Id, adminId, 'https://blog.example.com/promotion', 'ghi789', 'promo', 'Promotion Link', ['promo', '2024'], true, 7, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
    );

    await client.query(
      `INSERT INTO click_events (id, link_id, ip_address, user_agent, referer, country, city, latitude, longitude,
         browser, browser_version, os, os_version, device_type, device_model, is_mobile, is_tablet, is_desktop, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [click1Id, link1Id, '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'https://google.com', 'United States', 'New York', 40.7128, -74.0060, 'Chrome', '120.0', 'Windows', '10', 'desktop', 'Windows PC', false, false, true, new Date()]
    );

    await client.query(
      `INSERT INTO click_events (id, link_id, ip_address, user_agent, referer, country, city, latitude, longitude,
         browser, browser_version, os, os_version, device_type, device_model, is_mobile, is_tablet, is_desktop, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [click2Id, link1Id, '10.0.0.1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', 'https://twitter.com', 'United Kingdom', 'London', 51.5074, -0.1278, 'Safari', '17.0', 'iOS', '17.0', 'mobile', 'iPhone 15', true, false, false, new Date(Date.now() - 3600000)]
    );

    await client.query(
      `INSERT INTO click_events (id, link_id, ip_address, user_agent, referer, country, city, latitude, longitude,
         browser, browser_version, os, os_version, device_type, device_model, is_mobile, is_tablet, is_desktop, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [click3Id, link2Id, '172.16.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'https://github.com', 'Germany', 'Berlin', 52.5200, 13.4050, 'Firefox', '121.0', 'macOS', '14.0', 'desktop', 'MacBook Pro', false, false, true, new Date(Date.now() - 7200000)]
    );

    await client.query(
      `INSERT INTO api_keys (id, user_id, key, name, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO NOTHING`,
      [apiKey1Id, userId, 'sk_live_ABC123DEF456', 'Production API Key', true]
    );

    await client.query(
      `INSERT INTO api_keys (id, user_id, key, name, is_active, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (key) DO NOTHING`,
      [apiKey2Id, userId, 'sk_test_GHI789JKL012', 'Test API Key', true, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)]
    );

    await client.query('COMMIT');
    console.log('Seed data inserted successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(() => {
    console.log('Seeding completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
