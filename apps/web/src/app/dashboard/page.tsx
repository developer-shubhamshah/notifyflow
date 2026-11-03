
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send, LayoutDashboard, Users, Contact, Megaphone, CalendarDays,
  Wallet, Settings, Menu, X, ChevronDown, ChevronRight, Bell,
  Search, CircleHelp, Building2, MessageCircle, Smartphone, Mail,
  LogOut, UserCircle, CreditCard,
} from "lucide-react";

interface CurrentUser {
  userId: string;
  name: string;
  email: string;
  platformRole: "ADMIN" | "USER";
}

interface Brand {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export default function BrandDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
    async function loadWorkspace() {
      try {
        const [profileResponse, brandsResponse] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/brands", { cache: "no-store" }),
        ]);

        if (!profileResponse.ok || !brandsResponse.ok) {
          throw new Error("Unable to load workspace.");
        }

        const profileData = await profileResponse.json();
        const brandsData = await brandsResponse.json();

        setUser(profileData.user);
        setBrand(brandsData.brands?.[0] ?? null);
      } catch (error) {
        console.error("Workspace loading failed:", error);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      window.location.href = "/login";
    }
  }

  const navigation = [
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Contacts", icon: Users },
    { label: "Contact Groups", icon: Contact },
    { label: "Campaigns", icon: Megaphone },
    { label: "Schedules", icon: CalendarDays },
  ];

  const accountNavigation = [
    { label: "Usage & Billing", icon: Wallet },
    { label: "Subscription", icon: CreditCard },
    { label: "Settings", icon: Settings },
  ];

  const initials = (user?.name || "Owner")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-800">
      {mobileMenuOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Send size={21} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Notify<span className="text-indigo-600">Flow</span>
              </h1>
              <p className="text-xs text-slate-400">Campaign management</p>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-5">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Building2 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {loading ? "Loading brand..." : brand?.name || "My Brand"}
              </p>
              <p className="text-xs text-slate-400">Brand workspace</p>
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Main menu
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.label;

            return (
              <button
                key={item.label}
                onClick={() => {
                  setActivePage(item.label);
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}

          <div className="my-5 border-t border-slate-100" />

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Account
          </p>

          {accountNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => setActivePage(item.label)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${activePage === item.label
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-50 p-3 text-left hover:bg-slate-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {user?.name || "Account Owner"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {user?.email || ""}
                </p>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </button>

            {profileMenuOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-2 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                <p className="text-sm font-semibold text-slate-900">
                  {user?.name || "Account Owner"}
                </p>
                <p className="mt-1 break-all text-xs text-slate-500">
                  {user?.email}
                </p>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-500">
                    Brand Owner
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <LogOut size={16} />
                  {loggingOut ? "Signing out..." : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {activePage}
              </h2>
              <p className="hidden text-xs text-slate-400 sm:block">
                Manage your brand communications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              aria-label="Search"
              className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:block"
            >
              <Search size={19} />
            </button>
            <button
              aria-label="Notifications"
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <Bell size={20} />
            </button>
            <div className="hidden h-8 border-l border-slate-200 sm:block" />
            <button className="hidden items-center gap-2 text-sm font-medium text-slate-600 sm:flex">
              Help <CircleHelp size={17} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-slate-500">
                {currentDate}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Welcome back, {user?.name?.split(" ")[0] || "Owner"}!
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Here&apos;s your brand overview.
              </p>
            </div>

            <button
              onClick={() => setActivePage("Campaigns")}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Megaphone size={18} />
              Create campaign
            </button>
          </section>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Loading your brand workspace...
            </div>
          ) : !brand ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
              No brand is currently assigned to this account. Please contact your platform administrator.
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Building2 size={23} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{brand.name}</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {brand.description || "Your brand workspace"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    {brand.isActive === false ? "Inactive" : "Active"}
                  </span>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { title: "Total contacts", value: "0", detail: "Your audience", icon: Users, style: "bg-blue-50 text-blue-600" },
                  { title: "Contact groups", value: "0", detail: "Organize your contacts", icon: Contact, style: "bg-indigo-50 text-indigo-600" },
                  { title: "Campaigns", value: "0", detail: "Campaign activity", icon: Megaphone, style: "bg-green-50 text-green-600" },
                  { title: "Wallet balance", value: "₹0.00", detail: "Available balance", icon: Wallet, style: "bg-orange-50 text-orange-600" },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500">{card.title}</p>
                        <div className={`rounded-xl p-2.5 ${card.style}`}>
                          <Icon size={20} />
                        </div>
                      </div>
                      <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{card.value}</h3>
                      <p className="mt-1 text-xs text-slate-400">{card.detail}</p>
                    </div>
                  );
                })}
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                  <h3 className="font-bold text-slate-900">Messaging channels</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Connect your brand messaging providers
                  </p>
                  <div className="mt-5 space-y-4">
                    {[
                      { name: "WhatsApp", icon: MessageCircle, color: "bg-green-50 text-green-600" },
                      { name: "SMS", icon: Smartphone, color: "bg-blue-50 text-blue-600" },
                      { name: "Email", icon: Mail, color: "bg-orange-50 text-orange-600" },
                    ].map((channel) => {
                      const Icon = channel.icon;
                      return (
                        <div key={channel.name} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-xl p-2.5 ${channel.color}`}>
                              <Icon size={20} />
                            </div>
                            <p className="text-sm font-semibold text-slate-800">{channel.name}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                            Not configured
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="rounded-xl bg-white/15 p-3">
                        <Wallet size={22} />
                      </div>
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                        Prepaid wallet
                      </span>
                    </div>
                    <p className="mt-7 text-sm text-indigo-100">Available balance</p>
                    <h3 className="mt-1 text-3xl font-bold">₹0.00</h3>
                    <p className="mt-2 text-xs text-indigo-100">Wallet summary preview</p>
                  </div>
                  <button
                    onClick={() => setActivePage("Usage & Billing")}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                  >
                    <Wallet size={17} />
                    View usage & billing
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-900">Quick actions</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Manage your brand workspace
                </p>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Manage contacts", icon: Users },
                    { label: "Contact groups", icon: Contact },
                    { label: "Create campaign", icon: Megaphone },
                    { label: "View schedules", icon: CalendarDays },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => setActivePage(action.label)}
                        className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
                      >
                        <span className="flex items-center gap-3">
                          <Icon size={19} className="text-indigo-600" />
                          {action.label}
                        </span>
                        <ChevronRight size={17} className="text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          <footer className="pb-3 text-center text-xs text-slate-400">
            NotifyFlow © 2026 · All rights reserved
          </footer>
        </main>
      </div>
    </div>
  );
}
