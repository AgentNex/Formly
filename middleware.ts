import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Pass through all requests - client AuthGuard enforces authenticated access
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!.*\\.[\\w]+$|_next/static|_next/image).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
