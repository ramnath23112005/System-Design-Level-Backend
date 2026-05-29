import { ILink, ICreateLinkInput, IUpdateLinkInput, IPaginationParams, IPaginatedResponse } from '@urlshortener/shared';
import { query } from '../database';

export interface LinkRow {
  id: string;
  user_id: string;
  original_url: string;
  short_code: string;
  custom_alias: string | null;
  title: string | null;
  tags: string[] | null;
  is_active: boolean;
  expires_at: Date | null;
  password: string | null;
  click_count: number;
  created_at: Date;
  updated_at: Date;
}

function rowToLink(row: LinkRow): ILink {
  return {
    id: row.id,
    userId: row.user_id,
    originalUrl: row.original_url,
    shortCode: row.short_code,
    customAlias: row.custom_alias,
    title: row.title,
    tags: row.tags || [],
    isActive: row.is_active,
    expiresAt: row.expires_at,
    password: row.password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class LinkModel {
  static async create(data: {
    id: string;
    userId: string;
    input: ICreateLinkInput;
    shortCode: string;
    passwordHash?: string;
  }): Promise<ILink> {
    const result = await query<LinkRow>(
      `INSERT INTO links (id, user_id, original_url, short_code, custom_alias, title, tags, password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.id,
        data.userId,
        data.input.originalUrl,
        data.shortCode,
        data.input.customAlias || null,
        data.input.title || null,
        data.input.tags && data.input.tags.length > 0 ? data.input.tags : null,
        data.passwordHash || null,
      ]
    );
    return rowToLink(result.rows[0]);
  }

  static async findByShortCode(shortCode: string): Promise<ILink | null> {
    const result = await query<LinkRow>(
      'SELECT * FROM links WHERE short_code = $1 OR custom_alias = $1',
      [shortCode]
    );
    return result.rows.length > 0 ? rowToLink(result.rows[0]) : null;
  }

  static async findById(id: string): Promise<ILink | null> {
    const result = await query<LinkRow>(
      'SELECT * FROM links WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? rowToLink(result.rows[0]) : null;
  }

  static async findByUserId(
    userId: string,
    params: IPaginationParams = {}
  ): Promise<IPaginatedResponse<ILink>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const allowedSortColumns = ['created_at', 'updated_at', 'click_count', 'original_url', 'title'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';

    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM links WHERE user_id = $1',
      [userId]
    );
    const totalItems = parseInt(countResult.rows[0].count, 10);

    const result = await query<LinkRow>(
      `SELECT * FROM links WHERE user_id = $1 ORDER BY ${safeSortBy} ${sortOrder} LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: result.rows.map(rowToLink),
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

  static async update(id: string, input: IUpdateLinkInput): Promise<ILink | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.originalUrl !== undefined) {
      fields.push(`original_url = $${paramIndex++}`);
      values.push(input.originalUrl);
    }
    if (input.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }
    if (input.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(input.tags.length > 0 ? input.tags : null);
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }
    if (input.expiresAt !== undefined) {
      fields.push(`expires_at = $${paramIndex++}`);
      values.push(input.expiresAt);
    }
    if (input.password !== undefined) {
      fields.push(`password = $${paramIndex++}`);
      values.push(input.password);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query<LinkRow>(
      `UPDATE links SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows.length > 0 ? rowToLink(result.rows[0]) : null;
  }

  static async softDelete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE links SET is_active = false WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async incrementClickCount(id: string): Promise<void> {
    await query(
      'UPDATE links SET click_count = click_count + 1 WHERE id = $1',
      [id]
    );
  }

  static async findExpired(): Promise<ILink[]> {
    const result = await query<LinkRow>(
      "SELECT * FROM links WHERE expires_at IS NOT NULL AND expires_at <= NOW() AND is_active = true"
    );
    return result.rows.map(rowToLink);
  }

  static async findByCustomAlias(alias: string): Promise<ILink | null> {
    const result = await query<LinkRow>(
      'SELECT * FROM links WHERE custom_alias = $1',
      [alias]
    );
    return result.rows.length > 0 ? rowToLink(result.rows[0]) : null;
  }
}
