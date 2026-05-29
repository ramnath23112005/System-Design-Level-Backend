import { IUser, IPaginationParams, IPaginatedResponse } from '@urlshortener/shared';
import { query } from '../database';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  api_key: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function rowToUser(row: UserRow): IUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    role: row.role as 'user' | 'admin',
    apiKey: row.api_key || '',
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserModel {
  static async findByEmail(email: string): Promise<IUser | null> {
    const result = await query<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows.length > 0 ? rowToUser(result.rows[0]) : null;
  }

  static async findById(id: string): Promise<IUser | null> {
    const result = await query<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? rowToUser(result.rows[0]) : null;
  }

  static async create(data: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role?: string;
    apiKey?: string;
  }): Promise<IUser> {
    const result = await query<UserRow>(
      `INSERT INTO users (id, email, password_hash, name, role, api_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.id, data.email, data.passwordHash, data.name, data.role || 'user', data.apiKey || null]
    );
    return rowToUser(result.rows[0]);
  }

  static async update(
    id: string,
    data: Partial<{
      email: string;
      passwordHash: string;
      name: string;
      role: string;
      apiKey: string;
      isActive: boolean;
    }>
  ): Promise<IUser | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.passwordHash !== undefined) {
      fields.push(`password_hash = $${paramIndex++}`);
      values.push(data.passwordHash);
    }
    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.apiKey !== undefined) {
      fields.push(`api_key = $${paramIndex++}`);
      values.push(data.apiKey);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows.length > 0 ? rowToUser(result.rows[0]) : null;
  }

  static async findByApiKey(apiKey: string): Promise<IUser | null> {
    const result = await query<UserRow>(
      'SELECT * FROM users WHERE api_key = $1 AND is_active = true',
      [apiKey]
    );
    return result.rows.length > 0 ? rowToUser(result.rows[0]) : null;
  }

  static async findAll(
    params: IPaginationParams = {}
  ): Promise<IPaginatedResponse<IUser>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const allowedSortColumns = ['created_at', 'email', 'name', 'role', 'updated_at'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';

    const countResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM users');
    const totalItems = parseInt(countResult.rows[0].count, 10);

    const result = await query<UserRow>(
      `SELECT * FROM users ORDER BY ${safeSortBy} ${sortOrder} LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: result.rows.map(rowToUser),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
