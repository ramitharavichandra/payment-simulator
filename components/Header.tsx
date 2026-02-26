"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard",    label: "Dashboard"    },
    { href: "/payment",      label: "Make Payment" },
    { href: "/check-status", label: "Check Status" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&display=swap');

        .header {
          font-family: 'Syne', sans-serif;
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 36px; height: 64px;
          background: rgba(8,8,16,0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(139,92,246,0.12);
        }

        .header-logo {
          display: flex; align-items: center; gap: 10px;
          font-size: 18px; font-weight: 800; letter-spacing: -0.5px;
          color: #e2e2f0; text-decoration: none;
        }
        .logo-icon {
          width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; box-shadow: 0 4px 14px rgba(139,92,246,0.4);
        }
        .logo-accent { color: #8b5cf6; }

        .header-nav { display: flex; align-items: center; gap: 4px; }

        .nav-link {
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 600; letter-spacing: 0.2px;
          padding: 8px 16px; border-radius: 9px;
          color: #71717a; text-decoration: none;
          transition: all 0.2s; border: 1px solid transparent;
        }
        .nav-link:hover { color: #c4b5fd; background: rgba(139,92,246,0.08); }
        .nav-link.active {
          color: #c4b5fd;
          background: rgba(139,92,246,0.12);
          border-color: rgba(139,92,246,0.25);
        }
        .nav-link.cta {
          color: #fff;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          border-color: transparent;
          box-shadow: 0 4px 14px rgba(139,92,246,0.3);
        }
        .nav-link.cta:hover {
          color: #fff;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(139,92,246,0.45);
        }
      `}</style>

      <header className="header">
        <Link href="/dashboard" className="header-logo">
          Pay<span className="logo-accent">Sim</span>
        </Link>

        <nav className="header-nav">
          {links.map(({ href, label }) => {
            const isCta = href === "/payment";
            const isActive = !isCta && pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link ${isCta ? "cta" : isActive ? "active" : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
