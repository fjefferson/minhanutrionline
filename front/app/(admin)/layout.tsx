"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import Sidebar from "@/components/layout/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (user?.role !== "ADMIN") router.push("/dashboard");
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated() || user?.role !== "ADMIN") return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 pt-14 md:pt-0 p-4 sm:p-6 md:p-8 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
