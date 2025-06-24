import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserFromStorage, hasPermission, hasRolePermission, validateUser } from './permissions';

export const useAuthGuard = (requiredPermission?: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const user = getUserFromStorage();
      
      if (!user) {
        // No user found, redirect to login
        setError('No user found. Please log in.');
        router.push('/');
        return;
      }

      // Validate user data
      if (!validateUser(user)) {
        setError('Invalid user data. Please log in again.');
        router.push('/');
        return;
      }

      if (requiredPermission) {
        // Use enhanced permission check
        const permissionCheck = hasRolePermission(requiredPermission as any);
        
        if (!permissionCheck.hasPermission) {
          setError(permissionCheck.reason || 'Access denied');
          // Redirect to dashboard instead of login for permission issues
          router.push('/dashboard');
          return;
        }
      }

      setHasAccess(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [requiredPermission, router]);

  return { isLoading, hasAccess, error };
};

export const withAuthGuard = (Component: React.ComponentType<any>, requiredPermission?: string) => {
  return function AuthenticatedComponent(props: any) {
    const { isLoading, hasAccess, error } = useAuthGuard(requiredPermission);

    if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>;
    }

    if (error) {
      return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Access Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>;
    }

    if (!hasAccess) {
      return null; // Will redirect in useAuthGuard
    }

    return <Component {...props} />;
  };
}; 