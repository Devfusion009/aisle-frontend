import { User, UserRole, UserPriority } from '@/types';

/**
 * Frontend RBAC — MUST stay in sync with backend src/common/rbac/rbac.constants.ts.
 * Frontend checks are for UX only; the backend is the authority.
 */

export enum Permission {
  PLATFORM_MANAGE       = 'platform:manage',
  TENANT_MANAGE         = 'tenant:manage',
  TENANT_SETTINGS_VIEW  = 'tenant:settings:view',
  USER_MANAGE           = 'user:manage',
  ASSISTANT_READ        = 'assistant:read',
  ASSISTANT_MANAGE      = 'assistant:manage',
  KB_READ               = 'kb:read',
  KB_WRITE              = 'kb:write',
  KB_GRANT              = 'kb:grant',
  CHAT_USE              = 'chat:use',
  CONVERSATION_MANAGE   = 'conversation:manage',
  API_KEY_MANAGE        = 'apikey:manage',
  INTEGRATION_MANAGE    = 'integration:manage',
  BILLING_VIEW          = 'billing:view',
  ANALYTICS_VIEW        = 'analytics:view',
  PLAYGROUND_USE        = 'playground:use',
  DASHBOARD_VIEW        = 'dashboard:view',
}

export const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.USER]: 1,
  [UserRole.EDITOR]: 2,
  [UserRole.TENANT_ADMIN]: 3,
  [UserRole.TENANT_OWNER]: 4,
  [UserRole.PLATFORM_ADMIN]: 5,
};

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.PLATFORM_ADMIN]: [
    Permission.PLATFORM_MANAGE,
    Permission.TENANT_SETTINGS_VIEW,
  ],
  [UserRole.TENANT_OWNER]: [
    Permission.TENANT_MANAGE, Permission.TENANT_SETTINGS_VIEW,
    Permission.USER_MANAGE,
    Permission.ASSISTANT_READ, Permission.ASSISTANT_MANAGE,
    Permission.KB_READ, Permission.KB_WRITE, Permission.KB_GRANT,
    Permission.CHAT_USE, Permission.CONVERSATION_MANAGE,
    Permission.API_KEY_MANAGE, Permission.INTEGRATION_MANAGE,
    Permission.BILLING_VIEW, Permission.ANALYTICS_VIEW,
    Permission.PLAYGROUND_USE, Permission.DASHBOARD_VIEW,
  ],
  [UserRole.TENANT_ADMIN]: [
    Permission.TENANT_SETTINGS_VIEW,
    Permission.USER_MANAGE,
    Permission.ASSISTANT_READ, Permission.ASSISTANT_MANAGE,
    Permission.KB_READ, Permission.KB_WRITE, Permission.KB_GRANT,
    Permission.CHAT_USE, Permission.CONVERSATION_MANAGE,
    Permission.API_KEY_MANAGE, Permission.INTEGRATION_MANAGE,
    Permission.BILLING_VIEW, Permission.ANALYTICS_VIEW,
    Permission.PLAYGROUND_USE, Permission.DASHBOARD_VIEW,
  ],
  [UserRole.EDITOR]: [
    Permission.ASSISTANT_READ,
    Permission.KB_READ, Permission.KB_WRITE, Permission.KB_GRANT,
    Permission.CHAT_USE,
    Permission.PLAYGROUND_USE,
  ],
  [UserRole.USER]: [
    Permission.ASSISTANT_READ,
    Permission.CHAT_USE,
  ],
};

export const roleAtLeast = (have: UserRole | undefined, min: UserRole): boolean =>
  !!have && ROLE_RANK[have] >= ROLE_RANK[min];

export const can = (user: User | null | undefined, perm: Permission): boolean =>
  !!user && (ROLE_PERMISSIONS[user.role]?.includes(perm) ?? false);

export const isHighPriorityUser = (user: User | null | undefined): boolean =>
  user?.role === UserRole.USER && user.priority === UserPriority.HIGH;

/**
 * Route → predicate. First match wins.
 * Edit here to adjust which roles can see which pages.
 */
export const ROUTE_POLICY: Array<{ match: RegExp; allow: (u: User | null | undefined) => boolean }> = [
  { match: /^\/super-admin(\/|$)/, allow: (u) => u?.role === UserRole.PLATFORM_ADMIN },
  { match: /^\/admin\/api-keys(\/|$)/,    allow: () => false },
  { match: /^\/admin\/integrations(\/|$)/, allow: () => false },
  { match: /^\/admin\/playground/, allow: (u) => can(u, Permission.PLAYGROUND_USE) },
  { match: /^\/admin(\/|$)/,       allow: (u) => roleAtLeast(u?.role, UserRole.TENANT_ADMIN) },
  // The /assistants page is a management surface (create/edit/delete) — gate
  // on ASSISTANT_MANAGE, not ASSISTANT_READ. Read access is still granted to
  // USER/EDITOR by the backend so the chat assistant-picker works; they just
  // can't reach this management page.
  { match: /^\/assistants(\/|$)/,  allow: (u) => can(u, Permission.ASSISTANT_MANAGE) },
  // /knowledge is a management surface (upload, delete, create datasets,
  // grant access). Gate on KB_WRITE so only admins/owners/editors can reach
  // it. Regular users — including high-priority ones — interact with KBs
  // indirectly through the assistants they chat with.
  { match: /^\/knowledge(\/|$)/,   allow: (u) => can(u, Permission.KB_WRITE) },
  { match: /^\/chat(\/|$)/,        allow: (u) => !!u },
  { match: /^\/user-home(\/|$)/,   allow: (u) => !!u },
  { match: /^\/settings(\/|$)/,    allow: (u) => !!u },
];

export function isRouteAllowed(path: string, user: User | null | undefined): boolean {
  const rule = ROUTE_POLICY.find((r) => r.match.test(path));
  return rule ? rule.allow(user) : true;
}

/** Where to send a role when they land on / or hit a forbidden page. */
export function homePathFor(user: User | null | undefined): string {
  if (!user) return '/login';
  if (user.role === UserRole.PLATFORM_ADMIN) return '/super-admin';
  if (roleAtLeast(user.role, UserRole.TENANT_ADMIN)) return '/admin/dashboard';
  if (user.role === UserRole.EDITOR) return '/knowledge';
  return '/chat';
}
