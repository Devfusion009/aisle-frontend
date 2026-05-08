// Admin route access is enforced by <RouteGuard> in the parent dashboard layout,
// which evaluates ROUTE_POLICY (see frontend/src/lib/rbac.ts) on every navigation.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
