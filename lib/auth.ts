import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'

// Cliente direto — sem cookies (necessário no contexto do NextAuth authorize)
function getSupabaseClients() {
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return { anonClient, adminClient }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { anonClient, adminClient } = getSupabaseClients()

        // Autentica com anon client (signInWithPassword é método de auth de usuário)
        const { data: authData, error } = await anonClient.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        })

        if (error || !authData.user) return null

        // Busca perfil com service_role (ignora RLS para garantir acesso)
        const { data: profile } = await adminClient
          .from('users')
          .select('id, email, name, role, client_id')
          .eq('id', authData.user.id)
          .single()

        if (!profile) return null

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          client_id: profile.client_id,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.client_id = (user as any).client_id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub
        ;(session.user as any).role = token.role
        ;(session.user as any).client_id = token.client_id
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
