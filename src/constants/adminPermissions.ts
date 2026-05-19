export const ADMIN_PERMISSIONS = [
  'MANAGE_REGISTRATION_REQUESTS',
  'MANAGE_LINK_REQUESTS',
  'MANAGE_DEATH_REQUESTS',
  'MANAGE_USERS',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const isAdminPermission = (value: unknown): value is AdminPermission => {
  return typeof value === 'string' && ADMIN_PERMISSIONS.includes(value as AdminPermission);
};

export const normalizeAdminPermissions = (permissions: unknown): AdminPermission[] => {
  if (!Array.isArray(permissions)) return [];

  const normalized = permissions.filter(isAdminPermission) as AdminPermission[];
  return Array.from(new Set(normalized));
};

