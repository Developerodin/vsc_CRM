export interface Permission {
  key: string;
  title: string;
  description?: string;
  category: 'navigation' | 'api';
  path?: string;
  group?: string;
  children?: Record<string, Permission>;
}

export interface ApiPermissionsResponse {
  navigationPermissions: Record<string, Permission>;
  apiPermissions: Record<string, Permission>;
}

export interface Branch {
  id: string;
  name: string;
}

export interface RoleFormData {
  name: string;
  description: string;
  isActive: boolean;
  allBranchesAccess: boolean;
}

export interface RoleMeta {
  createdAt: string;
  updatedAt: string;
}
