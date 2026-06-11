"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ChatWidget } from "@/components/widget/ChatWidget";

function WidgetMount() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";
  const apiBase = params.get("api") ?? undefined;
  const embed = params.get("embed") === "1";

  // In embed mode (inside the widget.js iframe), make the document transparent
  // so only the bubble/window show over the host page.
  useEffect(() => {
    if (!embed) return;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, [embed]);

  if (!key) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-sm text-amber-600">
          Missing widget key — open with{" "}
          <code className="rounded bg-amber-50 px-1">?key=YOUR_PUBLIC_API_KEY</code>
          .
        </p>
      </main>
    );
  }

  // Embedded: render only the widget on a transparent page.
  if (embed) {
    return <ChatWidget apiKey={key} apiBase={apiBase} />;
  }

  // Standalone preview page.
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
      <ChatWidget apiKey={key} apiBase={apiBase} />
    </main>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={null}>
      <WidgetMount />
    </Suspense>
  );
}
