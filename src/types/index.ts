export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin',
  TENANT_OWNER = 'tenant_owner',
  TENANT_ADMIN = 'tenant_admin',
  EDITOR = 'editor',
  USER = 'user',
}

export enum UserPriority {
  HIGH = 'high',
  LOW = 'low',
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

// Removed TenantPlan enum - plan is now a string code from DB

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  logoUrl: string | null;
  createdAt: string;
}

export interface PlanLimits {
  maxUsers: number;
  maxAssistants: number;
  maxStorageBytes: number;
  monthlyTokenLimit: number;
  maxDatasets: number;
}

export interface PlanUsage {
  currentUsers: number;
  currentAssistants: number;
  currentStorageBytes: number;
  monthlyTokensUsed: number;
  currentDatasets: number;
}

export interface PlanComparisonEntry {
  plan: string;
  // Pricing + display metadata is owned by /super-admin/plans and may be
  // absent on legacy installs that haven't run the AddPlanPricingFields
  // migration yet — fields are optional so the page degrades cleanly.
  displayName?: string;
  price?: number;
  currency?: string;
  billingPeriod?: string;
  maxUsers: number;
  maxAssistants: number;
  maxStorageDisplay: string;
  maxStorageBytes: number;
  monthlyTokensDisplay: string;
  monthlyTokenLimit: number;
  maxDatasets: number;
}

export interface BillingInfo {
  plan: string;
  limits: PlanLimits;
  usage: PlanUsage;
  planComparison: PlanComparisonEntry[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  priority?: UserPriority;
  emailVerified?: boolean;
  tenantId: string;
  tenant?: Tenant;
  profilePhotoUrl?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AccessRequestFormData {
  name: string;
  email: string;
  message?: string;
  tenantSlug?: string;
  newTenantName: string;
}

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  message: string | null;
  tenantId: string | null;
  tenantName: string | null;
  newTenantName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}
