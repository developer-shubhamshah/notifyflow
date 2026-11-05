
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ brandId: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const accessToken = request.cookies.get("nf_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { brandId } = await context.params;
    const queryString = request.nextUrl.searchParams.toString();

    const response = await fetch(
      `${process.env.API_URL}/brands/${encodeURIComponent(brandId)}/contacts${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Unable to fetch contacts." },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const accessToken = request.cookies.get("nf_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { brandId } = await context.params;
    const body = await request.json();

    const response = await fetch(
      `${process.env.API_URL}/brands/${encodeURIComponent(brandId)}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Unable to create contact." },
      { status: 502 }
    );
  }
}
