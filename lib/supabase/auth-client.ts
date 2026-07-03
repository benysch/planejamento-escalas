"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Cliente Supabase usado SÓ para o login Google (projeto "viagens" — mesma
 * conta e mesma lista de convidados da família). Os dados do app continuam
 * server-side, em outro projeto Supabase (lib/supabase/server.ts).
 */
export function getAuthClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_AUTH_SUPABASE_ANON_KEY;
    if (!url || !key)
      throw new Error(
        "Login Google não configurado — defina NEXT_PUBLIC_AUTH_SUPABASE_URL e NEXT_PUBLIC_AUTH_SUPABASE_ANON_KEY.",
      );
    client = createClient(url, key);
  }
  return client;
}
