import type { Permission, RoleFormData } from '../types';

/**
 * Builds navigation and API permission objects for create/update requests.
 */
export function buildRolePermissionsPayload(
  allPermissions: Permission[],
  selectedPermissions: string[]
) {
  const navigationPermissions: Record<string, boolean | Record<string, boolean>> = {};
  const apiPermissions: Record<string, boolean> = {};

  allPermissions.forEach((permission) => {
    if (permission.category === 'navigation') {
      if (permission.key.includes('.')) {
        const [parent, child] = permission.key.split('.');
        if (!navigationPermissions[parent] || typeof navigationPermissions[parent] === 'boolean') {
          navigationPermissions[parent] = {};
        }
        (navigationPermissions[parent] as Record<string, boolean>)[child] = false;
      } else {
        navigationPermissions[permission.key] = false;
      }
    } else if (permission.category === 'api') {
      apiPermissions[permission.key] = false;
    }
  });

  selectedPermissions.forEach((permissionKey) => {
    const permission = allPermissions.find((p) => p.key === permissionKey);
    if (!permission) return;

    if (permission.category === 'navigation') {
      if (permissionKey.includes('.')) {
        const [parent, child] = permissionKey.split('.');
        const parentVal = navigationPermissions[parent];
        if (parentVal && typeof parentVal === 'object') {
          parentVal[child] = true;
        }
      } else {
        navigationPermissions[permissionKey] = true;
      }
    } else if (permission.category === 'api') {
      apiPermissions[permissionKey] = true;
    }
  });

  return { navigationPermissions, apiPermissions };
}

/**
 * Maps form state + permissions to the role API request body.
 */
export function buildRoleRequestBody(
  formData: RoleFormData,
  allPermissions: Permission[],
  selectedPermissions: string[],
  selectedBranches: string[]
) {
  const { navigationPermissions, apiPermissions } = buildRolePermissionsPayload(
    allPermissions,
    selectedPermissions
  );

  return {
    name: formData.name.trim(),
    description: formData.description.trim() || undefined,
    isActive: formData.isActive,
    navigationPermissions,
    apiPermissions,
    branchAccess: formData.allBranchesAccess ? [] : selectedBranches,
    allBranchesAccess: formData.allBranchesAccess,
  };
}
