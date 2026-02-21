"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const navItems = [
    { name: "Dashboard", href: "/app" },
    { name: "Developer Docs", href: "/docs" },
  ];

  return (
    <nav
      className={`w-full z-50 transition-colors duration-300 ${
        isHome
          ? "fixed top-0 bg-transparent"
          : "sticky top-0 border-b border-[var(--line-soft)] bg-[rgba(8,12,20,0.76)] backdrop-blur-xl"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <Link href="/" className="font-semibold text-[var(--fg-primary)] tracking-tight mr-1 sm:mr-4 truncate">
            Safety Not Found 404
          </Link>
          <div className="flex gap-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    isActive && !isHome
                      ? "bg-[var(--accent-cyan)] text-[#07121e] border-transparent"
                      : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[rgba(17,29,46,0.65)]"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
