"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useAuthStore } from "@/store/use-auth-store";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Use a stable default key for SSR. Once mounted on client,
  // we dynamically assign a unique storage key per user ID or role
  // so that theme selections do not leak globally across different accounts.
  const themeKey = user?.id ? `theme-${user.id}` : "theme";

  if (!mounted) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
  }

  return (
    <NextThemesProvider 
      key={themeKey}
      {...props} 
      storageKey={themeKey}
    >
      {children}
    </NextThemesProvider>
  );
}
