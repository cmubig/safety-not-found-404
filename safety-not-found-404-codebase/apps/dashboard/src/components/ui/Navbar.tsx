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
    <nav className={`w-full z-50 transition-colors duration-300 ${isHome ? "fixed top-0 bg-transparent" : "sticky top-0 border-b border-neutral-800 bg-[#0a0a0a]"}`}>
      <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-white tracking-tight mr-4">
            Safety Not Found 404
          </Link>
          <div className="flex gap-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive && !isHome
                      ? "bg-white text-black"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800"
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
