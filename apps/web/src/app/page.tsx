"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  Mail,
  Menu,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Send,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

interface BrandsResponse {
  message: string;
  count: number;
  brands: Brand[];
}

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Brands", icon: Building2 },
  { label: "Contacts", icon: Users },
  { label: "Groups", icon: Users },
  { label: "Lifecycle", icon: Activity },
  { label: "Campaigns", icon: Send },
  { label: "Schedules", icon: CalendarDays },
];

const channels = [
  {
    name: "WhatsApp",
    messages: "5,240",
    percentage: 62,
    cost: "₹2,620",
    icon: MessageCircle,
    color: "bg-green-500",
    light: "bg-green-50 text-green-700",
  },
  {
    name: "SMS",
    messages: "2,180",
    percentage: 26,
    cost: "₹654",
    icon: MessageSquare,
    color: "bg-blue-500",
    light: "bg-blue-50 text-blue-700",
  },
  {
    name: "Email",
    messages: "1,020",
    percentage: 12,
    cost: "₹102",
    icon: Mail,
    color: "bg-orange-500",
    light: "bg-orange-50 text-orange-700",
  },
];

const campaigns = [
  {
    name: "Diwali Solar Offer",
    brand: "GENEXT Energy",
    channel: "WhatsApp",
    status: "Completed",
    recipients: "1,250",
    date: "Today, 10:30 AM",
    color: "bg-green-100 text-green-700",
  },
  {
    name: "Customer Follow-up",
    brand: "GENEXT Energy",
    channel: "SMS",
    status: "Running",
    recipients: "450",
    date: "Today, 11:45 AM",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "Monthly Newsletter",
    brand: "Brand 2",
    channel: "Email",
    status: "Scheduled",
    recipients: "800",
    date: "Tomorrow, 9:00 AM",
    color: "bg-orange-100 text-orange-700",
  },
];

interface CurrentUser {
  userId: string;
  name: string;
  email: string;
  platformRole: "ADMIN" | "USER";
  mustChangePassword: boolean;
}

interface ProfileResponse {
  message: string;
  user: CurrentUser;
}

export default function Dashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsError, setBrandsError] = useState("");
  const [isCreateBrandOpen, setIsCreateBrandOpen] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      window.location.href = "/login";
    }
  };

  const [brandForm, setBrandForm] = useState({
    name: "",
    description: "",
    logoUrl: "",
    ownerName: "",
    ownerEmail: "",
    temporaryPassword: "",
  });

  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [createBrandError, setCreateBrandError] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load profile");
        }

        const data: ProfileResponse = await response.json();
        setCurrentUser(data.user);
      } catch (error) {
        console.error("Profile loading failed:", error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setBrandsLoading(true);
        setBrandsError("");

        const response = await fetch("/api/brands", {
          cache: "no-store",
        });

        const data: BrandsResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch brands");
        }

        setBrands(data.brands ?? []);
      } catch (error) {
        setBrandsError(
          error instanceof Error ? error.message : "Unable to load brands",
        );
      } finally {
        setBrandsLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const handleCreateBrand = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateBrandError("");

    if (brandForm.temporaryPassword.length < 12) {
      setCreateBrandError(
        "Temporary password must contain at least 12 characters.",
      );
      return;
    }

    try {
      setIsCreatingBrand(true);

      const response = await fetch("/api/brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: brandForm.name.trim(),
          description: brandForm.description.trim() || undefined,
          logoUrl: brandForm.logoUrl.trim() || undefined,
          ownerName: brandForm.ownerName.trim(),
          ownerEmail: brandForm.ownerEmail.trim(),
          temporaryPassword: brandForm.temporaryPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Failed to create brand",
        );
      }

      const brandsResponse = await fetch("/api/brands", {
        cache: "no-store",
      });

      const brandsData: BrandsResponse = await brandsResponse.json();

      if (!brandsResponse.ok) {
        throw new Error(
          "Brand created, but refreshing the brand list failed.",
        );
      }

      setBrands(brandsData.brands ?? []);

      setBrandForm({
        name: "",
        description: "",
        logoUrl: "",
        ownerName: "",
        ownerEmail: "",
        temporaryPassword: "",
      });

      setIsCreateBrandOpen(false);
    } catch (error) {
      setCreateBrandError(
        error instanceof Error ? error.message : "Unable to create brand.",
      );
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleNavigation = (label: string) => {
    setActivePage(label);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-800">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
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

          <div className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Building2 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">My Account</p>
              <p className="text-xs text-slate-400">3 brands</p>
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
                onClick={() => handleNavigation(item.label)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                <Icon size={19} />
                {item.label}
                {item.label === "Campaigns" && (
                  <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                    4
                  </span>
                )}
              </button>
            );
          })}

          <div className="my-5 border-t border-slate-100" />

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Account
          </p>

          {[
            { label: "Usage & Billing", icon: Wallet },
            { label: "Subscription", icon: CreditCard },
            { label: "Settings", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.label)}
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
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-50 p-3 text-left hover:bg-slate-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                {profileLoading
                  ? "..."
                  : currentUser?.name
                    ?.split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "U"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {profileLoading ? "Loading..." : currentUser?.name || "User"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {currentUser?.email || ""}
                </p>
              </div>

              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform ${isProfileMenuOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-2 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                <p className="text-sm font-semibold text-slate-900">
                  {currentUser?.name || "User"}
                </p>
                <p className="mt-1 break-all text-xs text-slate-500">
                  {currentUser?.email || ""}
                </p>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-500">
                    {currentUser?.platformRole === "ADMIN"
                      ? "Platform Admin"
                      : "Brand Owner"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="mt-3 flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? "Signing out..." : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:pl-64">
        {/* Top header */}
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
                Manage your customer communications
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
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <div className="hidden h-8 border-l border-slate-200 sm:block" />
            <button className="hidden items-center gap-2 text-sm font-medium text-slate-600 sm:flex">
              Help <CircleHelp size={17} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8">
          {/* Welcome section */}
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-slate-500">Saturday, October 31, 2026</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Welcome back!
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Here&apos;s what&apos;s happening with your campaigns.
              </p>
            </div>

            <button className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              <Plus size={18} />
              Create campaign
            </button>
          </section>

          {/* Summary cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Total brands",
                value: brandsLoading ? "..." : String(brands.length),
                change: brandsError ? "Unable to load brands" : "Manage your brands",
                icon: Building2,
                iconBg: "bg-indigo-50 text-indigo-600",
              },
              {
                title: "Total contacts",
                value: "8,420",
                change: "+12.5% this month",
                icon: Users,
                iconBg: "bg-blue-50 text-blue-600",
              },
              {
                title: "Messages sent",
                value: "8,440",
                change: "+8.2% this month",
                icon: Send,
                iconBg: "bg-green-50 text-green-600",
              },
              {
                title: "Wallet balance",
                value: "₹8,500",
                change: "Available balance",
                icon: Wallet,
                iconBg: "bg-orange-50 text-orange-600",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      {card.title}
                    </p>
                    <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
                    {card.value}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">{card.change}</p>
                </div>
              );
            })}
          </section>

          {/* Usage and channel breakdown */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Channel-wise usage
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Message consumption across all brands
                  </p>
                </div>
                <button className="flex items-center gap-1 text-sm font-medium text-indigo-600">
                  This month <ChevronDown size={16} />
                </button>
              </div>

              <div className="mt-6 space-y-6">
                {channels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <div key={channel.name}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-xl p-2.5 ${channel.light}`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {channel.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {channel.messages} messages
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {channel.cost}
                          </p>
                          <p className="text-xs text-slate-400">
                            {channel.percentage}% of usage
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${channel.color}`}
                          style={{ width: `${channel.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Wallet card */}
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
                <p className="mt-7 text-sm text-indigo-100">
                  Available balance
                </p>
                <h3 className="mt-1 text-3xl font-bold">₹8,500.00</h3>
                <p className="mt-2 text-xs text-indigo-100">
                  ₹500 reserved for scheduled campaigns
                </p>
              </div>
              <div className="mt-8">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50">
                  <Plus size={17} />
                  Add money
                </button>
                <p className="mt-3 text-center text-xs text-indigo-100">
                  View wallet transactions
                </p>
              </div>
            </div>
          </section>

          {/* Brands */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Your brands</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Manage campaigns and usage for each brand
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCreateBrandOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  <Plus size={16} />
                  Create Brand
                </button>

                <button className="flex items-center gap-1 text-sm font-semibold text-indigo-600">
                  View all <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              {brandsLoading ? (
                <p className="col-span-full py-6 text-center text-sm text-slate-400">
                  Loading brands...
                </p>
              ) : brandsError ? (
                <p className="col-span-full py-6 text-center text-sm text-red-500">
                  {brandsError}
                </p>
              ) : brands.length === 0 ? (
                <p className="col-span-full py-6 text-center text-sm text-slate-400">
                  No brands created yet.
                </p>
              ) : (
                brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                        {brand.name.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {brand.name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {brand.description || "No description available"}
                        </p>
                      </div>

                      <ChevronRight
                        size={17}
                        className="shrink-0 text-slate-400"
                      />
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${brand.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                          }`}
                      >
                        {brand.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Recent campaigns */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <h3 className="font-bold text-slate-900">Recent campaigns</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Latest campaign activity across your brands
                </p>
              </div>
              <button className="text-sm font-semibold text-indigo-600">
                View all campaigns
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Campaign</th>
                    <th className="px-5 py-3 font-semibold">Channel</th>
                    <th className="px-5 py-3 font-semibold">Recipients</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.name} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {campaign.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {campaign.brand}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {campaign.channel}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {campaign.recipients}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${campaign.color}`}
                        >
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {campaign.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="pb-3 text-center text-xs text-slate-400">
            NotifyFlow © 2026 · All rights reserved
          </footer>
        </main>
      </div>

      {/* Create Brand Modal */}
      {isCreateBrandOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Create new brand
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a brand and assign its owner.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateBrandOpen(false)}
                disabled={isCreatingBrand}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBrand}>
              <div className="grid max-h-[70vh] grid-cols-1 gap-5 overflow-y-auto p-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Brand name *
                  </label>
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={brandForm.name}
                    onChange={(e) =>
                      setBrandForm({ ...brandForm, name: e.target.value })
                    }
                    placeholder="e.g. GENEXT Energy"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Description
                  </label>
                  <textarea
                    maxLength={500}
                    rows={3}
                    value={brandForm.description}
                    onChange={(e) =>
                      setBrandForm({
                        ...brandForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the brand..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={brandForm.logoUrl}
                    onChange={(e) =>
                      setBrandForm({ ...brandForm, logoUrl: e.target.value })
                    }
                    placeholder="https://example.com/logo.png"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Owner name *
                  </label>
                  <input
                    required
                    maxLength={100}
                    value={brandForm.ownerName}
                    onChange={(e) =>
                      setBrandForm({
                        ...brandForm,
                        ownerName: e.target.value,
                      })
                    }
                    placeholder="Owner's full name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Owner email *
                  </label>
                  <input
                    required
                    type="email"
                    maxLength={255}
                    value={brandForm.ownerEmail}
                    onChange={(e) =>
                      setBrandForm({
                        ...brandForm,
                        ownerEmail: e.target.value,
                      })
                    }
                    placeholder="owner@example.com"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Temporary password *
                  </label>
                  <input
                    required
                    type="password"
                    minLength={12}
                    maxLength={128}
                    value={brandForm.temporaryPassword}
                    onChange={(e) =>
                      setBrandForm({
                        ...brandForm,
                        temporaryPassword: e.target.value,
                      })
                    }
                    placeholder="Minimum 12 characters"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    The owner must change this password on first login.
                  </p>
                </div>

                {createBrandError && (
                  <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {createBrandError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  disabled={isCreatingBrand}
                  onClick={() => setIsCreateBrandOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreatingBrand}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingBrand ? "Creating..." : "Create Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}