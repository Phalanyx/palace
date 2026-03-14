import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

import { getSupabaseEnv } from "@/lib/supabase/env"

const publicRoutes = new Set(["/", "/login", "/signup", "/auth/callback"])

function isPublicRoute(pathname: string) {
  if (publicRoutes.has(pathname)) {
    return true
  }

  return false
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl
  const isPublic = isPublicRoute(pathname)
  const isApiRoute = pathname.startsWith("/api/")
  const isAuthPage = pathname === "/login" || pathname === "/signup"

/*
  if (!user && !isPublic) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(redirectUrl)
  }
*/

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
