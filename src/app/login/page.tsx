import { Suspense } from "react";
import { Boxes } from "lucide-react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Boxes className="size-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">NEXUS Stock</h1>
        <p className="text-sm text-muted-foreground">
          Multi-site inventory control
        </p>
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
