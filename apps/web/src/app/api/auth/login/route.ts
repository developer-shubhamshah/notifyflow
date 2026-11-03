import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${process.env.API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
      }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Login failed" },
        { status: response.status },
      );
    }

    const result = NextResponse.json({
      message: data.message,
      requiresPasswordChange: data.requiresPasswordChange,
      user: data.user,
    });

    const isProduction = process.env.NODE_ENV === "production";

    result.cookies.set("nf_access_token", data.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    result.cookies.set("nf_refresh_token", data.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return result;
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to the authentication service." },
      { status: 502 },
    );
  }
}
