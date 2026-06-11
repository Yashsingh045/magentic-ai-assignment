"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthCard
        title="Invalid reset link"
        subtitle="This link is missing its token or has expired."
        footer={
          <Link
            href="/forgot-password"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Request a new link
          </Link>
        }
      >
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Please request a fresh password reset link to continue.
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a strong password you don't use elsewhere."
      footer={
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Password updated. Redirecting you to sign in…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <Input
            id="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Input
            id="confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
          />
          <Button type="submit" fullWidth loading={submitting}>
            Update password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams must be inside a Suspense boundary for static rendering.
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10 text-gray-400">
          <Spinner className="h-6 w-6" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
