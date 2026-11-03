import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("nf_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { message: "Unauthenticated" },
        { status: 401 },
      );
    }

    const response = await fetch(`${process.env.API_URL}/auth/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Session expired" },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: "Unable to validate session" },
      { status: 502 },
    );
  }
}