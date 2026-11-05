/**
 * Navbar — landing page top navigation.
 */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Stethoscope, Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { label: "Features",    href: "#features"    },
    { label: "How it Works", href: "#how-it-works" },
    { label: "About",       href: "#about"        },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-slate-950/95 backdrop-blur-md shadow-lg" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center">
            <Stethoscope size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">VytalAI</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-slate-300 hover:text-cyan-400 text-sm font-medium transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-semibold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 text-white rounded-lg hover:from-cyan-600 hover:to-indigo-700 transition-all shadow-lg shadow-cyan-500/25"
          >
            Register as Doctor
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-md border-t border-white/10 px-6 py-4 flex flex-col gap-4">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
               className="text-slate-300 hover:text-cyan-400 font-medium transition-colors">
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="text-center py-2.5 text-white border border-white/20 rounded-lg hover:bg-white/10 font-semibold transition-colors">
              Sign In
            </Link>
            <Link to="/signup" onClick={() => setMenuOpen(false)}
                  className="text-center py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white rounded-lg font-semibold">
              Register as Doctor
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
