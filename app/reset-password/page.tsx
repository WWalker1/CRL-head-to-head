"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid password reset token
    const checkToken = async () => {
      const supabase = createClient();

      // Check for hash fragments in URL (Supabase adds these for password reset)
      // Only access window on client side
      const hashParams =
        typeof window !== "undefined" ? window.location.hash.substring(1) : "";
      const hasHashParams = hashParams.length > 0;

      // Get the current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If we have hash params, Supabase will process them and create a session
      // If we have a session, the token is valid
      if (session) {
        setIsValidToken(true);
      } else if (hasHashParams) {
        // Wait a moment for Supabase to process the hash and create a session
        setTimeout(async () => {
          const {
            data: { session: newSession },
          } = await supabase.auth.getSession();
          setIsValidToken(!!newSession);
          if (!newSession) {
            setError(
              "Invalid or expired reset link. Please request a new password reset.",
            );
          }
        }, 500);
      } else {
        setIsValidToken(false);
        setError(
          "Invalid or expired reset link. Please request a new password reset.",
        );
      }
    };

    checkToken();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-4 py-10">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 border border-stone-300">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-4 py-10">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 border border-stone-300">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              This password reset link is invalid or has expired.
            </p>
          </div>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="text-center text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-[#a73b13] hover:text-blue-500"
            >
              Request a new reset link
            </Link>
          </div>
          <div className="text-center text-sm">
            <Link
              href="/login"
              className="font-medium text-[#a73b13] hover:text-blue-500"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-4 py-10">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 border border-stone-300">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-stone-700"
              >
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="relative block w-full rounded-md border border-gray-300 bg-white min-h-12 px-3 py-2 text-base text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold text-stone-700"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="relative block w-full rounded-md border border-gray-300 bg-white min-h-12 px-3 py-2 text-base text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-[#c24719] min-h-12 px-3 py-2 text-sm font-semibold text-white hover:bg-[#a73b13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
            >
              {loading ? "Updating password..." : "Update password"}
            </button>
          </div>

          <div className="text-center text-sm">
            <Link
              href="/login"
              className="font-medium text-[#a73b13] hover:text-blue-500"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
