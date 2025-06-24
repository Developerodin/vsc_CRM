export interface NavigationPermissions {
  settings: {
    activities: boolean;
    branches: boolean;
    users: boolean;
    roles: boolean;
  };
  dashboard: boolean;
  clients: boolean;
  groups: boolean;
  teams: boolean;
  timelines: boolean;
  analytics: boolean;
}

export interface UserRole {
  navigationPermissions: NavigationPermissions;
  apiPermissions: any;
  branchAccess: string[];
  allBranchesAccess: boolean;
  isActive: boolean;
  name: string;
  createdBy: string | null;
  createdAt: string;
  id: string;
}

export interface User {
  isEmailVerified: boolean;
  name: string;
  email: string;
  role: UserRole;
  assignedBranch: any;
  createdAt: string;
  id: string;
}

// Validation functions
export const validateNavigationPermissions = (permissions: any): permissions is NavigationPermissions => {
  if (!permissions || typeof permissions !== 'object') {
    return false;
  }

  const requiredSettings = ['activities', 'branches', 'users', 'roles'];
  const requiredMain = ['dashboard', 'clients', 'groups', 'teams', 'timelines', 'analytics'];

  // Check if settings object exists and has all required properties
  if (!permissions.settings || typeof permissions.settings !== 'object') {
    return false;
  }

  for (const setting of requiredSettings) {
    if (typeof permissions.settings[setting] !== 'boolean') {
      return false;
    }
  }

  // Check if all main permissions exist and are boolean
  for (const permission of requiredMain) {
    if (typeof permissions[permission] !== 'boolean') {
      return false;
    }
  }

  return true;
};

export const validateUserRole = (role: any): role is UserRole => {
  if (!role || typeof role !== 'object') {
    return false;
  }

  const requiredFields = [
    'navigationPermissions', 'apiPermissions', 'branchAccess', 
    'allBranchesAccess', 'isActive', 'name', 'createdAt', 'id'
  ];

  // Check if all required fields exist
  for (const field of requiredFields) {
    if (!(field in role)) {
      return false;
    }
  }

  // Validate navigation permissions
  if (!validateNavigationPermissions(role.navigationPermissions)) {
    return false;
  }

  // Validate other fields
  if (typeof role.isActive !== 'boolean') {
    return false;
  }

  if (typeof role.name !== 'string' || role.name.trim() === '') {
    return false;
  }

  if (!Array.isArray(role.branchAccess)) {
    return false;
  }

  if (typeof role.allBranchesAccess !== 'boolean') {
    return false;
  }

  if (typeof role.id !== 'string' || role.id.trim() === '') {
    return false;
  }

  return true;
};

export const validateUser = (user: any): user is User => {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const requiredFields = [
    'isEmailVerified', 'name', 'email', 'role', 
    'assignedBranch', 'createdAt', 'id'
  ];

  // Check if all required fields exist
  for (const field of requiredFields) {
    if (!(field in user)) {
      return false;
    }
  }

  // Validate basic fields
  if (typeof user.isEmailVerified !== 'boolean') {
    return false;
  }

  if (typeof user.name !== 'string' || user.name.trim() === '') {
    return false;
  }

  if (typeof user.email !== 'string' || user.email.trim() === '') {
    return false;
  }

  if (typeof user.id !== 'string' || user.id.trim() === '') {
    return false;
  }

  // Validate role
  if (!validateUserRole(user.role)) {
    return false;
  }

  return true;
};

export const getUserFromStorage = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    
    // Validate the user data
    if (!validateUser(user)) {
      console.error('Invalid user data in localStorage');
      // Clear invalid data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    // Clear corrupted data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return null;
  }
};

export const hasPermission = (permission: keyof NavigationPermissions | 'settings'): boolean => {
  const user = getUserFromStorage();
  if (!user || !user.role || !user.role.navigationPermissions) {
    return false;
  }

  // Additional validation for role status
  if (!user.role.isActive) {
    console.warn('User role is inactive');
    return false;
  }

  const permissions = user.role.navigationPermissions;
  
  if (permission === 'settings') {
    // Check if user has access to any settings sub-items
    return permissions.settings.activities || 
           permissions.settings.branches || 
           permissions.settings.users || 
           permissions.settings.roles;
  }
  
  return permissions[permission] || false;
};

export const hasSettingsPermission = (setting: keyof NavigationPermissions['settings']): boolean => {
  const user = getUserFromStorage();
  if (!user || !user.role || !user.role.navigationPermissions) {
    return false;
  }

  // Additional validation for role status
  if (!user.role.isActive) {
    console.warn('User role is inactive');
    return false;
  }

  return user.role.navigationPermissions.settings[setting] || false;
};

// Enhanced permission check with role validation
export const hasRolePermission = (permission: keyof NavigationPermissions | 'settings'): { hasPermission: boolean; reason?: string } => {
  const user = getUserFromStorage();
  
  if (!user) {
    return { hasPermission: false, reason: 'No user found' };
  }

  if (!user.role) {
    return { hasPermission: false, reason: 'No role assigned to user' };
  }

  if (!user.role.isActive) {
    return { hasPermission: false, reason: 'User role is inactive' };
  }

  if (!validateUserRole(user.role)) {
    return { hasPermission: false, reason: 'Invalid role data' };
  }

  const hasAccess = hasPermission(permission);
  return { 
    hasPermission: hasAccess, 
    reason: hasAccess ? undefined : `Permission '${permission}' not granted` 
  };
};

export const logout = () => {
  if (typeof window === 'undefined') return;
  
  // Clear all authentication data
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  
  // Redirect to login page
  window.location.href = '/';
};

export const filterMenuItems = (menuItems: any[]): any[] => {
  return menuItems.filter(item => {
    // Always show category headers
    if (item.menutitle) {
      return true;
    }

    // Check main menu items
    if (item.type === 'link') {
      switch (item.path) {
        case '/dashboard':
          return hasPermission('dashboard');
        case '/clients':
          return hasPermission('clients');
        case '/groups':
          return hasPermission('groups');
        case '/teams':
          return hasPermission('teams');
        case '/timelines':
          return hasPermission('timelines');
        case '/analytics':
          return hasPermission('analytics');
        default:
          return true;
      }
    }

    // Check sub-menu items (Settings)
    if (item.type === 'sub' && item.children) {
      const filteredChildren = item.children.filter((child: any) => {
        switch (child.path) {
          case '/activities':
            return hasSettingsPermission('activities');
          case '/branches':
            return hasSettingsPermission('branches');
          case '/users':
            return hasSettingsPermission('users');
          case '/roles':
            return hasSettingsPermission('roles');
          default:
            return true;
        }
      });

      // Only show settings if there are visible children
      if (filteredChildren.length > 0) {
        item.children = filteredChildren;
        return true;
      }
      return false;
    }

    return true;
  });
}; 