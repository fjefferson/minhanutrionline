"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";

export default function HomeHeader() {
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const loggedIn = mounted && isAuthenticated();
  const isAdmin = mounted && user?.role === "ADMIN";

  return (
    <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="font-bold text-green-700 text-xl">
          MinhaNutri Online
        </span>

        <div className="flex items-center gap-3">
          {loggedIn ? (
            <>
              <span className="text-sm text-gray-500 hidden sm:block">
                Olá, {user?.name.split(" ")[0]}
              </span>
              <Link
                href={isAdmin ? "/admin" : "/dashboard"}
                className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
              >
                {isAdmin ? "Painel admin" : "Meu painel"}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-green-700 font-medium px-4 py-2"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
              >
                Começar agora
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
