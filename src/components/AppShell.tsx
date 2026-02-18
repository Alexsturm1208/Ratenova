'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Image from 'next/image';
import LogoText from '../../Ratenova Logo_ ohne icon.png';

const navItems = [
  { href: '/dashboard', label: 'Überblick', icon: '◉' },
  { href: '/budget', label: 'Budget', icon: '€' },
  { href: '/debts', label: 'Verbindlichkeiten', icon: '☰' },
  { href: '/agreements', label: 'Vereinbarung', icon: '✎' },
  { href: '/timeline', label: 'Verlauf', icon: '◔' },
];

interface Props {
  children: React.ReactNode;
  userName: string;
  userPlan: 'free' | 'premium';
}

export default function AppShell({ children, userName, userPlan }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar (Desktop) ── */}
      <aside className="hidden lg:flex w-[220px] fixed inset-y-0 left-0 bg-sf-bg-s border-r border-white/5 flex-col py-6 z-50">
        {/* Logo */}
        <div className="px-5 pb-7">
          <Image src={LogoText} alt="Ratenova" priority className="w-[150px] h-auto drop-shadow-[0_6px_16px_rgba(34,197,94,0.20)]" />
        </div>

        {/* Nav */}
        <nav className="flex-1">
          {navItems.map(item => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex items-center gap-2.5 w-full px-5 py-2.5 text-sm border-r-2 transition-all
                ${isActive(item.href)
                  ? 'bg-sf-em/8 text-sf-em font-semibold border-sf-em'
                  : 'text-sf-tm border-transparent hover:text-sf-ts hover:bg-white/[0.02]'
                }`}
            >
              <span className="text-[17px] w-6 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User + Plan */}
        <div className="px-4 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-full bg-sf-bg-e border border-white/10 flex items-center justify-center text-xs font-bold text-sf-em">
              {userName[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{userName}</p>
              <p className="text-[10px] text-sf-tm uppercase tracking-wider">
                {userPlan === 'premium' ? '⭐ Premium' : 'Free'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 text-xs rounded-lg border border-white/10 text-sf-tm hover:text-sf-co hover:border-sf-co/30 transition"
          >
            Abmelden
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 lg:ml-[220px] p-5 lg:p-8 pb-24 lg:pb-8 max-w-[960px]">
        {children}
      </main>

      {/* ── Mobile Nav ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-sf-bg-s border-t border-white/5 flex justify-around items-center py-1.5 z-50">
        {navItems.map(item => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 text-[10px]
              ${isActive(item.href) ? 'text-sf-em font-semibold' : 'text-sf-tm'}`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-4 py-2 text-[10px] text-sf-tm"
        >
          <span className="text-xl">⏻</span>
          Abmelden
        </button>
      </nav>
    </div>
  );
}
