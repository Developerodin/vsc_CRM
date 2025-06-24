import { getUserFromStorage, validateUser, validateUserRole, validateNavigationPermissions } from './permissions';

export interface PermissionDebugInfo {
  userExists: boolean;
  userValid: boolean;
  roleExists: boolean;
  roleValid: boolean;
  roleActive: boolean;
  permissionsValid: boolean;
  userData: any;
  validationErrors: string[];
}

export const debugUserPermissions = (): PermissionDebugInfo => {
  const debugInfo: PermissionDebugInfo = {
    userExists: false,
    userValid: false,
    roleExists: false,
    roleValid: false,
    roleActive: false,
    permissionsValid: false,
    userData: null,
    validationErrors: []
  };

  try {
    // Check if user exists in localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      debugInfo.validationErrors.push('No user data found in localStorage');
      return debugInfo;
    }

    debugInfo.userExists = true;

    // Parse user data
    const user = JSON.parse(userStr);
    debugInfo.userData = user;

    // Validate user
    if (!validateUser(user)) {
      debugInfo.validationErrors.push('User data validation failed');
      return debugInfo;
    }

    debugInfo.userValid = true;

    // Check role
    if (!user.role) {
      debugInfo.validationErrors.push('No role assigned to user');
      return debugInfo;
    }

    debugInfo.roleExists = true;

    // Validate role
    if (!validateUserRole(user.role)) {
      debugInfo.validationErrors.push('Role data validation failed');
      return debugInfo;
    }

    debugInfo.roleValid = true;

    // Check if role is active
    if (!user.role.isActive) {
      debugInfo.validationErrors.push('User role is inactive');
      return debugInfo;
    }

    debugInfo.roleActive = true;

    // Validate navigation permissions
    if (!validateNavigationPermissions(user.role.navigationPermissions)) {
      debugInfo.validationErrors.push('Navigation permissions validation failed');
      return debugInfo;
    }

    debugInfo.permissionsValid = true;

  } catch (error) {
    debugInfo.validationErrors.push(`Error during validation: ${error}`);
  }

  return debugInfo;
};

export const logPermissionDebugInfo = (): void => {
  const debugInfo = debugUserPermissions();
  
  console.group('🔍 Permission System Debug Info');
  console.log('User exists:', debugInfo.userExists);
  console.log('User valid:', debugInfo.userValid);
  console.log('Role exists:', debugInfo.roleExists);
  console.log('Role valid:', debugInfo.roleValid);
  console.log('Role active:', debugInfo.roleActive);
  console.log('Permissions valid:', debugInfo.permissionsValid);
  
  if (debugInfo.userData) {
    console.log('User data:', debugInfo.userData);
  }
  
  if (debugInfo.validationErrors.length > 0) {
    console.error('Validation errors:', debugInfo.validationErrors);
  }
  
  console.groupEnd();
};

export const getCurrentUserPermissions = (): any => {
  const user = getUserFromStorage();
  if (!user || !user.role) {
    return null;
  }

  return {
    roleName: user.role.name,
    roleActive: user.role.isActive,
    navigationPermissions: user.role.navigationPermissions,
    apiPermissions: user.role.apiPermissions,
    branchAccess: user.role.branchAccess,
    allBranchesAccess: user.role.allBranchesAccess
  };
};

export const checkSpecificPermission = (permission: string): { hasPermission: boolean; reason?: string } => {
  const debugInfo = debugUserPermissions();
  
  if (!debugInfo.userValid) {
    return { hasPermission: false, reason: 'Invalid user data' };
  }

  if (!debugInfo.roleValid) {
    return { hasPermission: false, reason: 'Invalid role data' };
  }

  if (!debugInfo.roleActive) {
    return { hasPermission: false, reason: 'Role is inactive' };
  }

  if (!debugInfo.permissionsValid) {
    return { hasPermission: false, reason: 'Invalid permissions data' };
  }

  const user = getUserFromStorage();
  if (!user?.role?.navigationPermissions) {
    return { hasPermission: false, reason: 'No permissions found' };
  }

  const permissions = user.role.navigationPermissions;
  
  // Check if permission exists
  if (!(permission in permissions)) {
    return { hasPermission: false, reason: `Permission '${permission}' not found in navigation permissions` };
  }

  const hasAccess = permissions[permission as keyof typeof permissions];
  return { 
    hasPermission: hasAccess, 
    reason: hasAccess ? undefined : `Permission '${permission}' is false` 
  };
}; 