import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions";
import { DEFAULT_AVATAR, type AvatarConfig } from "@/lib/avatar";
import { Peep } from "./Peep";
import { Logo } from "./ui";

export function AppShell({
  children,
  avatar,
  name,
}: {
  children: ReactNode;
  avatar: AvatarConfig | null;
  name: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/75 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-6">
          <Link href="/home" aria-label="Home">
            <Logo compact />
          </Link>
          <div className="ml-auto flex items-center gap-0.5 text-[13px] font-semibold sm:gap-1 sm:text-sm">
            <Link href="/home" className="rounded-full px-2 py-2 text-ink-soft sm:px-3 hover:bg-white hover:text-ink">
              My ideas
            </Link>
            <Link href="/settings" className="rounded-full px-2 py-2 text-ink-soft sm:px-3 hover:bg-white hover:text-ink">
              Settings
            </Link>
            <form action={signOutAction}>
              <button className="cursor-pointer rounded-full px-2 py-2 text-ink-soft sm:px-3 hover:bg-white hover:text-ink">
                Sign out
              </button>
            </form>
            <Link href="/settings#profile" className="ml-1 flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 shadow-soft">
              <Peep config={avatar ?? DEFAULT_AVATAR} size={32} bob={false} ring={false} />
              <span className="hidden max-w-28 truncate sm:inline">{name}</span>
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
