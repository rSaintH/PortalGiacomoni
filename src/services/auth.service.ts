import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { normalizeRole } from "@/services/permissions.logic";

// ── Types ──

export interface UserRoleInfo {
  role: string;
  isAdmin: boolean;
}

export interface UserProfileInfo {
  sectorId: string | null;
  mustChangePassword: boolean;
}

export interface AuthSessionResult {
  session: Session | null;
}

// ── Session ──

export async function getAuthSession(): Promise<AuthSessionResult> {
  const { data: { session } } = await supabase.auth.getSession();
  return { session };
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}

// ── User role & profile ──

export async function fetchUserRole(userId: string): Promise<UserRoleInfo> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  const role = normalizeRole(data?.role);
  return { role, isAdmin: role === "admin" };
}

export async function fetchUserProfile(userId: string): Promise<UserProfileInfo> {
  const { data } = await supabase
    .from("profiles")
    .select("sector_id, must_change_password")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    sectorId: data?.sector_id ?? null,
    mustChangePassword: data?.must_change_password ?? false,
  };
}

// ── Auth actions ──

const ALLOWED_DOMAIN = "@giacomoni.com.br";

export function validateEmailDomain(email: string): string | null {
  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    return `Apenas e-mails ${ALLOWED_DOMAIN} podem acessar o sistema.`;
  }
  return null;
}

export async function signIn(email: string, password: string): Promise<{ error: Error | null }> {
  const domainError = validateEmailDomain(email);
  if (domainError) return { error: new Error(domainError) };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error as Error | null };
}

export async function signUp(email: string, password: string, fullName: string): Promise<{ error: Error | null }> {
  if (!email.endsWith(ALLOWED_DOMAIN)) {
    return { error: new Error(`Apenas e-mails ${ALLOWED_DOMAIN} podem se registrar.`) };
  }
  try {
    const { data, error: fnError } = await supabase.functions.invoke("register-user", {
      body: { email, password, full_name: fullName },
    });
    const dataError = data && typeof data === "object" && "error" in data ? (data as { error?: string }).error : undefined;
    let contextError: string | undefined;
    if (fnError && typeof fnError === "object" && "context" in fnError) {
      const maybeContext = (fnError as { context?: unknown }).context;
      if (maybeContext && typeof maybeContext === "object" && "json" in maybeContext) {
        const jsonFn = (maybeContext as { json?: unknown }).json;
        if (typeof jsonFn === "function") {
          try {
            const body = await (jsonFn as () => Promise<unknown>)();
            if (body && typeof body === "object" && "error" in body) {
              contextError = (body as { error?: string }).error;
            }
          } catch {
            // Ignore context parse errors and fallback to generic message.
          }
        }
      }
    }

    if (fnError || dataError) {
      return { error: new Error(dataError || contextError || fnError?.message || "Erro ao criar conta") };
    }
    return { error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro ao criar conta";
    return { error: new Error(message) };
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error("Sign out error:", e);
  }
}

// ── Password ──

export async function changePasswordAndClearFlag(userId: string | undefined, newPassword: string) {
  const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
  if (passwordError) throw passwordError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("user_id", userId);
  if (profileError) throw profileError;
}
