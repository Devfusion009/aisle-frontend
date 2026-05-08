import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "verse.ai — Multi-tenant RAG Platform",
  description: "Ask your company docs anything. A multi-tenant RAG platform with total data isolation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var authRaw = localStorage.getItem('auth-storage');
                if (authRaw) {
                  var auth = JSON.parse(authRaw);
                  if (auth.state && auth.state.user && auth.state.user.id) {
                    var userId = auth.state.user.id;
                    var userTheme = localStorage.getItem('theme-' + userId);
                    if (userTheme) {
                      localStorage.setItem('theme', userTheme);
                    }
                  }
                }
              } catch(e) {}
            `
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-purple-500/30 min-h-screen bg-background`}
        suppressHydrationWarning
      >
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
