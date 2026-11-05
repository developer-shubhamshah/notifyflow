
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
    Search,
    Users,
    UserCheck,
    UserX,
    MessageCircle,
    MessageSquare,
    Mail,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    AlertCircle,
    Plus,
    X,
    ArrowLeft,
    Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import BulkContactImport from "./BulkContactImport";

interface Brand {
    id: string;
    name: string;
    isActive: boolean;
}

interface Contact {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    mobile?: string | null;
    whatsappConsent: boolean;
    smsConsent: boolean;
    emailConsent: boolean;
    isActive: boolean;
    createdAt: string;
}

interface ContactStats {
    total: number;
    active: number;
    inactive: number;
    consent: {
        whatsapp: number;
        sms: number;
        email: number;
    };
}

interface ContactsResponse {
    data: Contact[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

interface ContactForm {
    firstName: string;
    lastName: string;
    mobile: string;
    email: string;
    whatsappConsent: boolean;
    smsConsent: boolean;
    emailConsent: boolean;
}

const PAGE_SIZE = 10;

const initialForm: ContactForm = {
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    whatsappConsent: false,
    smsConsent: false,
    emailConsent: false,
};

export default function ContactsPage() {
    const router = useRouter();

    const [brands, setBrands] = useState<Brand[]>([]);
    const [brandId, setBrandId] = useState("");
    const [stats, setStats] = useState<ContactStats | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [pagination, setPagination] =
        useState<ContactsResponse["pagination"] | null>(null);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Add contact form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [form, setForm] = useState<ContactForm>(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Edit contact modal state
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingContact, setEditingContact] =
        useState<Contact | null>(null);
    const [editForm, setEditForm] =
        useState<ContactForm>(initialForm);
    const [editStatus, setEditStatus] = useState(true);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState("");

    // Load brands and restore previously selected brand.
    useEffect(() => {
        async function loadBrands() {
            try {
                const response = await fetch("/api/brands", {
                    cache: "no-store",
                });

                if (response.status === 401) {
                    window.location.href = "/login";
                    return;
                }

                if (!response.ok) {
                    throw new Error("Unable to load brands.");
                }

                const result = await response.json();
                const availableBrands: Brand[] = result.brands ?? [];

                setBrands(availableBrands);

                if (availableBrands.length === 0) {
                    setError(
                        "No brands found. Create a brand to manage contacts."
                    );
                    setLoading(false);
                    return;
                }

                const savedId = localStorage.getItem(
                    "notifyflow_active_brand_id"
                );

                const selected = availableBrands.find(
                    (brand) => brand.id === savedId
                );

                const activeId = selected?.id ?? availableBrands[0].id;

                if (!selected) {
                    localStorage.setItem(
                        "notifyflow_active_brand_id",
                        activeId
                    );
                }

                setBrandId(activeId);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Something went wrong."
                );
                setLoading(false);
            }
        }

        loadBrands();
    }, []);

    // Load contacts and statistics.
    const loadContacts = useCallback(async () => {
        if (!brandId) return;

        setLoading(true);
        setError("");

        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(PAGE_SIZE),
            });

            if (search.trim()) {
                params.set("search", search.trim());
            }

            if (filter === "active") {
                params.set("isActive", "true");
            }

            if (filter === "inactive") {
                params.set("isActive", "false");
            }

            const [statsResponse, contactsResponse] = await Promise.all([
                fetch(
                    `/api/brands/${encodeURIComponent(brandId)}/contacts/stats`,
                    { cache: "no-store" }
                ),
                fetch(
                    `/api/brands/${encodeURIComponent(brandId)}/contacts?${params.toString()}`,
                    { cache: "no-store" }
                ),
            ]);

            if (
                statsResponse.status === 401 ||
                contactsResponse.status === 401
            ) {
                window.location.href = "/login";
                return;
            }

            if (!statsResponse.ok) {
                throw new Error("Unable to load contact statistics.");
            }

            if (!contactsResponse.ok) {
                throw new Error("Unable to load contacts.");
            }

            const statsData: ContactStats =
                await statsResponse.json();

            const contactsData: ContactsResponse =
                await contactsResponse.json();

            setStats(statsData);
            setContacts(contactsData.data ?? []);
            setPagination(contactsData.pagination ?? null);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load contacts."
            );
        } finally {
            setLoading(false);
        }
    }, [brandId, page, search, filter]);

    useEffect(() => {
        if (brandId) {
            loadContacts();
        }
    }, [brandId, loadContacts]);

    // Reset to first page when search or filter changes.
    useEffect(() => {
        setPage(1);
    }, [search, filter]);

    const changeBrand = (id: string) => {
        setBrandId(id);

        localStorage.setItem(
            "notifyflow_active_brand_id",
            id
        );

        setPage(1);
        setSuccessMessage("");
        setFormError("");
        setEditError("");
    };

    // Update Add Contact form.
    const updateForm = <K extends keyof ContactForm>(
        field: K,
        value: ContactForm[K]
    ) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    // Add contact.
    const handleAddContact = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setFormError("");
        setSuccessMessage("");

        const firstName = form.firstName.trim();
        const mobile = form.mobile.trim();
        const email = form.email.trim();

        if (!firstName) {
            setFormError("First name is required.");
            return;
        }

        if (!mobile && !email) {
            setFormError(
                "Enter at least a mobile number or email address."
            );
            return;
        }

        if (mobile && !/^\+[1-9]\d{7,14}$/.test(mobile)) {
            setFormError(
                "Enter mobile number in E.164 format, e.g. +919876543210."
            );
            return;
        }

        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            setFormError("Please enter a valid email address.");
            return;
        }

        if (
            (form.whatsappConsent || form.smsConsent) &&
            !mobile
        ) {
            setFormError(
                "A mobile number is required for WhatsApp or SMS consent."
            );
            return;
        }

        if (form.emailConsent && !email) {
            setFormError(
                "An email address is required for Email consent."
            );
            return;
        }

        if (!brandId) {
            setFormError("Please select a brand.");
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch(
                `/api/brands/${encodeURIComponent(brandId)}/contacts`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        firstName,
                        lastName: form.lastName.trim() || undefined,
                        mobile: mobile || undefined,
                        email: email || undefined,
                        whatsappConsent: form.whatsappConsent,
                        smsConsent: form.smsConsent,
                        emailConsent: form.emailConsent,
                    }),
                }
            );

            const result = await response.json().catch(() => ({}));

            if (response.status === 401) {
                window.location.href = "/login";
                return;
            }

            if (!response.ok) {
                const message = Array.isArray(result.message)
                    ? result.message.join(", ")
                    : result.message;

                throw new Error(
                    message || "Unable to create contact."
                );
            }

            setForm(initialForm);
            setShowAddForm(false);
            setPage(1);
            setSearch("");
            setFilter("all");
            setSuccessMessage("Contact added successfully.");

            await loadContacts();
        } catch (err) {
            setFormError(
                err instanceof Error
                    ? err.message
                    : "Unable to create contact."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Open Edit Contact modal.
    const openEditContact = (contact: Contact) => {
        setEditingContact(contact);

        setEditForm({
            firstName: contact.firstName ?? "",
            lastName: contact.lastName ?? "",
            mobile: contact.mobile ?? "",
            email: contact.email ?? "",
            whatsappConsent: contact.whatsappConsent,
            smsConsent: contact.smsConsent,
            emailConsent: contact.emailConsent,
        });

        setEditStatus(contact.isActive);
        setEditError("");
        setSuccessMessage("");
        setShowEditForm(true);
    };

    // Close Edit Contact modal.
    const closeEditContact = () => {
        if (editSubmitting) return;

        setShowEditForm(false);
        setEditingContact(null);
        setEditForm(initialForm);
        setEditError("");
    };

    // Save contact changes.
    const handleUpdateContact = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!editingContact || !brandId) return;

        setEditError("");
        setSuccessMessage("");

        const firstName = editForm.firstName.trim();
        const mobile = editForm.mobile.trim();
        const email = editForm.email.trim();

        if (!firstName) {
            setEditError("First name is required.");
            return;
        }

        if (!mobile && !email) {
            setEditError(
                "Enter at least a mobile number or email address."
            );
            return;
        }

        if (mobile && !/^\+[1-9]\d{7,14}$/.test(mobile)) {
            setEditError(
                "Enter mobile number in E.164 format, e.g. +919876543210."
            );
            return;
        }

        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            setEditError("Please enter a valid email address.");
            return;
        }

        if (
            (editForm.whatsappConsent || editForm.smsConsent) &&
            !mobile
        ) {
            setEditError(
                "A mobile number is required for WhatsApp or SMS consent."
            );
            return;
        }

        if (editForm.emailConsent && !email) {
            setEditError(
                "An email address is required for Email consent."
            );
            return;
        }

        setEditSubmitting(true);

        try {
            const response = await fetch(
                `/api/brands/${encodeURIComponent(brandId)}/contacts/${encodeURIComponent(editingContact.id)}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        firstName,
                        lastName: editForm.lastName.trim(),
                        mobile: mobile || null,
                        email: email || null,
                        whatsappConsent: editForm.whatsappConsent,
                        smsConsent: editForm.smsConsent,
                        emailConsent: editForm.emailConsent,
                        isActive: editStatus,
                    }),
                }
            );

            const result = await response.json().catch(() => ({}));

            if (response.status === 401) {
                window.location.href = "/login";
                return;
            }

            if (!response.ok) {
                const message = Array.isArray(result.message)
                    ? result.message.join(", ")
                    : result.message;

                throw new Error(
                    message || "Unable to update contact."
                );
            }

            setShowEditForm(false);
            setEditingContact(null);
            setEditForm(initialForm);
            setSuccessMessage("Contact updated successfully.");

            await loadContacts();
        } catch (err) {
            setEditError(
                err instanceof Error
                    ? err.message
                    : "Unable to update contact."
            );
        } finally {
            setEditSubmitting(false);
        }
    };

    // Statistics cards.
    const statCards = [
        {
            label: "Total contacts",
            value: stats?.total ?? 0,
            icon: Users,
            color: "text-violet-600",
            bg: "bg-violet-100",
        },
        {
            label: "Active contacts",
            value: stats?.active ?? 0,
            icon: UserCheck,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
        },
        {
            label: "Inactive contacts",
            value: stats?.inactive ?? 0,
            icon: UserX,
            color: "text-orange-600",
            bg: "bg-orange-100",
        },
        {
            label: "WhatsApp consent",
            value: stats?.consent.whatsapp ?? 0,
            icon: MessageCircle,
            color: "text-green-600",
            bg: "bg-green-100",
        },
        {
            label: "SMS consent",
            value: stats?.consent.sms ?? 0,
            icon: MessageSquare,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            label: "Email consent",
            value: stats?.consent.email ?? 0,
            icon: Mail,
            color: "text-pink-600",
            bg: "bg-pink-100",
        },
    ];

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">

                {/* Page header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <button
                            type="button"
                            onClick={() => router.push("/dashboard")}
                            className="mb-5 inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
                        >
                            <ArrowLeft size={17} />
                            Back to Dashboard
                        </button>

                        <h1 className="text-2xl font-bold text-slate-900">
                            Contacts
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Manage your brand contacts and communication permissions.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={brandId}
                            onChange={(event) => changeBrand(event.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-violet-500"
                        >
                            {brands.map((brand) => (
                                <option key={brand.id} value={brand.id}>
                                    {brand.name}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={loadContacts}
                            disabled={loading || !brandId}
                            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw
                                size={18}
                                className={loading ? "animate-spin" : ""}
                            />
                        </button>

                        <BulkContactImport
                            brandId={brandId}
                            onImported={() => {
                                void loadContacts();
                            }}
                        />

                        <button
                            onClick={() => {
                                setForm(initialForm);
                                setFormError("");
                                setSuccessMessage("");
                                setShowAddForm(true);
                            }}
                            disabled={!brandId}
                            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                        >
                            <Plus size={18} />
                            Add Contact
                        </button>
                    </div>
                </div>

                {/* General error */}
                {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {/* Success message */}
                {successMessage && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                        {successMessage}
                    </div>
                )}

                {/* Add Contact form */}
                {showAddForm && (
                    <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm md:p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Add New Contact
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Add a contact to{" "}
                                    {brands.find((b) => b.id === brandId)?.name}.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setFormError("");
                                }}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                aria-label="Close form"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddContact} className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        First name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.firstName}
                                        onChange={(e) => updateForm("firstName", e.target.value)}
                                        placeholder="Enter first name"
                                        required
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Last name
                                    </label>
                                    <input
                                        type="text"
                                        value={form.lastName}
                                        onChange={(e) => updateForm("lastName", e.target.value)}
                                        placeholder="Enter last name"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Mobile number
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.mobile}
                                        onChange={(e) => updateForm("mobile", e.target.value)}
                                        placeholder="+919876543210"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                                    />
                                    <p className="mt-1 text-xs text-slate-400">
                                        Include country code, e.g. +91 for India.
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Email address
                                    </label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => updateForm("email", e.target.value)}
                                        placeholder="customer@example.com"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            {/* Communication consent */}
                            <div className="rounded-xl border border-slate-200 p-4">
                                <h3 className="mb-1 text-sm font-semibold text-slate-900">
                                    Communication Consent
                                </h3>
                                <p className="mb-4 text-xs text-slate-500">
                                    Record the channels for which this contact has given permission.
                                </p>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={form.whatsappConsent}
                                            onChange={(e) =>
                                                updateForm("whatsappConsent", e.target.checked)
                                            }
                                            className="h-4 w-4 accent-violet-600"
                                        />
                                        <MessageCircle className="text-green-600" size={20} />
                                        <span className="text-sm font-medium text-slate-700">
                                            WhatsApp
                                        </span>
                                    </label>

                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={form.smsConsent}
                                            onChange={(e) =>
                                                updateForm("smsConsent", e.target.checked)
                                            }
                                            className="h-4 w-4 accent-violet-600"
                                        />
                                        <MessageSquare className="text-blue-600" size={20} />
                                        <span className="text-sm font-medium text-slate-700">
                                            SMS
                                        </span>
                                    </label>

                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={form.emailConsent}
                                            onChange={(e) =>
                                                updateForm("emailConsent", e.target.checked)
                                            }
                                            className="h-4 w-4 accent-violet-600"
                                        />
                                        <Mail className="text-pink-600" size={20} />
                                        <span className="text-sm font-medium text-slate-700">
                                            Email
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {formError && (
                                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    <AlertCircle size={17} />
                                    {formError}
                                </div>
                            )}

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setFormError("");
                                    }}
                                    disabled={submitting}
                                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? "Saving..." : "Save Contact"}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {/* Statistics */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {statCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <div
                                key={card.label}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">
                                            {card.label}
                                        </p>
                                        <p className="mt-2 text-2xl font-bold text-slate-900">
                                            {loading && !stats
                                                ? "—"
                                                : card.value.toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                    <div className={`rounded-xl p-3 ${card.bg}`}>
                                        <Icon className={card.color} size={22} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* All Contacts table */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                All contacts
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                {pagination
                                    ? `${pagination.total.toLocaleString("en-IN")} contacts found`
                                    : "Contact directory"}
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
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search contacts..."
                                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-500 sm:w-64"
                                />
                            </div>

                            <select
                                value={filter}
                                onChange={(event) => setFilter(event.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                            >
                                <option value="all">All contacts</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">Contact</th>
                                    <th className="px-5 py-4 font-semibold">Mobile</th>
                                    <th className="px-5 py-4 font-semibold">Email</th>
                                    <th className="px-5 py-4 font-semibold">Consent</th>
                                    <th className="px-5 py-4 font-semibold">Status</th>
                                    <th className="px-5 py-4 font-semibold">Created</th>
                                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-12 text-center text-slate-500"
                                        >
                                            Loading contacts...
                                        </td>
                                    </tr>
                                ) : contacts.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-12 text-center text-slate-500"
                                        >
                                            No contacts found.
                                        </td>
                                    </tr>
                                ) : (
                                    contacts.map((contact) => (
                                        <tr
                                            key={contact.id}
                                            className="hover:bg-slate-50"
                                        >
                                            <td className="px-5 py-4 font-medium text-slate-900">
                                                {contact.firstName} {contact.lastName ?? ""}
                                            </td>

                                            <td className="px-5 py-4 text-slate-600">
                                                {contact.mobile || "—"}
                                            </td>

                                            <td className="px-5 py-4 text-slate-600">
                                                {contact.email || "—"}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        title="WhatsApp"
                                                        className={
                                                            contact.whatsappConsent
                                                                ? "text-green-600"
                                                                : "text-slate-300"
                                                        }
                                                    >
                                                        <MessageCircle size={17} />
                                                    </span>

                                                    <span
                                                        title="SMS"
                                                        className={
                                                            contact.smsConsent
                                                                ? "text-blue-600"
                                                                : "text-slate-300"
                                                        }
                                                    >
                                                        <MessageSquare size={17} />
                                                    </span>

                                                    <span
                                                        title="Email"
                                                        className={
                                                            contact.emailConsent
                                                                ? "text-pink-600"
                                                                : "text-slate-300"
                                                        }
                                                    >
                                                        <Mail size={17} />
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                        contact.isActive
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-slate-100 text-slate-500"
                                                    }`}
                                                >
                                                    {contact.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-slate-500">
                                                {new Date(
                                                    contact.createdAt
                                                ).toLocaleDateString("en-IN")}
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditContact(contact)}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                                                >
                                                    <Pencil size={14} />
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">
                            {pagination
                                ? `Page ${pagination.page} of ${Math.max(
                                    pagination.totalPages,
                                    1
                                )}`
                                : "—"}
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() =>
                                    setPage((current) => Math.max(1, current - 1))
                                }
                                disabled={!pagination?.hasPreviousPage || loading}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft size={16} />
                                Previous
                            </button>

                            <button
                                onClick={() =>
                                    setPage((current) => current + 1)
                                }
                                disabled={!pagination?.hasNextPage || loading}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {/* Edit Contact Modal */}
            {showEditForm && editingContact && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeEditContact();
                        }
                    }}
                >
                    <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                        {/* Modal header */}
                        <div className="flex items-center justify-between border-b border-slate-100 p-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Edit Contact
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Update contact information and communication permissions.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeEditContact}
                                disabled={editSubmitting}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                aria-label="Close edit contact"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleUpdateContact}
                            className="space-y-5 p-5"
                        >
                            {/* Contact details */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        First name *
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.firstName}
                                        onChange={(e) =>
                                            setEditForm((current) => ({
                                                ...current,
                                                firstName: e.target.value,
                                            }))
                                        }
                                        required
                                        maxLength={100}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Last name
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.lastName}
                                        onChange={(e) =>
                                            setEditForm((current) => ({
                                                ...current,
                                                lastName: e.target.value,
                                            }))
                                        }
                                        maxLength={100}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Mobile number
                                    </label>
                                    <input
                                        type="tel"
                                        value={editForm.mobile}
                                        onChange={(e) =>
                                            setEditForm((current) => ({
                                                ...current,
                                                mobile: e.target.value,
                                            }))
                                        }
                                        placeholder="+919876543210"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Email address
                                    </label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) =>
                                            setEditForm((current) => ({
                                                ...current,
                                                email: e.target.value,
                                            }))
                                        }
                                        maxLength={255}
                                        placeholder="customer@example.com"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            {/* Communication consent */}
                            <div className="rounded-xl border border-slate-200 p-4">
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Communication Consent
                                </h3>
                                <p className="mb-4 mt-1 text-xs text-slate-500">
                                    Select the channels for which this contact has given permission.
                                </p>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={editForm.whatsappConsent}
                                            onChange={(e) =>
                                                setEditForm((current) => ({
                                                    ...current,
                                                    whatsappConsent: e.target.checked,
                                                }))
                                            }
                                            className="h-4 w-4 accent-violet-600"
                                        />
                                        <MessageCircle
                                            size={19}
                                            className="text-green-600"
                                        />
                                        <span className="text-sm font-medium">
                                            WhatsApp
                                        </span>
                                    </label>

                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={editForm.smsConsent}
                                            onChange={(e) =>
                                                setEditForm((current) => ({
                                                    ...current,
                                                    smsConsent: e.target.checked,
                                                }))
                                            }
                                            className="h-4 w-4 accent-violet-600"
                                        />
                                        <MessageSquare
                                            size={19}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm font-medium">
                                            SMS
                                        </span>
                                    </label>

                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={editForm.emailConsent}
                                            onChange={(e) =>
                                                setEditForm((current) => ({
                                                    ...current,
                                                    emailConsent: e.target.checked,
                                                }))
                                            }
                                            className="h-4 w-4 accent-violet-600"
                                        />
                                        <Mail
                                            size={19}
                                            className="text-pink-600"
                                        />
                                        <span className="text-sm font-medium">
                                            Email
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Contact status */}
                            <div className="rounded-xl border border-slate-200 p-4">
                                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                                    Contact Status
                                </h3>

                                <div className="flex flex-wrap gap-5">
                                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="contactStatus"
                                            checked={editStatus}
                                            onChange={() => setEditStatus(true)}
                                            className="accent-violet-600"
                                        />
                                        <span className="font-medium text-emerald-700">
                                            Active
                                        </span>
                                    </label>

                                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="contactStatus"
                                            checked={!editStatus}
                                            onChange={() => setEditStatus(false)}
                                            className="accent-violet-600"
                                        />
                                        <span className="font-medium text-slate-600">
                                            Inactive
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Edit error */}
                            {editError && (
                                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    <AlertCircle
                                        size={17}
                                        className="mt-0.5 shrink-0"
                                    />
                                    {editError}
                                </div>
                            )}

                            {/* Modal actions */}
                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeEditContact}
                                    disabled={editSubmitting}
                                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={editSubmitting}
                                    className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {editSubmitting
                                        ? "Saving..."
                                        : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
