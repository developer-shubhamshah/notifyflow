
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Building2,
    Search,
    RefreshCw,
    Pencil,
    Power,
    X,
    Check,
    ShieldCheck,
    Users,
    AlertCircle,
    ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface BrandMember {
    userId: string;
    role: string;
    user?: {
        name?: string;
        email?: string;
    };
}

interface Brand {
    id: string;
    name: string;
    description?: string | null;
    isActive: boolean;
    account?: {
        id: string;
        name: string;
    };
    members?: BrandMember[];
    createdAt?: string;
}

interface CurrentUser {
    userId: string;
    name: string;
    email: string;
    platformRole: "ADMIN" | "USER";
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export default function BrandsPage() {
    const router = useRouter();

    const [brands, setBrands] = useState<Brand[]>([]);
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<StatusFilter>("ALL");
    const [saving, setSaving] = useState(false);
    const [editingBrand, setEditingBrand] =
        useState<Brand | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");

    const isPlatformAdmin = user?.platformRole === "ADMIN";

    // Navigate to the selected brand dashboard.
    const openBrandDashboard = (brand: Brand) => {
        localStorage.setItem("notifyflow_active_brand_id", brand.id);
        router.push("/dashboard");
    };

    // Load current user and brands.
    const loadBrands = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [profileResponse, brandsResponse] =
                await Promise.all([
                    fetch("/api/auth/me", { cache: "no-store" }),
                    fetch("/api/brands", { cache: "no-store" }),
                ]);

            if (
                profileResponse.status === 401 ||
                brandsResponse.status === 401
            ) {
                window.location.href = "/login";
                return;
            }

            if (!profileResponse.ok || !brandsResponse.ok) {
                throw new Error("Unable to load brands.");
            }

            const profileData = await profileResponse.json();
            const brandsData = await brandsResponse.json();

            setUser(profileData.user);
            setBrands(brandsData.brands ?? []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBrands();
    }, [loadBrands]);

    // Search and status filtering.
    const filteredBrands = useMemo(() => {
        return brands.filter((brand) => {
            const matchesSearch =
                brand.name
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                (brand.account?.name ?? "")
                    .toLowerCase()
                    .includes(search.toLowerCase());

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && brand.isActive) ||
                (statusFilter === "INACTIVE" && !brand.isActive);

            return matchesSearch && matchesStatus;
        });
    }, [brands, search, statusFilter]);

    const activeCount = brands.filter(
        (brand) => brand.isActive
    ).length;

    const inactiveCount = brands.length - activeCount;

    // Check brand management permissions.
    const canManageBrand = (brand: Brand) => {
        if (isPlatformAdmin) return true;

        return (
            brand.members?.some(
                (member) =>
                    member.userId === user?.userId &&
                    ["OWNER", "ADMIN"].includes(member.role)
            ) ?? false
        );
    };

    // Open edit modal.
    const openEdit = (brand: Brand) => {
        setEditingBrand(brand);
        setEditName(brand.name);
        setEditDescription(brand.description ?? "");
    };

    // Update brand.
    const saveBrand = async () => {
        if (!editingBrand || !editName.trim()) return;

        try {
            setSaving(true);

            const response = await fetch(
                `/api/brands/${encodeURIComponent(editingBrand.id)}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: editName.trim(),
                        description:
                            editDescription.trim() || null,
                    }),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to update brand."
                );
            }

            setEditingBrand(null);
            await loadBrands();
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Update failed."
            );
        } finally {
            setSaving(false);
        }
    };

    // Activate or deactivate brand.
    const toggleBrandStatus = async (brand: Brand) => {
        const action = brand.isActive
            ? "deactivate"
            : "activate";

        if (
            !window.confirm(
                `Are you sure you want to ${action} ${brand.name}?`
            )
        ) {
            return;
        }

        try {
            setSaving(true);

            const API_URL =
                process.env.NEXT_PUBLIC_API_URL ||
                "http://localhost:4000";

            if (!API_URL) {
                throw new Error(
                    "NEXT_PUBLIC_API_URL is not configured"
                );
            }

            const response = await fetch(
                `${API_URL}/brands/${encodeURIComponent(brand.id)}${
                    brand.isActive ? "" : "/activate"
                }`,
                {
                    method: brand.isActive ? "DELETE" : "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        `Unable to ${action} brand.`
                );
            }

            await loadBrands();
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Status update failed."
            );
        } finally {
            setSaving(false);
        }
    };

    // Keyboard support for clickable desktop rows.
    const handleBrandKeyDown = (
        event: React.KeyboardEvent<HTMLTableRowElement>,
        brand: Brand
    ) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openBrandDashboard(brand);
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f8fc] p-4 text-slate-800 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-7">

                {/* Page header */}
                <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <button
                            type="button"
                            onClick={() => router.push("/")}
                            className="mb-5 inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
                        >
                            <ArrowLeft size={17} />
                            Back to Dashboard
                        </button>

                        <p className="text-sm text-slate-500">
                            Workspace management
                        </p>

                        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                            Brands
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            {isPlatformAdmin
                                ? "Manage all brands across the NotifyFlow platform."
                                : "Manage brands associated with your account."}
                        </p>
                    </div>

                    <button
                        onClick={loadBrands}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={17}
                            className={
                                loading ? "animate-spin" : ""
                            }
                        />
                        Refresh
                    </button>
                </section>

                {/* Error message */}
                {error && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle size={19} />
                        {error}

                        <button
                            onClick={loadBrands}
                            className="ml-auto font-semibold underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Brand statistics */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                        {
                            label: "Total brands",
                            value: brands.length,
                            icon: Building2,
                            style: "bg-violet-50 text-violet-600",
                        },
                        {
                            label: "Active brands",
                            value: activeCount,
                            icon: Check,
                            style: "bg-green-50 text-green-600",
                        },
                        {
                            label: "Inactive brands",
                            value: inactiveCount,
                            icon: Power,
                            style: "bg-orange-50 text-orange-600",
                        },
                    ].map((item) => {
                        const Icon = item.icon;

                        return (
                            <div
                                key={item.label}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-500">
                                        {item.label}
                                    </p>

                                    <div
                                        className={`rounded-xl p-3 ${item.style}`}
                                    >
                                        <Icon size={20} />
                                    </div>
                                </div>

                                <p className="mt-4 text-3xl font-bold text-slate-900">
                                    {item.value}
                                </p>
                            </div>
                        );
                    })}
                </section>

                {/* All brands */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="font-bold text-slate-900">
                                All brands
                            </h2>

                            <p className="mt-1 text-xs text-slate-400">
                                {filteredBrands.length} brands found
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative">
                                <Search
                                    size={17}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(e.target.value)
                                    }
                                    placeholder="Search brands..."
                                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-violet-400 sm:w-64"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(
                                        e.target.value as StatusFilter
                                    )
                                }
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                            >
                                <option value="ALL">All statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-sm text-slate-500">
                            Loading brands...
                        </div>
                    ) : filteredBrands.length === 0 ? (
                        <div className="p-12 text-center">
                            <Building2
                                className="mx-auto text-slate-300"
                                size={38}
                            />

                            <p className="mt-3 font-semibold text-slate-700">
                                No brands found
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                                Try changing your search or status filter.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">
                                                Brand
                                            </th>
                                            <th className="px-6 py-4 font-semibold">
                                                Account
                                            </th>
                                            <th className="px-6 py-4 font-semibold">
                                                Members
                                            </th>
                                            <th className="px-6 py-4 font-semibold">
                                                Status
                                            </th>
                                            <th className="px-6 py-4 text-right font-semibold">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {filteredBrands.map((brand) => (
                                            <tr
                                                key={brand.id}
                                                onClick={() =>
                                                    openBrandDashboard(brand)
                                                }
                                                onKeyDown={(event) =>
                                                    handleBrandKeyDown(
                                                        event,
                                                        brand
                                                    )
                                                }
                                                tabIndex={0}
                                                aria-label={`Open ${brand.name} dashboard`}
                                                className="cursor-pointer transition hover:bg-violet-50/70 focus:bg-violet-50 focus:outline-none"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
                                                            <Building2 size={20} />
                                                        </div>

                                                        <div>
                                                            <p className="font-semibold text-slate-800">
                                                                {brand.name}
                                                            </p>

                                                            <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                                                                {brand.description ||
                                                                    "No description"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {brand.account?.name || "—"}
                                                </td>

                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    <span className="flex items-center gap-2">
                                                        <Users size={15} />
                                                        {brand.members?.length ?? 0}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                            brand.isActive
                                                                ? "bg-green-50 text-green-700"
                                                                : "bg-slate-100 text-slate-600"
                                                        }`}
                                                    >
                                                        {brand.isActive
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        {canManageBrand(brand) && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        openEdit(brand);
                                                                    }}
                                                                    title="Edit brand"
                                                                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                                                                >
                                                                    <Pencil size={16} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        toggleBrandStatus(brand);
                                                                    }}
                                                                    disabled={saving}
                                                                    title={
                                                                        brand.isActive
                                                                            ? "Deactivate"
                                                                            : "Activate"
                                                                    }
                                                                    className={`rounded-lg border p-2 ${
                                                                        brand.isActive
                                                                            ? "border-red-100 text-red-600 hover:bg-red-50"
                                                                            : "border-green-100 text-green-600 hover:bg-green-50"
                                                                    }`}
                                                                >
                                                                    <Power size={16} />
                                                                </button>
                                                            </>
                                                        )}

                                                        {!canManageBrand(brand) && (
                                                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                                                <ShieldCheck size={14} />
                                                                View only
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="divide-y divide-slate-100 md:hidden">
                                {filteredBrands.map((brand) => (
                                    <div
                                        key={brand.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Open ${brand.name} dashboard`}
                                        onClick={() =>
                                            openBrandDashboard(brand)
                                        }
                                        onKeyDown={(event) => {
                                            if (
                                                event.key === "Enter" ||
                                                event.key === " "
                                            ) {
                                                event.preventDefault();
                                                openBrandDashboard(brand);
                                            }
                                        }}
                                        className="cursor-pointer space-y-4 p-4 transition hover:bg-violet-50/70 focus:bg-violet-50 focus:outline-none"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                                                <Building2 size={21} />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-900">
                                                    {brand.name}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {brand.account?.name ||
                                                        "Account not available"}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {brand.description ||
                                                        "No description"}
                                                </p>
                                            </div>

                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    brand.isActive
                                                        ? "bg-green-50 text-green-700"
                                                        : "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {brand.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500">
                                                {brand.members?.length ?? 0} members
                                            </span>

                                            {canManageBrand(brand) && (
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            openEdit(brand);
                                                        }}
                                                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                                                    >
                                                        <Pencil size={14} />
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            toggleBrandStatus(brand);
                                                        }}
                                                        disabled={saving}
                                                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                                                    >
                                                        <Power size={14} />
                                                        {brand.isActive
                                                            ? "Deactivate"
                                                            : "Activate"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </section>

                {/* Edit brand modal */}
                {editingBrand && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        Edit brand
                                    </h2>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Update your brand information.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setEditingBrand(null)
                                    }
                                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                                    aria-label="Close"
                                >
                                    <X size={19} />
                                </button>
                            </div>

                            <div className="mt-6 space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Brand name
                                    </label>

                                    <input
                                        value={editName}
                                        onChange={(e) =>
                                            setEditName(e.target.value)
                                        }
                                        maxLength={100}
                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Description
                                    </label>

                                    <textarea
                                        value={editDescription}
                                        onChange={(e) =>
                                            setEditDescription(e.target.value)
                                        }
                                        rows={4}
                                        maxLength={500}
                                        className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
                                        placeholder="Enter brand description..."
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEditingBrand(null)
                                    }
                                    disabled={saving}
                                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={saveBrand}
                                    disabled={
                                        saving || !editName.trim()
                                    }
                                    className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                                >
                                    <Check size={16} />
                                    {saving
                                        ? "Saving..."
                                        : "Save changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
