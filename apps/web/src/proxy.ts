import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("nf_access_token")?.value;
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isPasswordChangePage = pathname === "/change-password";

  if (!accessToken) {
    if (isLoginPage) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Allow authenticated users to access the forced password-change page.
  // The backend validates the access token when the password is submitted.
  if (isPasswordChangePage) {
    return NextResponse.next();
  }

  try {
    const response = await fetch(
      `${process.env.API_URL}/auth/profile`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const redirect = NextResponse.redirect(
        new URL("/login", request.url),
      );

      redirect.cookies.delete("nf_access_token");
      redirect.cookies.delete("nf_refresh_token");

      return redirect;
    }

    const data = await response.json();
    const user = data.user;

    if (user.mustChangePassword && !isPasswordChangePage) {
      return NextResponse.redirect(
        new URL("/change-password", request.url),
      );
    }

    if (isPasswordChangePage && !user.mustChangePassword) {
      return NextResponse.redirect(
        new URL("/", request.url),
      );
    }

    if (isLoginPage) {
      return NextResponse.redirect(
        new URL("/", request.url),
      );
    }

    if (
      pathname.startsWith("/admin") &&
      user.platformRole !== "ADMIN"
    ) {
      return NextResponse.redirect(
        new URL("/dashboard", request.url),
      );
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(
      new URL("/login", request.url),
    );
  }
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/admin/:path*",
    "/change-password",
  ],
};