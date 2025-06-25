"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Base_url } from '@/app/api/config/BaseUrl';

/**
 * Branch Context API
 * 
 * This context provides branch management functionality throughout the app.
 * It fetches the user's role by ID from localStorage and uses the branch access
 * information from the role response.
 * 
 * Usage:
 * 1. In any component, import: import { useBranchContext, useSelectedBranchId } from '@/shared/contextapi';
 * 2. Use the hook: const { branches, selectedBranch, setSelectedBranch, loading } = useBranchContext();
 * 3. Or get just the ID: const branchId = useSelectedBranchId();
 * 
 * Example:
 * ```tsx
 * const MyComponent = () => {
 *   const { selectedBranch } = useBranchContext();
 *   const branchId = useSelectedBranchId();
 *   
 *   // Use branchId in API calls
 *   const fetchData = async () => {
 *     const response = await fetch(`${Base_url}some-endpoint?branchId=${branchId}`);
 *   };
 * };
 * ```
 */

interface Branch {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  sortOrder: number;
  createdAt: string;
  branchHead: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  allBranchesAccess: boolean;
  branchAccess: Branch[];
  navigationPermissions: {
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
  };
  apiPermissions: {
    getUsers: boolean;
    manageUsers: boolean;
    getTeamMembers: boolean;
    manageTeamMembers: boolean;
    getActivities: boolean;
    manageActivities: boolean;
    getBranches: boolean;
    manageBranches: boolean;
    getClients: boolean;
    manageClients: boolean;
    getGroups: boolean;
    manageGroups: boolean;
    getRoles: boolean;
    manageRoles: boolean;
    getTimelines: boolean;
    manageTimelines: boolean;
  };
  createdAt: string;
  createdBy: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  role: {
    id: string;
    name: string;
  };
  assignedBranch: Branch;
  createdAt: string;
}

interface BranchContextType {
  branches: Branch[];
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch) => void;
  loading: boolean;
  error: string | null;
  userRole: Role | null;
  allBranchesAccess: boolean;
}

export const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const useBranchContext = () => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranchContext must be used within a BranchProvider');
  }
  return context;
};

// Utility hook to get selected branch ID
export const useSelectedBranchId = () => {
  const { selectedBranch } = useBranchContext();
  return selectedBranch?.id || null;
};

interface BranchProviderProps {
  children: ReactNode;
}

export const BranchProvider = ({ children }: BranchProviderProps) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [allBranchesAccess, setAllBranchesAccess] = useState(false);

  useEffect(() => {
    const fetchUserRoleAndBranches = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user data from localStorage
        const userDataString = localStorage.getItem('user');
        if (!userDataString) {
          throw new Error('User data not found in localStorage');
        }

        const userData: User = JSON.parse(userDataString);
        const roleId = userData.role?.id;

        if (!roleId) {
          throw new Error('Role ID not found in user data');
        }

        // Fetch role by ID
        const roleResponse = await fetch(`${Base_url}roles/${roleId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!roleResponse.ok) {
          throw new Error('Failed to fetch role');
        }

        const roleData: Role = await roleResponse.json();
        setUserRole(roleData);
        setAllBranchesAccess(roleData.allBranchesAccess);

        // If user has access to all branches, fetch all branches
        if (roleData.allBranchesAccess) {
          const branchesResponse = await fetch(`${Base_url}branches`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (!branchesResponse.ok) {
            throw new Error('Failed to fetch branches');
          }

          const branchesData = await branchesResponse.json();
          setBranches(branchesData.results || []);
        } else {
          // Use branch access from role
          setBranches(roleData.branchAccess || []);
        }

        // Set the first branch as default if branches exist
        const availableBranches = roleData.allBranchesAccess 
          ? (await fetch(`${Base_url}branches`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }).then(res => res.json()).then(data => data.results || []))
          : roleData.branchAccess || [];

        if (availableBranches.length > 0) {
          setSelectedBranch(availableBranches[0]);
        }
      } catch (err) {
        console.error('Error fetching user role and branches:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user role and branches');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoleAndBranches();
  }, []);

  const handleSetSelectedBranch = (branch: Branch) => {
    setSelectedBranch(branch);
  };

  return (
    <BranchContext.Provider value={{
      branches,
      selectedBranch,
      setSelectedBranch: handleSetSelectedBranch,
      loading,
      error,
      userRole,
      allBranchesAccess
    }}>
      {children}
    </BranchContext.Provider>
  );
};

export const Initialload = createContext<any>(null);