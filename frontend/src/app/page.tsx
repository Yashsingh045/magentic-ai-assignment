import Link from "next/link";

/**
 * Landing page (Server Component). Static marketing/redirect shell. The auth
 * pages (/login, /register) and the protected dashboard land in later steps.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">AI Customer Support</h1>
        <p className="mt-2 text-gray-600">
          Multi-tenant support automation — admin portal.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
        >
          Register
        </Link>
      </div>
    </main>
  );
}
