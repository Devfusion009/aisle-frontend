'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/use-auth-store';
import { homePathFor } from '@/lib/rbac';
import { ShieldAlert } from 'lucide-react';

export default function ForbiddenPage() {
  const user = useAuthStore((s) => s.user);
  const home = homePathFor(user);

  return (
    <div className="flex h-screen items-center justify-center bg-[#0d0f12]">
      <div className="max-w-md w-full mx-4 rounded-2xl border border-slate-800 bg-[#1a1d21] p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <ShieldAlert className="h-7 w-7 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">403 — Forbidden</h1>
            <p className="mt-2 text-[13px] text-slate-400">
              You don&apos;t have permission to view this page. If you believe this is a mistake,
              contact an administrator.
            </p>
          </div>
          <Link
            href={home}
            className="w-full rounded-xl bg-gradient-to-r from-[#06d4ef] to-[#06b4ef] py-2.5 text-center text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
