'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Users, FileBarChart2, Settings,
  MessageSquare, Megaphone, LogOut, ChevronRight,
  BarChart3, Zap, UserPlus, Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const adminNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/relatorios', label: 'Relatórios', icon: FileBarChart2 },
]

const adsNav = [
  { href: '/meta-ads', label: 'Meta Ads', icon: Megaphone, badge: null },
  { href: '/google-ads', label: 'Google Ads', icon: BarChart3, badge: 'Em breve' },
]

const settingsNav = [
  { href: '/clientes', label: 'Clientes', icon: Building2 },
  { href: '/clientes/usuarios', label: 'Usuários', icon: UserPlus },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  role: 'ADMIN' | 'CLIENT'
  userName: string
  userEmail: string
}

function NavItem({ href, label, icon: Icon, badge }: {
  href: string
  label: string
  icon: React.ElementType
  badge?: string | null
}) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={badge ? '#' : href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
        badge && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-400">
          {badge}
        </Badge>
      )}
      {active && !badge && <ChevronRight className="w-3 h-3 opacity-50" />}
    </Link>
  )
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  return (
    <aside className="flex flex-col w-60 shrink-0 h-screen bg-[var(--sidebar)] border-r border-border/50">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border/50">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-sm tracking-tight">
          Roberto<span className="text-primary">Venda</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Principal */}
        <div className="space-y-1">
          {adminNav.map(item => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        {/* Anúncios */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
            Anúncios
          </p>
          {adsNav.map(item => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        {/* Admin only */}
        {role === 'ADMIN' && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
              Administração
            </p>
            {settingsNav.map(item => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        )}
      </nav>

      <Separator className="opacity-50" />

      {/* Footer: user + logout */}
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
            {userName?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
          </div>
          {role === 'ADMIN' && (
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs h-8"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
