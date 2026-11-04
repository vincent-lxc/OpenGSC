// Private instance: tell every crawler to stay out. Public (exempted in src/proxy.ts matcher).
export function GET() {
  return new Response("User-agent: *\nDisallow: /\n", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
