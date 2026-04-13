'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Link2,
  BarChart3,
  FolderOpen,
  Settings,
  PenTool,
  ChevronLeft,
  ChevronRight,
  Code2,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Links', href: '/links', icon: Link2 },
  { label: 'Spaces', href: '/spaces', icon: FolderOpen },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Signatures', href: '/signatures', icon: PenTool },
];

const bottomNavItems = [
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-200 z-40',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="text-accent font-extrabold text-xl tracking-tight">O</span>
          {!collapsed && (
            <span className="font-bold text-foreground tracking-tight">OpenDoc</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card-hover'
              )}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="py-4 px-3 border-t border-border space-y-0.5">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card-hover'
              )}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-muted-foreground hover:bg-card-hover w-full transition-colors duration-150 cursor-pointer"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>

        <a
          href="https://github.com/JasonLeviGoodison/OpenDoc"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-muted-foreground hover:bg-card-hover w-full transition-colors duration-150"
        >
          <Code2 size={18} />
          {!collapsed && <span>Source</span>}
        </a>
      </div>
    </aside>
  );
}
