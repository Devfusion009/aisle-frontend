'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { isRouteAllowed } from '@/lib/rbac';

/**
 * RouteGuard — client-side route gate.
 * Pairs with the backend (the real authority) by matching ROUTE_POLICY in lib/rbac.ts.
 * Drop as a wrapper inside a layout that covers the routes to be protected.
 */
export function RouteGuard({
  children,
  fallbackPath = '/forbidden',
}: {
  children: React.ReactNode;
  fallbackPath?: string;
}) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isRouteAllowed(pathname, user)) {
      router.replace(fallbackPath);
    }
  }, [isClient, isLoading, isAuthenticated, user, pathname, fallbackPath, router]);

  if (!isClient || isLoading || !isAuthenticated) return null;
  if (!isRouteAllowed(pathname, user)) return null;

  return <>{children}</>;
}
