"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatWidget } from "@/components/widget/ChatWidget";

/** Reads the publicApiKey from the query and mounts the widget (client-only). */
function WidgetMount() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";
  const apiBase = params.get("api") ?? undefined;

  if (!key) {
    return (
      <p className="mt-6 text-center text-sm text-amber-600">
        Missing widget key — open this page with{" "}
        <code className="rounded bg-amber-50 px-1">?key=YOUR_PUBLIC_API_KEY</code>
        .
      </p>
    );
  }
  return <ChatWidget apiKey={key} apiBase={apiBase} />;
}

export default function WidgetPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-8">
      <div className="mx-auto max-w-2xl text-center text-gray-500">
        <h1 className="text-lg font-semibold text-gray-900">
          Chat widget preview
        </h1>
        <p className="mt-1 text-sm">
          This is how your assistant appears to customers. Click the bubble in
          the bottom-right corner to start chatting.
        </p>
      </div>
      <Suspense fallback={null}>
        <WidgetMount />
      </Suspense>
    </main>
  );
}
