import type { ApiPermissionsResponse, Permission } from '../types';

const API_GROUP_LABELS: Record<string, string> = {
  users: 'Users',
  teams: 'Teams',
  activities: 'Activities',
  branches: 'Branches',
  clients: 'Clients',
  groups: 'Groups',
  timelines: 'Timelines',
  roles: 'Roles',
  fileManager: 'File Manager',
  businessMaster: 'Business Master',
  entityMaster: 'Entity Master',
  other: 'Other',
};

/**
 * Flattens nested navigation + API permissions from the API into a single list.
 */
export function flattenPermissions(data: ApiPermissionsResponse): Permission[] {
  const flat: Permission[] = [];

  Object.entries(data.navigationPermissions).forEach(([key, permission]) => {
    flat.push({ ...permission, key, category: 'navigation' });
    if (permission.children) {
      Object.entries(permission.children).forEach(([childKey, childPermission]) => {
        flat.push({
          ...childPermission,
          key: `${key}.${childKey}`,
          category: 'navigation',
        });
      });
    }
  });

  Object.entries(data.apiPermissions).forEach(([key, permission]) => {
    flat.push({ ...permission, key, category: 'api' });
  });

  return flat;
}

/**
 * Splits navigation permissions into main pages vs settings submenu items.
 */
export function groupNavigationPermissions(permissions: Permission[]) {
  const navigation = permissions.filter((p) => p.category === 'navigation');
  return {
    main: navigation.filter((p) => !p.key.includes('.')),
    settings: navigation.filter((p) => p.key.startsWith('settings.')),
  };
}

/**
 * Groups API permissions by their `group` field for sectioned UI.
 */
export function groupApiPermissions(permissions: Permission[]) {
  const api = permissions.filter((p) => p.category === 'api');
  return api.reduce<Record<string, Permission[]>>((acc, permission) => {
    const group = permission.group || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(permission);
    return acc;
  }, {});
}

/**
 * Returns a human-readable label for an API permission group key.
 */
export function getApiGroupLabel(groupKey: string): string {
  return API_GROUP_LABELS[groupKey] ?? groupKey.replace(/([A-Z])/g, ' $1').trim();
}
