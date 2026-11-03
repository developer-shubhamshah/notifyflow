import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("nf_refresh_token")?.value;

  try {
    if (refreshToken) {
      await fetch(`${process.env.API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
    }
  } catch (error) {
    console.error("Backend logout failed:", error);
  }

  const response = NextResponse.json({
    message: "Logged out successfully",
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  response.cookies.set("nf_access_token", "", cookieOptions);
  response.cookies.set("nf_refresh_token", "", cookieOptions);

  return response;
}