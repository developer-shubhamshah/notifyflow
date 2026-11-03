import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const accessToken = request.cookies.get("nf_access_token")?.value;

        if (!accessToken) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );
        }

        const response = await fetch(`${process.env.API_URL}/brands`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
        });

        const data = await response.json();

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch {
        return NextResponse.json(
            { message: "Unable to fetch brands." },
            { status: 502 },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const accessToken = request.cookies.get("nf_access_token")?.value;

        if (!accessToken) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );
        }

        const body = await request.json();

        const response = await fetch(`${process.env.API_URL}/brands`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const data = await response.json();

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch {
        return NextResponse.json(
            { message: "Unable to create brand." },
            { status: 502 },
        );
    }
}