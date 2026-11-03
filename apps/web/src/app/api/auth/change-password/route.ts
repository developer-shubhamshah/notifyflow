import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("nf_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { message: "Authentication required. Please sign in again." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    const backendResponse = await fetch(
      `${process.env.API_URL}/auth/change-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

    const data = await backendResponse.json();

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error("Change password proxy failed:", error);

    return NextResponse.json(
      { message: "Unable to connect to the server." },
      { status: 502 },
    );
  }
}