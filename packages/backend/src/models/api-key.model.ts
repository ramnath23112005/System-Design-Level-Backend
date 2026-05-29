import { IApiKey } from '@urlshortener/shared';
import { query } from '../database';

export interface ApiKeyRow {
  id: string;
  user_id: string;
  key: string;
  name: string;
  last_used_at: Date | null;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
}

function rowToApiKey(row: ApiKeyRow): IApiKey {
  return {
    id: row.id,
    userId: row.user_id,
    key: row.key,
    name: row.name,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export class ApiKeyModel {
  static async create(data: {
    id: string;
    userId: string;
    key: string;
    name?: string;
    expiresAt?: Date;
  }): Promise<IApiKey> {
    const result = await query<ApiKeyRow>(
      `INSERT INTO api_keys (id, user_id, key, name, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.id, data.userId, data.key, data.name || null, data.expiresAt || null]
    );
    return rowToApiKey(result.rows[0]);
  }

  static async findById(id: string): Promise<IApiKey | null> {
    const result = await query<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? rowToApiKey(result.rows[0]) : null;
  }

  static async findByKey(key: string): Promise<IApiKey | null> {
    const result = await query<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE key = $1',
      [key]
    );
    return result.rows.length > 0 ? rowToApiKey(result.rows[0]) : null;
  }

  static async findByUserId(userId: string): Promise<IApiKey[]> {
    const result = await query<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(rowToApiKey);
  }

  static async update(
    id: string,
    data: Partial<{
      name: string;
      expiresAt: Date | null;
      isActive: boolean;
    }>
  ): Promise<IApiKey | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.expiresAt !== undefined) {
      fields.push(`expires_at = $${paramIndex++}`);
      values.push(data.expiresAt);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query<ApiKeyRow>(
      `UPDATE api_keys SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows.length > 0 ? rowToApiKey(result.rows[0]) : null;
  }

  static async revoke(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE api_keys SET is_active = false WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async recordUsage(id: string): Promise<void> {
    await query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [id]
    );
  }
}
