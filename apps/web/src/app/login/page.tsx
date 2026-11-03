"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageSquare,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface LoginResponse {
  message: string;
  requiresPasswordChange: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    platformRole: "ADMIN" | "USER";
    mustChangePassword: boolean;
  };
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Unable to sign in. Please check your credentials.",
        );
        return;
      }

      const result = data as LoginResponse;

      if (
        result.requiresPasswordChange ||
        result.user.mustChangePassword
      ) {
        router.replace("/change-password");
        return;
      }

      if (result.user.platformRole === "ADMIN") {
        router.replace("/");
      } else {
        router.replace("/dashboard");
      }
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#10172a] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500">
            <MessageSquare size={23} />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            NotifyFlow
          </span>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-blue-200">
            <Zap size={15} />
            One platform. Every conversation.
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight xl:text-6xl">
            Messaging that moves your business forward.
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Manage brands, contacts, campaigns and customer communication
            across WhatsApp, SMS and Email from one place.
          </p>

          <div className="mt-12 space-y-5">
            {[
              "Manage multiple brands from one platform",
              "Create and schedule campaigns",
              "Track messaging usage and performance",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                  <ShieldCheck size={16} />
                </div>
                <span className="text-sm text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-slate-400">
          Secure communication management for growing businesses.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <MessageSquare size={21} />
            </div>
            <span className="text-xl font-bold text-slate-900">
              NotifyFlow
            </span>
          </div>

          <div className="mb-9">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <LockKeyhole size={23} />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to access your NotifyFlow workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            Access is provided by your platform administrator.
            <br />
            Public registration is not available.
          </p>

          <p className="mt-10 text-center text-xs text-slate-400">
            Copyright 2026 NotifyFlow. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}