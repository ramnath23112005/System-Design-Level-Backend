# URL Shortener & Analytics Platform — API Documentation

**Base URL**: `https://api.shorturl.com/api/v1` (production) | `http://localhost:3000/api/v1` (development)

---

## Authentication

### JWT Bearer Token

Most endpoints require authentication via a JSON Web Token (JWT) access token. Include it in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

**Token lifecycle:**
- **Access token**: Expires in 15 minutes (`JWT_EXPIRES_IN`)
- **Refresh token**: Expires in 7 days (`JWT_REFRESH_EXPIRES_IN`), stored in httpOnly cookie
- Use `POST /auth/refresh-token` to obtain a new access token before expiry

### API Key Authentication

Alternative authentication for programmatic access. Pass the API key in a header:

```
X-API-Key: <your_api_key>
```

API keys are generated automatically on registration (`uk_` prefix) and can be regenerated via `POST /user/api-key/regenerate`.

### Rate Limiting

| Limit Type | Window | Max Requests |
|---|---|---|
| Global API | 15 minutes | 100 |
| Auth endpoints | 15 minutes | 20 |
| Link creation | 1 minute | 10 |

Rate limit responses include headers:
- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset`
- `Retry-After`

---

## Response Format

All API responses follow a consistent envelope:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error response:**

```json
{
  "success": false,
  "data": null,
  "message": "Invalid email or password",
  "error": "Authentication failed",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| `200 OK` | — | Request succeeded |
| `201 Created` | — | Resource created successfully |
| `204 No Content` | — | Request succeeded, no content returned |
| `400 Bad Request` | `VALIDATION_ERROR` | Invalid input data |
| `401 Unauthorized` | `AUTHENTICATION_ERROR` | Missing or invalid credentials |
| `403 Forbidden` | `AUTHORIZATION_ERROR` | Insufficient permissions |
| `404 Not Found` | `NOT_FOUND` | Resource does not exist |
| `409 Conflict` | `CONFLICT` | Resource already exists (e.g., duplicate email, alias taken) |
| `422 Unprocessable` | `VALIDATION_ERROR` | Semantic validation failure |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | Rate limit hit |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Unexpected server error |
| `503 Service Unavailable` | `SERVICE_UNAVAILABLE` | Downstream dependency unhealthy |

---

## Endpoints

---

### Auth

---

#### `POST /auth/register`

Register a new user account.

**Auth required:** No

**Rate limit:** Auth limiter (20 req/15m)

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "name": "John Doe"
}
```

**Constraints:**
- `email`: Valid email format, max 255 characters, unique
- `password`: Minimum 8 characters, must contain uppercase, lowercase, digit (validated server-side by minimum length)
- `name`: Max 255 characters

**Success response** (201 Created):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Registration successful",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 400 | Missing required fields, invalid email format, weak password |
| 409 | Email already registered |

---

#### `POST /auth/login`

Authenticate with email and password.

**Auth required:** No

**Rate limit:** Auth limiter (20 req/15m)

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Login successful",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 401 | Invalid email or password |
| 403 | Account deactivated |

---

#### `POST /auth/refresh-token`

Obtain a new access token using a refresh token.

**Auth required:** No (uses refresh token from body or cookie)

**Request body (alternative to cookie):**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

The refresh token can also be sent via the `refreshToken` httpOnly cookie (set during login/register).

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Token refreshed successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 401 | Invalid or expired refresh token |
| 403 | Account deactivated |

---

#### `POST /auth/change-password`

Change the authenticated user's password.

**Auth required:** Yes (JWT)

**Rate limit:** Auth limiter (20 req/15m)

**Request body:**

```json
{
  "oldPassword": "currentPassword123!",
  "newPassword": "newSecurePassword456!"
}
```

**Constraints:**
- `newPassword` must be different from `oldPassword`
- `newPassword` minimum 8 characters

**Success response** (200 OK):

```json
{
  "success": true,
  "data": null,
  "message": "Password changed successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 400 | Old password is incorrect, or new password same as old |
| 401 | Authentication required |

---

#### `POST /auth/logout`

Log out the current user by clearing the refresh token cookie.

**Auth required:** Yes (JWT)

**Success response** (200 OK):

```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Links

---

#### `POST /links`

Create a new shortened link.

**Auth required:** Yes

**Rate limit:** Shortener limiter (10 req/1m)

**Request body:**

```json
{
  "originalUrl": "https://example.com/very/long/url/that/needs/shortening",
  "customAlias": "my-link",
  "title": "My Link",
  "tags": ["marketing", "campaign"],
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "password": "linkpassword"
}
```

**Constraints:**
- `originalUrl` (required): Valid http or https URL
- `customAlias` (optional): 4–20 characters, regex `/^[a-zA-Z0-9_-]{4,20}$/`
- `title` (optional): Max 255 characters
- `tags` (optional): Array of strings, max 50 chars each, max 10 tags
- `expiresAt` (optional): ISO 8601 datetime string
- `password` (optional): Minimum 4 characters

**Success response** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "originalUrl": "https://example.com/very/long/url/that/needs/shortening",
    "shortCode": "aB3xK9m",
    "customAlias": "my-link",
    "title": "My Link",
    "tags": ["marketing", "campaign"],
    "isActive": true,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "password": null,
    "clickCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Link created successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 400 | Invalid URL, invalid custom alias format, password too short |
| 401 | Authentication required |
| 409 | Custom alias already taken |

---

#### `GET /links`

List all links belonging to the authenticated user.

**Auth required:** Yes

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |
| `sortBy` | string | `created_at` | Sort column: `created_at`, `updated_at`, `click_count`, `original_url`, `title` |
| `sortOrder` | `asc` / `desc` | `desc` | Sort direction |
| `search` | string | — | Search in original URL and title |
| `tag` | string | — | Filter by tag |
| `isActive` | `true` / `false` | — | Filter by active status |

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "originalUrl": "https://example.com/page",
        "shortCode": "aB3xK9m",
        "customAlias": null,
        "title": "My Link",
        "tags": ["marketing"],
        "isActive": true,
        "expiresAt": null,
        "password": null,
        "clickCount": 42,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T00:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "message": "Links retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 401 | Authentication required |

---

#### `GET /links/:id`

Get details of a specific link.

**Auth required:** Yes

**Path parameters:**
- `id`: Link UUID

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "originalUrl": "https://example.com/page",
    "shortCode": "aB3xK9m",
    "customAlias": null,
    "title": "My Link",
    "tags": ["marketing"],
    "isActive": true,
    "expiresAt": null,
    "password": null,
    "clickCount": 42,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Link retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 401 | Authentication required |
| 403 | User does not own this link |
| 404 | Link not found |

---

#### `PATCH /links/:id`

Update a link's properties.

**Auth required:** Yes

**Path parameters:**
- `id`: Link UUID

**Request body:**

```json
{
  "originalUrl": "https://example.com/new-page",
  "title": "Updated Title",
  "tags": ["updated", "campaign"],
  "isActive": true,
  "expiresAt": "2025-01-01T00:00:00.000Z",
  "password": null
}
```

All fields are optional. Set `password` to `null` to remove password protection. Set `expiresAt` to `null` to remove expiration.

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "originalUrl": "https://example.com/new-page",
    "shortCode": "aB3xK9m",
    "customAlias": null,
    "title": "Updated Title",
    "tags": ["updated", "campaign"],
    "isActive": true,
    "expiresAt": "2025-01-01T00:00:00.000Z",
    "password": null,
    "clickCount": 42,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-16T00:00:00.000Z"
  },
  "message": "Link updated successfully",
  "error": null,
  "timestamp": "2024-01-16T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 400 | Invalid URL, invalid field values |
| 401 | Authentication required |
| 403 | User does not own this link |
| 404 | Link not found |

---

#### `DELETE /links/:id`

Soft-delete a link (sets `is_active` to `false`).

**Auth required:** Yes

**Path parameters:**
- `id`: Link UUID

**Success response** (200 OK):

```json
{
  "success": true,
  "data": null,
  "message": "Link deleted successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 401 | Authentication required |
| 403 | User does not own this link |
| 404 | Link not found |

---

#### `GET /links/:id/analytics`

Get aggregated analytics summary for a link.

**Auth required:** Yes

**Path parameters:**
- `id`: Link UUID

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `period` | string | — | Period filter: `7d`, `30d`, `90d`, or `Xd` format |

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "totalClicks": 1542,
    "uniqueVisitors": 892,
    "topCountries": [
      { "country": "United States", "count": 623 },
      { "country": "United Kingdom", "count": 245 }
    ],
    "topBrowsers": [
      { "browser": "Chrome", "count": 890 },
      { "browser": "Safari", "count": 342 }
    ],
    "topDevices": [
      { "deviceType": "desktop", "count": 987 },
      { "deviceType": "mobile", "count": 555 }
    ],
    "topReferrers": [
      { "referer": "https://twitter.com", "count": 234 },
      { "referer": "https://facebook.com", "count": 123 }
    ],
    "clicksOverTime": [
      { "date": "2024-01-01", "count": 45 },
      { "date": "2024-01-02", "count": 67 }
    ]
  },
  "message": "Analytics retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 401 | Authentication required |
| 403 | User does not own this link |
| 404 | Link not found |

---

#### `GET /links/:id/qr`

Get the generated QR code for a link.

**Auth required:** Yes

**Path parameters:**
- `id`: Link UUID

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "qrCodeUrl": "https://cdn.shorturl.com/qr-codes/user-uuid/link-uuid-123456789.png",
    "linkId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  },
  "message": "QR code retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 401 | Authentication required |
| 403 | User does not own this link |
| 404 | Link or QR code not found |

---

#### `POST /links/:id/qr`

Generate (or regenerate) a QR code for a link.

**Auth required:** Yes

**Rate limit:** Shortener limiter (10 req/1m)

**Path parameters:**
- `id`: Link UUID

**Request body:**

```json
{
  "size": 400,
  "format": "png",
  "margin": 4,
  "color": {
    "dark": "#000000",
    "light": "#ffffff"
  },
  "errorCorrectionLevel": "M"
}
```

**Constraints:**
- `size`: 1–2000 pixels (default 400)
- `format`: `png` or `svg` (default `png`)
- `margin`: 0–50 modules (default 4)
- `color.dark`: Hex color for dark modules (default `#000000`)
- `color.light`: Hex color for light modules (default `#ffffff`)
- `errorCorrectionLevel`: `L` (7%), `M` (15%), `Q` (25%), `H` (30%) — default `M`

The job is processed asynchronously via Bull queue. The response returns immediately once the QR code is generated and uploaded to S3.

**Success response** (201 Created):

```json
{
  "success": true,
  "data": {
    "qrCodeUrl": "https://cdn.shorturl.com/qr-codes/user-uuid/link-uuid-123456789.png",
    "linkId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  },
  "message": "QR code generated successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Analytics

---

#### `GET /analytics/dashboard`

Get aggregate dashboard statistics for the authenticated user across all links.

**Auth required:** Yes

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `period` | string | `7d` | Period: `24h`, `7d`, `30d`, `90d`, or `Xd` format |

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "totalClicks": 5723,
    "totalLinks": 15,
    "uniqueVisitors": 2341,
    "topLinks": [
      {
        "linkId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "shortCode": "aB3xK9m",
        "originalUrl": "https://example.com/promo",
        "clicks": 1200
      }
    ],
    "clicksToday": 245,
    "clicksThisWeek": 1567,
    "clicksThisMonth": 4200
  },
  "message": "Dashboard stats retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 401 | Authentication required |

---

#### `GET /analytics/links/:linkId/clicks`

Get paginated raw click events for a specific link with optional filters.

**Auth required:** Yes

**Path parameters:**
- `linkId`: Link UUID

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `startDate` | string (ISO) | — | Filter clicks after this date |
| `endDate` | string (ISO) | — | Filter clicks before this date |
| `country` | string | — | Filter by country code |
| `deviceType` | string | — | Filter by device type (desktop, mobile, tablet) |
| `browser` | string | — | Filter by browser name |

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "e5f6a7b8-c9d0-1234-efab-567890123456",
        "linkId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "ipAddress": "203.0.113.42",
        "userAgent": "Mozilla/5.0 ...",
        "referer": "https://twitter.com/status/1234",
        "country": "United States",
        "city": "New York",
        "browser": "Chrome",
        "browserVersion": "120.0",
        "os": "Windows",
        "osVersion": "10",
        "deviceType": "desktop",
        "deviceModel": null,
        "isMobile": false,
        "isTablet": false,
        "isDesktop": true
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 1542,
      "totalPages": 78,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "message": "Click analytics retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `GET /analytics/links/:linkId/geo`

Get geographic breakdown of clicks (by country and city).

**Auth required:** Yes

**Path parameters:**
- `linkId`: Link UUID

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "countries": [
      { "country": "United States", "count": 623, "percentage": 40.4 },
      { "country": "United Kingdom", "count": 245, "percentage": 15.9 }
    ],
    "cities": [
      { "city": "New York", "country": "United States", "count": 150, "percentage": 9.7 },
      { "city": "London", "country": "United Kingdom", "count": 120, "percentage": 7.8 }
    ]
  },
  "message": "Geographic data retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `GET /analytics/links/:linkId/devices`

Get device, browser, and OS breakdown.

**Auth required:** Yes

**Path parameters:**
- `linkId`: Link UUID

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "deviceTypes": [
      { "deviceType": "desktop", "count": 987, "percentage": 64.0 },
      { "deviceType": "mobile", "count": 555, "percentage": 36.0 }
    ],
    "browsers": [
      { "browser": "Chrome", "count": 890, "percentage": 57.7 },
      { "browser": "Safari", "count": 342, "percentage": 22.2 }
    ],
    "operatingSystems": [
      { "os": "Windows", "count": 720, "percentage": 46.7 },
      { "os": "macOS", "count": 350, "percentage": 22.7 }
    ]
  },
  "message": "Device analytics retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `GET /analytics/links/:linkId/timeline`

Get click counts over time.

**Auth required:** Yes

**Path parameters:**
- `linkId`: Link UUID

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `interval` | `hourly` / `daily` / `monthly` | `daily` | Aggregation interval |

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "interval": "daily",
    "data": [
      { "time": "2024-01-01T00:00:00.000Z", "count": 45 },
      { "time": "2024-01-02T00:00:00.000Z", "count": 67 },
      { "time": "2024-01-03T00:00:00.000Z", "count": 89 }
    ]
  },
  "message": "Clicks over time retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `GET /analytics/links/:linkId/referrers`

Get referrer traffic breakdown.

**Auth required:** Yes

**Path parameters:**
- `linkId`: Link UUID

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "referrers": [
      { "referer": "https://twitter.com", "count": 234, "percentage": 15.2 },
      { "referer": "https://facebook.com", "count": 123, "percentage": 8.0 }
    ],
    "directTraffic": 856,
    "directTrafficPercentage": 55.5
  },
  "message": "Referrer data retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `GET /analytics/realtime`

Get real-time click statistics for the last hour.

**Auth required:** Yes

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "clicksInLastHour": 34,
    "uniqueIpsInLastHour": 28,
    "recentClicks": [
      {
        "id": "e5f6a7b8-c9d0-1234-efab-567890123456",
        "linkId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "ipAddress": "203.0.113.42",
        "country": "United States",
        "browser": "Chrome",
        "deviceType": "desktop",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "topLinksNow": [
      { "linkId": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "shortCode": "aB3xK9m", "clicks": 12 }
    ]
  },
  "message": "Real-time stats retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `GET /analytics/links/:linkId/export`

Export analytics data for a link.

**Auth required:** Yes

**Path parameters:**
- `linkId`: Link UUID

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `format` | `csv` / `json` | `json` | Export format |

**Success response** (200 OK) — JSON format:

```json
{
  "success": true,
  "data": [
    {
      "id": "e5f6a7b8-c9d0-1234-efab-567890123456",
      "linkId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "ipAddress": "203.0.113.42",
      "userAgent": "Mozilla/5.0 ...",
      "referer": "https://twitter.com",
      "country": "United States",
      "city": "New York",
      "browser": "Chrome",
      "browserVersion": "120.0",
      "os": "Windows",
      "osVersion": "10",
      "deviceType": "desktop",
      "deviceModel": null,
      "isMobile": false,
      "isTablet": false,
      "isDesktop": true
    }
  ],
  "message": "Analytics exported successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**CSV format response** (200 OK) — Content-Type: `text/csv`:

```csv
id,linkId,timestamp,ipAddress,userAgent,referer,country,city,browser,browserVersion,os,osVersion,deviceType,deviceModel,isMobile,isTablet,isDesktop
e5f6a7b8,...,2024-01-15T10:30:00.000Z,203.0.113.42,Mozilla/5.0 ...,https://twitter.com,United States,New York,Chrome,120.0,Windows,10,desktop,,false,false,true
```

---

### User

---

#### `GET /user/profile`

Get the authenticated user's profile.

**Auth required:** Yes

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Profile retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

*Note: `passwordHash` and `apiKey` are excluded from the response.*

---

#### `PATCH /user/profile`

Update profile information.

**Auth required:** Yes

**Request body:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

Both fields are optional.

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-16T00:00:00.000Z"
  },
  "message": "Profile updated successfully",
  "error": null,
  "timestamp": "2024-01-16T00:00:00.000Z"
}
```

| Status | Condition |
|---|---|
| 401 | Authentication required |
| 409 | Email already in use |

---

#### `POST /user/api-key/regenerate`

Regenerate the API key. The old key is immediately invalidated.

**Auth required:** Yes

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "apiKey": "uk_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4"
  },
  "message": "API key regenerated successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Admin

All admin endpoints require authentication with a user role of `admin`.

---

#### `GET /admin/stats`

Get system-wide statistics.

**Auth required:** Yes (Admin)

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalLinks": 45000,
    "totalClicks": 2500000,
    "activeToday": 340,
    "newUsersToday": 12,
    "storageUsed": "2.5 GB"
  },
  "message": "System stats retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `GET /admin/activity`

Get recent platform activity.

**Auth required:** Yes (Admin)

**Success response** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "type": "user_registered",
      "userId": "a1b2c3d4-...",
      "email": "newuser@example.com",
      "timestamp": "2024-01-01T12:00:00.000Z"
    },
    {
      "type": "link_created",
      "userId": "a1b2c3d4-...",
      "shortCode": "aB3xK9m",
      "timestamp": "2024-01-01T11:55:00.000Z"
    }
  ],
  "message": "Recent activity retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `GET /admin/users`

List all users with pagination.

**Auth required:** Yes (Admin)

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `sortBy` | string | `created_at` | Sort column |
| `sortOrder` | `asc` / `desc` | `desc` | Sort direction |

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "a1b2c3d4-...",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "user",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 1250,
      "totalPages": 63,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "message": "Users retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `PATCH /admin/users/:userId`

Activate or deactivate a user account.

**Auth required:** Yes (Admin)

**Path parameters:**
- `userId`: User UUID

**Request body:**

```json
{
  "action": "activate"
}
```

`action` must be `"activate"` or `"deactivate"`.

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User activated successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `GET /admin/health`

Get system health status (database and cache connectivity).

**Auth required:** Yes (Admin)

**Success response** (200 OK):

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 1234567,
    "database": {
      "status": "healthy",
      "latencyMs": 2
    },
    "redis": {
      "status": "healthy",
      "latencyMs": 1
    },
    "queues": {
      "click_tracking": { "waiting": 0, "active": 3, "failed": 0 },
      "analytics_processing": { "waiting": 0, "active": 1, "failed": 0 },
      "qr_generation": { "waiting": 0, "active": 0, "failed": 0 },
      "email_notifications": { "waiting": 2, "active": 0, "failed": 0 }
    },
    "version": "1.0.0"
  },
  "message": "System health check completed",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Status codes:**
- 200: All systems healthy
- 503: One or more dependencies unhealthy

---

#### `GET /admin/logs`

View application logs.

**Auth required:** Yes (Admin)

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `level` | string | `all` | Filter by level: `error`, `warn`, `info`, `debug` |
| `limit` | integer | 100 | Number of log entries (max 1000) |

**Success response** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-01T12:00:00.000Z",
      "level": "info",
      "message": "User logged in",
      "userId": "a1b2c3d4-..."
    }
  ],
  "message": "Logs retrieved successfully",
  "error": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Redirect (Public)

---

#### `GET /:code`

Redirect to the original URL associated with a short code.

**Auth required:** No

**Rate limit:** Nginx redirect limit (500 r/s)

**Path parameters:**
- `code`: 7-character short code or custom alias (minimum 3 characters)

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `pwd` | string | Required if the link is password protected |

**Success response:** HTTP 302 redirect to the original URL.

**Password-protected link response** (401 Unauthorized):

```json
{
  "success": false,
  "data": null,
  "message": "This link is password protected",
  "error": "Password required",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 302 | Redirect to original URL |
| 401 | Password required or incorrect password |
| 404 | Short code not found |
| 410 | Link expired or deactivated |

---

## Webhook Events (Internal)

The platform emits the following events internally (via EventEmitter). These can be consumed by Bull queue processors for background handling:

| Event | Payload | Handler |
|---|---|---|
| `link.created` | `{ linkId, userId, shortCode }` | Analytics processing |
| `link.clicked` | `{ linkId, shortCode, ipAddress, country, clickCount, userId }` | Cache invalidation, analytics |
| `link.expired` | `{ linkId, userId, shortCode }` | Email notification |
| `link.deleted` | `{ linkId, userId, shortCode }` | Cache invalidation |
| `user.registered` | `{ userId, email }` | Welcome email |
| `user.logged_in` | `{ userId }` | Activity logging |
| `qr_code.generated` | `{ linkId, userId, qrCodeUrl, format }` | Notification |
