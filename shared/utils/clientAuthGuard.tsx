import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const useClientAuthGuard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('clientToken');
      const clientDataStr = localStorage.getItem('clientData');
      
      if (!token || !clientDataStr) {
        setError('No client authentication found. Please log in.');
        router.push('/client-login');
        return;
      }

      try {
        const client = JSON.parse(clientDataStr);
        setClientData(client);
        setHasAccess(true);
      } catch (error) {
        setError('Invalid client data. Please log in again.');
        localStorage.removeItem('clientToken');
        localStorage.removeItem('clientData');
        router.push('/client-login');
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  return { isLoading, hasAccess, error, clientData };
};
