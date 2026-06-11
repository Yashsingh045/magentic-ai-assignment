import { ReactNode } from "react";
import { IconSparkles } from "@/components/icons";

/**
 * Visual shell for the public auth pages (Server Component). Per-page redirect
 * logic (e.g. bounce already-authenticated users) lives in the pages, which are
 * client components with access to useAuth().
 */
export default function AuthGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-indigo-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <IconSparkles className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold text-gray-900">AI Support</span>
        </div>
        {children}
      </div>
    </div>
  );
}
