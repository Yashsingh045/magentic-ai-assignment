import Link from "next/link";

/**
 * Marketing landing page (Server Component). Public — links to /login and
 * /register. Auth pages and the protected app live elsewhere.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-white">
      {/* Nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <BoltIcon />
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Support Clarity
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:py-20">
        {/* Left — copy */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
            V2.0 IS NOW LIVE
          </span>

          <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
            Scale your support <span className="text-blue-600">with AI.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-500">
            The ultimate multi-tenant automation platform for enterprise support
            teams. Resolve 80% of tickets instantly while your team focuses on
            what matters.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Register
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Log in
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[
                { i: "JD", c: "bg-slate-200 text-slate-600" },
                { i: "AS", c: "bg-slate-300 text-slate-700" },
                { i: "MK", c: "bg-slate-500 text-white" },
              ].map((a) => (
                <span
                  key={a.i}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold ${a.c}`}
                >
                  {a.i}
                </span>
              ))}
            </div>
            <span className="text-sm text-slate-500">
              Trusted by 500+ enterprises
            </span>
          </div>
        </div>

        {/* Right — product mockup */}
        <div className="relative">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              </div>
              <div className="h-2 w-28 rounded-full bg-slate-100" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-lg bg-slate-50 p-3">
                  <div className="h-2 w-10 rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-16 rounded bg-slate-300" />
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="h-3 w-full rounded-full bg-slate-100" />
              <div className="h-3 w-5/6 rounded-full bg-slate-100" />
              <div className="h-3 w-2/3 rounded-full bg-slate-100" />
            </div>

            <div className="mt-6 flex justify-end">
              <div className="h-9 w-28 rounded-lg bg-slate-200" />
            </div>
          </div>
        </div>
      </main>

      {/* Compliance strip */}
      <footer className="mx-auto max-w-7xl px-6 pb-10">
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs font-semibold tracking-wider text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>SECURE ENTERPRISE INFRASTRUCTURE</span>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <span>GDPR COMPLIANT</span>
            <span>SOC2 TYPE II</span>
            <span>ISO 27001</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
