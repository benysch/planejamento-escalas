import { House } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="bg-muted/40 flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="bg-foreground text-background mb-2 flex size-12 items-center justify-center rounded-xl">
            <House className="size-6" strokeWidth={1.75} />
          </div>
          <CardTitle>Planejamento &amp; Escalas</CardTitle>
          <CardDescription>
            Acesso restrito — entre com a conta Google da família.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
