"use client";

import { useEffect, useRef, useState } from "react";

import { loginWithGoogle } from "@/app/auth-actions";
import { getAuthClient } from "@/lib/supabase/auth-client";
import { Button } from "@/components/ui/button";

/**
 * "Database error saving new user" é o trigger check_allowed_email recusando
 * conta Google que não está na lista de convidados da família.
 */
function amigavel(desc: string): string {
  if (
    /signups? not allowed|database error saving new user|não autorizado/i.test(
      desc,
    )
  ) {
    return "Esta conta Google não está na lista de convidados da família.";
  }
  return desc;
}

function LogoGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29a7.21 7.21 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4.01-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.59 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.61l4.01 3.1C6.22 6.87 8.87 4.76 12 4.76z"
      />
    </svg>
  );
}

export function LoginForm() {
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<"parado" | "indo" | "validando">(
    "parado",
  );
  const finalizando = useRef(false);

  async function finalizar(accessToken: string) {
    if (finalizando.current) return;
    finalizando.current = true;
    setStatus("validando");
    const err = await loginWithGoogle(accessToken);
    if (err) {
      setErro(err);
      setStatus("parado");
      finalizando.current = false;
      void getAuthClient().auth.signOut();
      return;
    }
    window.location.replace("/dashboard");
  }

  // Volta do OAuth: o token (ou o erro) chega no fragmento da URL. O
  // supabase-js consome o token sozinho ao criar o cliente; aqui só
  // esperamos a sessão aparecer e finalizamos no servidor.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const desc =
      hash.get("error_description") ?? query.get("error_description");
    if (desc) {
      setErro(amigavel(desc));
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    if (!hash.has("access_token")) return;

    setStatus("validando");
    const supabase = getAuthClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (sessao) void finalizar(sessao.access_token);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void finalizar(data.session.access_token);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function entrar() {
    setErro(null);
    setStatus("indo");
    const supabase = getAuthClient();

    // Sessão Google já salva neste aparelho → entra sem passar pelo Google.
    const { data } = await supabase.auth.getSession();
    if (data.session) return finalizar(data.session.access_token);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (error) {
      setErro(
        /fetch|network/i.test(error.message)
          ? "Sem conexão — o login precisa de internet."
          : error.message,
      );
      setStatus("parado");
    }
    // Sucesso = navegação para o Google; esta página é substituída.
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full gap-3 text-base"
        onClick={() => void entrar()}
        disabled={status !== "parado"}
      >
        <LogoGoogle />
        {status === "parado" && "Entrar com Google"}
        {status === "indo" && "Abrindo o Google…"}
        {status === "validando" && "Entrando…"}
      </Button>

      {erro ? (
        <p className="text-destructive text-center text-sm" role="alert">
          {erro}
        </p>
      ) : null}

      <p className="text-muted-foreground text-center text-xs">
        Só contas Google convidadas entram — a mesma lista do app de viagens. A
        sessão fica salva por 30 dias neste aparelho.
      </p>
    </div>
  );
}
