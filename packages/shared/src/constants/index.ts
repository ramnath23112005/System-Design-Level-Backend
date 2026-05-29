export enum HTTP_STATUS {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export enum ROLES {
  USER = 'user',
  ADMIN = 'admin',
}

export enum CACHE_PREFIXES {
  LINKS = 'links',
  USERS = 'users',
  ANALYTICS = 'analytics',
  QR_CODES = 'qr_codes',
  RATE_LIMIT = 'rate_limit',
}

export enum QUEUE_NAMES {
  CLICK_TRACKING = 'click_tracking',
  ANALYTICS_PROCESSING = 'analytics_processing',
  EMAIL_NOTIFICATIONS = 'email_notifications',
  QR_GENERATION = 'qr_generation',
  CACHE_INVALIDATION = 'cache_invalidation',
}

export enum EVENT_TYPES {
  LINK_CREATED = 'link.created',
  LINK_CLICKED = 'link.clicked',
  LINK_EXPIRED = 'link.expired',
  LINK_DELETED = 'link.deleted',
  USER_REGISTERED = 'user.registered',
  USER_LOGGED_IN = 'user.logged_in',
  USER_UPDATED = 'user.updated',
  PASSWORD_RESET_REQUESTED = 'password.reset_requested',
  PASSWORD_RESET_COMPLETED = 'password.reset_completed',
  API_KEY_CREATED = 'api_key.created',
  API_KEY_REVOKED = 'api_key.revoked',
  RATE_LIMIT_EXCEEDED = 'rate_limit.exceeded',
  QR_CODE_GENERATED = 'qr_code.generated',
  CACHE_CLEARED = 'cache.cleared',
}

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const SHORT_CODE_LENGTH = 7;

export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000,
  MAX_REQUESTS: 100,
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  AUTH_MAX_REQUESTS: 20,
  API_WINDOW_MS: 60 * 1000,
  API_MAX_REQUESTS: 60,
  CREATE_LINK_WINDOW_MS: 60 * 1000,
  CREATE_LINK_MAX_REQUESTS: 10,
} as const;
