import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Safety fallback: If keys are missing, we cannot check session.
    // Allow pass-through or redirect to login depending on desired behavior.
    // For 704 stability, we'll allow access if bypass is active, else redirect.
    const isBypassActive = request.cookies.get('704_bypass_active')?.value === 'true';
    const path = request.nextUrl.pathname;
    if (!isBypassActive && (path.startsWith('/gerente') || path.startsWith('/operador') || path.startsWith('/cliente'))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // 🛡️ TACTICAL BYPASS: Allow access if the bypass cookie is active (for Master PIN sessions)
  const isBypassActive = request.cookies.get('704_bypass_active')?.value === 'true'

  // PROTECTED ROUTES LOGIC
  const path = request.nextUrl.pathname
  
  // If no session AND no bypass, and trying to access protected dashboards
  if (!session && !isBypassActive && (path.startsWith('/gerente') || path.startsWith('/operador') || path.startsWith('/cliente'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If session exists and trying to access login
  if (session && path.startsWith('/login')) {
    // Redirect to their default dashboard if possible, or just root
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest|.*\\.webmanifest$|.*\\.png$|.*\\.ico$).*)',
  ],
}
