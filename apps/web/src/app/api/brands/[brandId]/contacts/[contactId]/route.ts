
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{
        brandId: string;
        contactId: string;
    }>;
};

export async function PATCH(
    request: NextRequest,
    context: RouteContext,
) {
    try {
        const { brandId, contactId } = await context.params;
        const accessToken = request.cookies.get("nf_access_token")?.value;
        const apiUrl = process.env.API_URL;

        if (!accessToken) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );
        }

        if (!apiUrl) {
            return NextResponse.json(
                { message: "API_URL is not configured" },
                { status: 500 },
            );
        }

        const body = await request.json();

        const response = await fetch(
            `${apiUrl}/brands/${encodeURIComponent(brandId)}/contacts/${encodeURIComponent(contactId)}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
                cache: "no-store",
            },
        );

        const responseText = await response.text();

        let data: unknown;

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            data = {
                message: responseText || "Invalid backend response",
            };
        }

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        console.error("Contact update proxy error:", error);

        return NextResponse.json(
            {
                message: "Unable to update contact.",
                error: error instanceof Error
                    ? error.message
                    : String(error),
            },
            { status: 502 },
        );
    }
}
