import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const isAuthPage = nextUrl.pathname.startsWith('/login')
  const isApiAuth = nextUrl.pathname.startsWith('/api/auth')
  const isWebhook = nextUrl.pathname.startsWith('/api/webhooks')

  // Webhooks são públicos
  if (isWebhook || isApiAuth) return NextResponse.next()

  // Redireciona para login se não autenticado
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Redireciona para dashboard se já logado e tentando acessar login
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
