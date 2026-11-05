
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    brandId: string;
    action: string;
  }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { brandId, action } = await context.params;

    if (!["upload", "import"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid contact import action" },
        { status: 400 },
      );
    }

    const token = request.cookies.get("nf_access_token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in again." },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    const apiUrl = process.env.API_URL;

    if (!apiUrl) {
      return NextResponse.json(
        { message: "API_URL is not configured" },
        { status: 500 },
      );
    }

    const response = await fetch(
      `${apiUrl}/brands/${encodeURIComponent(brandId)}/contact-import/${action}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => ({
      message: "Backend returned an invalid response",
    }));

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Contact import proxy error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Contact import proxy failed",
      },
      { status: 502 },
    );
  }
}
