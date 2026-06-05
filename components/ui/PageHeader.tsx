'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  backHref?: string
  rightElement?: React.ReactNode
}

export default function PageHeader({ title, backHref, rightElement }: PageHeaderProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-4 bg-base border-b border-white/8">
      {backHref && (
        <button
          onClick={() => (backHref ? router.push(backHref) : router.back())}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/8 text-muted transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <h1 className="flex-1 text-lg font-bold text-foreground">{title}</h1>
      {rightElement && <div className="flex items-center gap-2">{rightElement}</div>}
    </header>
  )
}
