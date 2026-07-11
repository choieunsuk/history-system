"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * 클라이언트 전역 Provider 묶음.
 * - React Query (서버 상태)
 * - Tooltip provider (shadcn tooltips)
 * - Sonner Toaster (토스트 알림)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={200}>
        {children}
        <SonnerToaster
          richColors
          position="top-center"
          toastOptions={{
            style: {
              fontFamily:
                "var(--font-geist-sans), system-ui, sans-serif",
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
