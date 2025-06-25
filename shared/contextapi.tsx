"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Base_url } from '@/app/api/config/BaseUrl';

/**
 * Branch Context API
 * 
 * This context provides branch management functionality throughout the app.
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

interface BranchContextType {
  branches: Branch[];
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch) => void;
  loading: boolean;
  error: string | null;
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

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${Base_url}branches`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch branches');
        }

        const data = await response.json();
        setBranches(data.results || []);

        // Set the first branch as default if branches exist
        if (data.results && data.results.length > 0) {
          setSelectedBranch(data.results[0]);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch branches');
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
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
      error
    }}>
      {children}
    </BranchContext.Provider>
  );
};

export const Initialload = createContext<any>(null);