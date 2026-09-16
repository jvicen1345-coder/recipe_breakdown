// Behind a reverse proxy (Railway, Render, etc.) the raw request's Host header —
// and so `new URL(request.url).origin` — reflects the proxy's internal address
// to the container, not the public one a browser or a third party (e.g.
// Google's OAuth redirect_uri check) actually sees. Proxies set the real
// values in x-forwarded-proto/x-forwarded-host instead; fall back to
// request.url for local dev, where there's no proxy in front.
export function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (!forwardedHost) return new URL(request.url).origin;

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return `${forwardedProto}://${forwardedHost}`;
}
