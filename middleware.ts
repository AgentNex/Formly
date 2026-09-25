import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://formly-enterprise.convex.cloud";
}

const isAuthPage = createRouteMatcher([
  "/signin(.*)",
  "/signup(.*)",
  "/forgot-password(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/f/(.*)",
  "/api/auth/(.*)",
  "/_next/(.*)",
  "/favicon.ico",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isAuth = await convexAuth.isAuthenticated();

  // If already authenticated and trying to access signin/signup/forgot-password, redirect to dashboard
  if (isAuthPage(request) && isAuth) {
    return nextjsMiddlewareRedirect(request, "/");
  }

  // Public form runner and public auth APIs are always open
  if (isPublicRoute(request) || isAuthPage(request)) {
    return;
  }

  // All other application routes (/, /dashboard, /project/*, /analytics/*, /settings/*) are strictly protected
  if (!isAuth) {
    const pathname = request.nextUrl.pathname;
    const redirectUrl =
      pathname === "/"
        ? "/signin"
        : `/signin?redirect=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return nextjsMiddlewareRedirect(request, redirectUrl);
  }
});

export const config = {
  // Match all request paths except for static files with extensions (e.g. .svg, .png, .ico, .css, .js)
  matcher: [
    "/((?!.*\\.[\\w]+$|_next/static|_next/image).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
