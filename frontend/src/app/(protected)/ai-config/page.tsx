"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { ChatPreview } from "@/components/config/ChatPreview";
import { IconClose } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type { BotConfig, EscalationRules, Personality } from "@/lib/types";

const PERSONALITIES: {
  value: Personality;
  label: string;
  description: string;
}[] = [
  { value: "PROFESSIONAL", label: "Professional", description: "Polished & concise" },
  { value: "FRIENDLY", label: "Friendly", description: "Warm & conversational" },
  { value: "TECHNICAL", label: "Technical", description: "Detailed & precise" },
];

const RULE_FIELDS: {
  key: keyof Omit<EscalationRules, "customKeywords">;
  label: string;
  description: string;
}[] = [
  { key: "refundRequested", label: "Refund requested", description: "Escalate when a customer asks for a refund." },
  { key: "legalComplaint", label: "Legal complaint", description: "Escalate on legal threats or complaints." },
  { key: "customerAngry", label: "Customer angry", description: "Escalate when sentiment turns hostile." },
  { key: "humanRequested", label: "Human requested", description: "Escalate when a human agent is asked for." },
];

export default function AiConfigPage() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [botName, setBotName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [personality, setPersonality] = useState<Personality>("PROFESSIONAL");
  const [rules, setRules] = useState<EscalationRules>({
    refundRequested: true,
    legalComplaint: true,
    customerAngry: true,
    humanRequested: true,
    customKeywords: [],
  });
  const [keywordDraft, setKeywordDraft] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get<BotConfig>("/config")
      .then(({ data }) => {
        if (!active) return;
        setConfig(data);
        setBotName(data.botName);
        setWelcomeMessage(data.welcomeMessage);
        setPersonality(data.personality);
        setRules(data.escalationRules);
      })
      .catch((err) => active && setError(getApiErrorMessage(err)));
    return () => {
      active = false;
    };
  }, []);

  // Dirty tracking so Save only enables on changes.
  const dirty = useMemo(() => {
    if (!config) return false;
    return (
      botName !== config.botName ||
      welcomeMessage !== config.welcomeMessage ||
      personality !== config.personality ||
      JSON.stringify(rules) !== JSON.stringify(config.escalationRules)
    );
  }, [config, botName, welcomeMessage, personality, rules]);

  function addKeyword() {
    const k = keywordDraft.trim().toLowerCase();
    if (!k) return;
    if (!rules.customKeywords.includes(k)) {
      setRules((r) => ({ ...r, customKeywords: [...r.customKeywords, k] }));
    }
    setKeywordDraft("");
  }

  function onKeywordKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword();
    }
  }

  function removeKeyword(k: string) {
    setRules((r) => ({
      ...r,
      customKeywords: r.customKeywords.filter((x) => x !== k),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { data } = await api.put<BotConfig>("/config", {
        botName: botName.trim(),
        welcomeMessage: welcomeMessage.trim(),
        personality,
        escalationRules: rules,
      });
      setConfig(data);
      setRules(data.escalationRules);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <div>
        <PageHeader
          title="AI Configuration"
          description="Tune your assistant's name, personality, and escalation rules."
        />
        {error ? (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-72 w-full" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI Configuration"
        description="Tune your assistant's name, personality, and escalation rules."
        action={
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm font-medium text-green-600">Saved</span>
            )}
            <Button onClick={handleSave} loading={saving} disabled={!dirty}>
              Save changes
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Identity */}
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Identity</h3>
            <Input
              id="botName"
              label="Bot name"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              maxLength={60}
              placeholder="Support Assistant"
            />
            <Textarea
              id="welcomeMessage"
              label="Welcome message"
              rows={3}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              maxLength={500}
              placeholder="Hi! How can I help you today?"
            />
          </section>

          {/* Personality */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Personality</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPersonality(p.value)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition",
                    personality === p.value
                      ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                >
                  <p className="text-sm font-medium text-gray-900">{p.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{p.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Escalation rules */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Escalation rules
              </h3>
              <p className="text-xs text-gray-500">
                When any enabled trigger is detected, the AI escalates to a human.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {RULE_FIELDS.map((f) => (
                <Toggle
                  key={f.key}
                  label={f.label}
                  description={f.description}
                  checked={rules[f.key]}
                  onChange={(v) => setRules((r) => ({ ...r, [f.key]: v }))}
                />
              ))}
            </div>

            {/* Custom keywords */}
            <div className="space-y-2 pt-2">
              <label
                htmlFor="keyword"
                className="block text-sm font-medium text-gray-700"
              >
                Custom keywords
              </label>
              <div className="flex gap-2">
                <Input
                  id="keyword"
                  value={keywordDraft}
                  onChange={(e) => setKeywordDraft(e.target.value)}
                  onKeyDown={onKeywordKeyDown}
                  placeholder="e.g. chargeback, lawsuit"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addKeyword}
                  disabled={!keywordDraft.trim()}
                >
                  Add
                </Button>
              </div>
              {rules.customKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {rules.customKeywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                    >
                      {k}
                      <button
                        type="button"
                        onClick={() => removeKeyword(k)}
                        className="text-gray-400 hover:text-gray-700"
                        aria-label={`Remove ${k}`}
                      >
                        <IconClose className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Live preview
            </h3>
            <ChatPreview
              botName={botName}
              welcomeMessage={welcomeMessage}
              personality={personality}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
