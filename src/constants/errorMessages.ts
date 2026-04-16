export const ERR_MSGS = {
  AUTH: {
    NAME_EMAIL_PASSWORD_REQUIRED: 'name, email and password are required',
    EMAIL_PASSWORD_REQUIRED: 'email and password are required',
    EMAIL_ALREADY_REGISTERED: 'Email is already registered',
    INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password',
    UNAUTHORIZED: 'Unauthorized',
    AUTH_HEADER_REQUIRED: 'Authorization header is required',
    INVALID_AUTH_FORMAT: 'Invalid authorization format. Use Bearer <token>',
    INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',
    USER_NOT_FOUND: 'User not found',
    ACCOUNT_SUSPENDED: 'Account is suspended',
    ACCOUNT_DEACTIVATED: 'Account is deactivated',
  },
  ME: {
    CATEGORY_ID_REQUIRED: 'Valid category id is required',
    CATEGORY_NOT_FOUND: 'Category not found',
    CATEGORY_ALREADY_EXISTS: 'Category already added to user preferences',
    CATEGORY_PREFERENCE_NOT_FOUND: 'User category preference not found',
  },
  GENERAL: {
    INTERNAL_SERVER_ERROR: 'Internal server error',
    ROUTE_NOT_FOUND_PREFIX: 'Route not found:',
  },
} as const;