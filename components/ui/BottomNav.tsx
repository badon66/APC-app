'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, MapPin, Users, Briefcase, Settings } from 'lucide-react'

const tabs = [
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/prospects', label: 'Prospects', icon: MapPin },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-surface border-t border-white/8 z-50"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
    >
      <div className="flex items-center justify-around px-1 pt-2 pb-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 min-w-[60px] px-2 py-1.5 rounded-xl transition-colors ${
                active ? 'text-accent' : 'text-muted'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
