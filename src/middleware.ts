import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Role → allowed base paths
const ROLE_PATHS: Record<string, string> = {
  gerente: '/gerente',
  operador: '/operador',
  cliente: '/cliente',
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const path = request.nextUrl.pathname

  // Skip static assets and public files
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/icons') ||
    path.startsWith('/manifest') ||
    path.endsWith('.png') ||
    path.endsWith('.ico') ||
    path.endsWith('.webmanifest')
  ) {
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 🛡️ TACTICAL BYPASS: Allow access if the bypass cookie is active (Master PIN sessions)
  const isBypassActive = request.cookies.get('704_bypass_active')?.value === 'true'

  if (!supabaseUrl || !supabaseAnonKey) {
    if (
      !isBypassActive &&
      (path.startsWith('/gerente') || path.startsWith('/operador') || path.startsWith('/cliente'))
    ) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    })

    let session: any = null
    try {
      const { data } = await supabase.auth.getSession()
      session = data?.session || null
    } catch (err) {
      console.warn('Middleware Supabase session warning:', err)
    }

    const isProtectedPath =
      path.startsWith('/gerente') || path.startsWith('/operador') || path.startsWith('/cliente')

    // 1. No session & no bypass → redirect to login
    if (!session && !isBypassActive && isProtectedPath) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // 2. If authenticated, enforce role-based access
    if (session && isProtectedPath && !isBypassActive) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      const role: string | null = userRecord?.role ?? session.user.user_metadata?.role ?? null

      if (role && ROLE_PATHS[role]) {
        const allowedPath = ROLE_PATHS[role]
        if (!path.startsWith(allowedPath)) {
          return NextResponse.redirect(new URL(allowedPath, request.url))
        }
      } else {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    // 3. Authenticated user trying to access login → redirect to root
    if (session && path.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  } catch (e) {
    console.error('Middleware auth check error:', e)
  }

  return response
}

export const runtime = 'experimental-edge'
