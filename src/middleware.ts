import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Domain lock check
  const allowedDomains = [
    'zikkit-5e554.web.app',
    'zikkit-5e554.firebaseapp.com',
    'zikkit.netlify.app',
    'zikkitai.netlify.app',
    'localhost',
    'zikkit-jvc7.vercel.app',
    'zikkit.vercel.app',
    '127.0.0.1',
  ];

  const host = request.headers.get('host')?.split(':')[0] || '';
  if (!allowedDomains.includes(host) && !host.endsWith('.vercel.app') && process.env.NODE_ENV === 'production') {
    return new NextResponse('Unauthorized Domain', { status: 403 });
  }

  // Security headers for admin routes
  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
