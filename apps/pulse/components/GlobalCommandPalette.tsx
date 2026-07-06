'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Command as CommandPrimitive } from 'cmdk';
import {
  ArrowRight,
  Bot,
  Building2,
  Command,
  Gamepad2,
  Home,
  type LucideIcon,
  LogIn,
  Search,
  ShoppingBasket,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CommandPaletteRoute = {
  href: string;
  label: string;
  active?: boolean;
  emphasis?: 'teal' | 'blue' | 'violet' | 'cyan' | 'emerald' | 'orange';
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routes: CommandPaletteRoute[];
  isLoggedIn: boolean;
  loginHref: string;
};

type CommandAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  group: 'Navigate' | 'Actions';
  icon: LucideIcon;
  keywords?: string[];
  emphasis?: CommandPaletteRoute['emphasis'];
};

export function GlobalCommandPalette({
  open,
  onOpenChange,
  routes,
  isLoggedIn,
  loginHref,
}: CommandPaletteProps) {
  const router = useRouter();
  const actions = useMemo(() => buildActions(routes, isLoggedIn, loginHref), [isLoggedIn, loginHref, routes]);

  if (!open) return null;

  const runAction = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const groupedActions = actions.reduce<Record<CommandAction['group'], CommandAction[]>>(
    (acc, action) => {
      acc[action.group].push(action);
      return acc;
    },
    { Navigate: [], Actions: [] }
  );

  return (
    <div className="fixed inset-0 z-[200]">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative mx-auto mt-20 w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-xl border border-cyan-100/15 bg-[#071722]/95 text-white shadow-[0_30px_100px_rgba(2,6,23,0.65)] backdrop-blur-2xl sm:mt-28">
        <CommandPrimitive label="Sunset Pulse command menu" shouldFilter>
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-cyan-200" />
            <CommandPrimitive.Input
              autoFocus
              className="h-10 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
              placeholder="Search routes, tools, and actions..."
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-md"
              aria-label="Close command palette"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <CommandPrimitive.List className="max-h-[60vh] overflow-y-auto py-2">
            <CommandPrimitive.Empty className="px-4 py-8 text-center text-sm font-semibold text-slate-400">
              No matching command found.
            </CommandPrimitive.Empty>

            {Object.entries(groupedActions).map(([group, groupActions]) => (
              <CommandPrimitive.Group
                key={group}
                heading={group}
                className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2"
              >
                {groupActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <CommandPrimitive.Item
                      key={action.id}
                      value={`${action.label} ${action.description} ${(action.keywords || []).join(' ')}`}
                      onSelect={() => runAction(action.href)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-sm text-slate-100 outline-none transition data-[selected=true]:border-cyan-300/25 data-[selected=true]:bg-cyan-300/10',
                        action.emphasis === 'orange' && 'data-[selected=true]:border-orange-300/25 data-[selected=true]:bg-orange-300/10',
                        action.emphasis === 'violet' && 'data-[selected=true]:border-violet-300/25 data-[selected=true]:bg-violet-300/10',
                        action.emphasis === 'emerald' && 'data-[selected=true]:border-emerald-300/25 data-[selected=true]:bg-emerald-300/10'
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-cyan-100">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-black">{action.label}</span>
                        <span className="block truncate text-xs font-medium text-slate-400">{action.description}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                    </CommandPrimitive.Item>
                  );
                })}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>

          <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <span className="flex items-center gap-2">
              <Command className="h-3.5 w-3.5" />
              Ctrl/Command + K
            </span>
            <span>Enter to open</span>
          </div>
        </CommandPrimitive>
      </div>
    </div>
  );
}

function buildActions(routes: CommandPaletteRoute[], isLoggedIn: boolean, loginHref: string): CommandAction[] {
  const routeActions = routes.map((route): CommandAction => ({
    id: `route:${route.href}`,
    label: route.label,
    description: route.href === '/' ? 'Return to the Sunset Pulse home surface.' : `Open ${route.label}.`,
    href: route.href,
    group: 'Navigate',
    icon: iconForRoute(route.href),
    keywords: [route.href.replace('/', ''), route.emphasis || ''],
    emphasis: route.emphasis,
  }));

  return [
    ...routeActions,
    {
      id: 'action:command-center',
      label: 'Ask Command Center',
      description: 'Route a task to the operator command surface.',
      href: '/command-center',
      group: 'Actions',
      icon: Sparkles,
      keywords: ['operator', 'ai', 'jamie', 'task'],
      emphasis: 'cyan',
    },
    {
      id: 'action:jamie-chat',
      label: 'Open Jamie Chat',
      description: 'Start a conversational planning or local intelligence thread.',
      href: '/sunset-chat',
      group: 'Actions',
      icon: Bot,
      keywords: ['chat', 'assistant', 'sunset chat'],
      emphasis: 'orange',
    },
    {
      id: 'action:cart',
      label: 'Open Cart',
      description: 'Review the current grill order cart.',
      href: '/cart',
      group: 'Actions',
      icon: ShoppingBasket,
      keywords: ['order', 'basket', 'grill'],
      emphasis: 'orange',
    },
    {
      id: isLoggedIn ? 'action:profile' : 'action:login',
      label: isLoggedIn ? 'Open Profile' : 'Sign In',
      description: isLoggedIn ? 'Review account and profile details.' : 'Authenticate with Sunset Pulse.',
      href: isLoggedIn ? '/profile' : loginHref,
      group: 'Actions',
      icon: isLoggedIn ? Building2 : LogIn,
      keywords: ['account', 'auth', 'login', 'profile'],
      emphasis: 'blue',
    },
  ];
}

function iconForRoute(href: string) {
  if (href === '/') return Home;
  if (href.includes('play-jamie')) return Gamepad2;
  if (href.includes('command')) return Sparkles;
  if (href.includes('chat') || href.includes('jamie')) return Bot;
  if (href.includes('cart') || href.includes('grill')) return ShoppingBasket;
  if (href.includes('idx') || href.includes('properties') || href.includes('atlas')) return Search;
  return ArrowRight;
}
