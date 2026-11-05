import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ brandId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = request.cookies.get("nf_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { brandId } = await context.params;

    const response = await fetch(
      `${process.env.API_URL}/brands/${encodeURIComponent(brandId)}/contacts/stats`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Unable to fetch contact statistics." },
      { status: 502 },
    );
  }
}