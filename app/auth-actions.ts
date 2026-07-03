"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/auth";

/**
 * Valida o access token vindo do login Google (Supabase do projeto viagens —
 * só contas convidadas conseguem criar sessão lá) e emite o cookie de sessão
 * próprio do app, que o middleware confere em toda request.
 */
export async function loginWithGoogle(
  accessToken: string,
): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_AUTH_SUPABASE_ANON_KEY;
  if (!url || !key)
    return "Login Google não configurado. Defina NEXT_PUBLIC_AUTH_SUPABASE_URL e NEXT_PUBLIC_AUTH_SUPABASE_ANON_KEY.";

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return "Não foi possível validar a conta Google. Tente de novo.";

  const user = (await res.json()) as { email?: string };
  if (!user.email) return "Conta Google sem e-mail — acesso negado.";

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return null;
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
