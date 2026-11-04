// Render /login per request so it is never served with the static-page s-maxage=31536000
// (a CDN could otherwise keep a stale login page for a year). Dynamic pages get no-store.
export const dynamic = "force-dynamic";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
