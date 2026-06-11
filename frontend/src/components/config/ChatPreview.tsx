"use client";

import { IconSparkles } from "@/components/icons";
import type { Personality } from "@/lib/types";

const TONE: Record<Personality, string> = {
  PROFESSIONAL: "Polished & concise",
  FRIENDLY: "Warm & conversational",
  TECHNICAL: "Detailed & precise",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AI";
  return parts
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface ChatPreviewProps {
  botName: string;
  welcomeMessage: string;
  personality: Personality;
}

/** Live mock of the embeddable chat widget header + welcome message. */
export function ChatPreview({
  botName,
  welcomeMessage,
  personality,
}: ChatPreviewProps) {
  const name = botName.trim() || "Support Assistant";
  const welcome =
    welcomeMessage.trim() || "Hi! How can I help you today?";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 bg-indigo-600 px-4 py-3 text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
          {botName.trim() ? initials(name) : <IconSparkles className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="flex items-center gap-1.5 text-xs text-indigo-100">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Online
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-[160px] space-y-3 bg-gray-50 p-4">
        <div className="flex items-end gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            {botName.trim() ? initials(name) : "AI"}
          </span>
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm">
            {welcome}
          </div>
        </div>
      </div>

      {/* Input (disabled mock) */}
      <div className="flex items-center gap-2 border-t border-gray-200 px-3 py-2">
        <div className="flex-1 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-400">
          Type a message…
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M3 11l18-8-8 18-2-7-8-3z" />
          </svg>
        </span>
      </div>

      <div className="border-t border-gray-100 bg-white px-4 py-2 text-center text-xs text-gray-400">
        Tone: {TONE[personality]}
      </div>
    </div>
  );
}
