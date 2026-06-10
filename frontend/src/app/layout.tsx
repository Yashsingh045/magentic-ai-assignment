import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Customer Support",
  description: "Admin portal for the multi-tenant AI Customer Support SaaS",
};

/**
 * Root layout — a Server Component. It renders the static HTML shell, then
 * mounts the client-only <AuthProvider> as a boundary so any descendant can
 * call useAuth(). Server Components above this line never touch auth state.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
