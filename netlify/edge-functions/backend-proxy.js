// Runs on Netlify, not in the browser bundle. Keep PROXY_SECRET out of VITE_*.
export async function proxyRequest(request, context, { backendOrigin, secret, fetcher = fetch }) {
  let backend;
  try {
    backend = new URL(backendOrigin);
  } catch {
    /* handled below */
  }
  if (
    !backend ||
    backend.protocol !== 'https:' ||
    backend.username ||
    backend.password ||
    backend.pathname !== '/' ||
    backend.search ||
    backend.hash ||
    !secret ||
    secret.length < 32 ||
    !context.ip
  ) {
    return Response.json(
      { error: { code: 'PROXY_NOT_READY', message: 'Backend proxy is not configured' } },
      { status: 503 },
    );
  }
  const source = new URL(request.url);
  const target = new URL(source.pathname + source.search, backend);
  const headers = new Headers(request.headers);
  for (const name of [
    'host',
    'forwarded',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-shorturl-proxy-secret',
    'x-shorturl-client-ip',
  ])
    headers.delete(name);
  headers.set('x-shorturl-proxy-secret', secret);
  headers.set('x-shorturl-client-ip', context.ip);
  headers.set('accept-encoding', 'identity');
  try {
    const response = await fetcher(target, {
      method: request.method,
      headers,
      ...(!['GET', 'HEAD'].includes(request.method) ? { body: request.body, duplex: 'half' } : {}),
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    const result = new Response(response.body, response);
    // Server-side fetch decodes compressed responses; do not forward stale encoding/length.
    result.headers.delete('content-encoding');
    result.headers.delete('content-length');
    result.headers.set('Cache-Control', 'no-store');
    return result;
  } catch {
    return Response.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend is temporarily unavailable' } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
export default (request, context) =>
  proxyRequest(request, context, {
    backendOrigin: Netlify.env.get('BACKEND_ORIGIN'),
    secret: Netlify.env.get('PROXY_SECRET'),
  });
