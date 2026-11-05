"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
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

const FEATURES = [
  "Manage multiple brands from one platform",
  "Create and schedule campaigns",
  "Track messaging usage and performance",
];

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

      const data = (await response.json()) as LoginResponse | { message?: string };

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

      router.replace(result.user.platformRole === "ADMIN" ? "/" : "/dashboard");
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#08051d] lg:grid lg:grid-cols-2">
      {/* Desktop brand panel */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_85%_10%,rgba(124,58,237,0.24),transparent_38%),radial-gradient(ellipse_at_0%_100%,rgba(249,115,22,0.17),transparent_35%),#08051d] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 2xl:px-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-36 -top-36 h-[28rem] w-[28rem] rounded-full bg-violet-600/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-36 h-[26rem] w-[26rem] rounded-full bg-orange-500/10 blur-3xl"
        />

        <div className="relative z-10">
          <Image
            src="/brand/logo.png"
            alt="Notify-flow.in"
            width={520}
            height={160}
            priority
            className="h-auto w-full max-w-[390px] object-contain mix-blend-screen"
          />
        </div>

        <div className="relative z-10 my-12 max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-100 shadow-[0_0_28px_rgba(124,58,237,0.08)]">
            <Zap size={16} className="text-orange-400" />
            Messages Build Businesses.
          </div>

          <h1 className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight xl:text-5xl 2xl:text-[3.5rem]">
            Messaging that moves your business forward.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 xl:text-lg">
            Manage brands, contacts, campaigns and customer communication
            across WhatsApp, SMS and Email from one place.
          </p>

          <div className="mt-10 space-y-5">
            {FEATURES.map((item) => (
              <div key={item} className="flex items-center gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/20 text-violet-200">
                  <ShieldCheck size={17} />
                </span>
                <span className="text-sm font-medium text-slate-200 xl:text-base">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm font-medium tracking-wide text-slate-400">
          Messages Build Businesses.
        </p>
      </section>

      {/* Mobile brand header */}
      <header className="relative overflow-hidden bg-[radial-gradient(ellipse_at_80%_0%,rgba(124,58,237,0.30),transparent_45%),linear-gradient(135deg,#08051d_0%,#160b35_60%,#241044_100%)] px-6 pb-16 pt-9 text-center lg:hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl"
        />
        <div className="relative z-10 flex flex-col items-center">
          <Image
            src="/brand/icon.png"
            alt="Notify-flow app icon"
            width={88}
            height={88}
            priority
            className="h-[76px] w-[76px] object-contain drop-shadow-[0_8px_24px_rgba(124,58,237,0.28)]"
          />
          <h1 className="mt-3 text-xl font-bold tracking-tight text-white">
            Notify-flow.in
          </h1>
          <p className="mt-1 text-sm text-violet-200">
            Messages Build Businesses.
          </p>
        </div>
      </header>

      {/* Login panel */}
      <section className="-mt-7 flex min-h-[calc(100vh-190px)] items-center justify-center rounded-t-[1.75rem] bg-white px-6 py-10 sm:px-10 lg:mt-0 lg:min-h-screen lg:rounded-none lg:px-12 lg:py-14 xl:px-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
              <LockKeyhole size={23} />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
              Sign in to access your Notify-flow workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={19}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="h-[54px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-[54px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
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
              className="group flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 via-violet-600 to-purple-500 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition duration-200 hover:-translate-y-0.5 hover:from-violet-600 hover:via-violet-500 hover:to-purple-400 hover:shadow-xl hover:shadow-violet-600/25 focus:outline-none focus:ring-4 focus:ring-violet-500/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && (
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-xs leading-6 text-slate-400 sm:text-sm">
            Access is provided by your platform administrator.
            <br />
            Public registration is not available.
          </p>

          <p className="mt-9 text-center text-xs text-slate-400">
            Copyright 2026 Notify-flow.in. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}