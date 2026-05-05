"use client";

import Link from "next/link";
import Image from "next/image";
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-2">
        <Link href="/">
          <Image
            src="/images/logo.png"
            alt="MinhaNutri Online"
            width={200}
            height={56}
            className="h-[72px] w-auto object-contain"
            priority
          />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {loggedIn ? (
            <>
              <span className="text-sm text-gray-500 hidden sm:block">
                Olá, {user?.name.split(" ")[0]}
              </span>
              <Link
                href={isAdmin ? "/admin" : "/dashboard"}
                className="text-sm bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition whitespace-nowrap"
              >
                {isAdmin ? "Painel admin" : "Meu painel"}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-green-700 font-medium px-3 py-2"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="text-sm bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition whitespace-nowrap"
              >
                <span className="hidden sm:inline">Começar agora</span>
                <span className="sm:hidden">Começar</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
