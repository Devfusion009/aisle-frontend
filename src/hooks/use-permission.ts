import useSWR from 'swr';
import api from '@/lib/api';
import { useAuthStore } from '@/store/use-auth-store';
import { Permission, can, roleAtLeast, isHighPriorityUser } from '@/lib/rbac';
import { UserRole } from '@/types';

/** Does the current user hold this permission? */
export const useCan = (perm: Permission): boolean => {
  const user = useAuthStore((s) => s.user);
  return can(user, perm);
};

/** Is the current user at-or-above this role in the hierarchy? */
export const useRoleAtLeast = (min: UserRole): boolean => {
  const role = useAuthStore((s) => s.user?.role);
  return roleAtLeast(role, min);
};

/**
 * Per-dataset access check for the KB. Admin/owner/editor pass instantly.
 * A regular high-priority user goes to the backend for the grant list.
 */
export const useKbAccess = (datasetId?: string) => {
  const user = useAuthStore((s) => s.user);
  const globalRead = can(user, Permission.KB_READ);
  const shouldFetch = !globalRead && isHighPriorityUser(user);

  const { data, isLoading } = useSWR<string[]>(
    shouldFetch ? '/knowledge/my-datasets/ids' : null,
    (url: string) => api.get<string[]>(url).then((r) => r.data),
  );

  if (globalRead) return { allowed: true, loading: false };
  if (!shouldFetch) return { allowed: false, loading: false };
  if (!datasetId) return { allowed: !!data && data.length > 0, loading: isLoading };
  return { allowed: !!data?.includes(datasetId), loading: isLoading };
};
