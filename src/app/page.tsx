import { Providers } from "@/components/history/providers";
import { AppShell } from "@/components/history/app-shell";

export default function Home() {
  return (
    <Providers>
      <AppShell />
    </Providers>
  );
}
