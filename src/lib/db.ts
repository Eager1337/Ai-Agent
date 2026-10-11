import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type CaseRow = T["cases"]["Row"];
export type AgentRow = T["agents"]["Row"];
export type ThreadRow = T["threads"]["Row"];
export type ProjectRow = T["projects"]["Row"];
export type NoteRow = T["notes"]["Row"];

const ok = <D,>(r: { data: D | null; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data as D;
};

export const useCases = () =>
  useQuery({ queryKey: ["cases"], queryFn: async () => ok(await supabase.from("cases").select("*").order("created_at", { ascending: false })) });

export const useAudit = (caseId?: string) =>
  useQuery({
    queryKey: ["audit", caseId], enabled: !!caseId,
    queryFn: async () => ok(await supabase.from("case_audit").select("*").eq("case_id", caseId!).order("created_at", { ascending: false })),
  });

export const useAgents = () =>
  useQuery({ queryKey: ["agents"], queryFn: async () => ok(await supabase.from("agents").select("*").order("created_at")) });

export const useThreads = (agentId?: string) =>
  useQuery({
    queryKey: ["threads", agentId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("threads").select("*").order("updated_at", { ascending: false });
      if (agentId) q = q.eq("agent_id", agentId);
      return ok(await q);
    },
  });

export const useProjects = () =>
  useQuery({ queryKey: ["projects"], queryFn: async () => ok(await supabase.from("projects").select("*").order("created_at", { ascending: false })) });

export const useNotes = () =>
  useQuery({ queryKey: ["notes"], queryFn: async () => ok(await supabase.from("notes").select("*").order("created_at", { ascending: false })) });

export type CaseItemRow = T["case_items"]["Row"];
export type ApiKeyRow = T["api_keys"]["Row"];

export const useCaseItems = (caseId?: string) =>
  useQuery({
    queryKey: ["case_items", caseId], enabled: !!caseId,
    queryFn: async () => ok(await supabase.from("case_items").select("*").eq("case_id", caseId!).order("created_at", { ascending: false })),
  });

export const useApiKeys = () =>
  useQuery({ queryKey: ["api_keys"], queryFn: async () => ok(await supabase.from("api_keys").select("id, name, prefix, agent_ids, last_used_at, revoked_at, created_at, user_id, key_hash").order("created_at", { ascending: false })) });

export function useInsert<K extends "cases" | "case_audit" | "agents" | "threads" | "projects" | "notes" | "case_items" | "api_keys">(table: K, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: T[K]["Insert"]) => ok(await supabase.from(table).insert(row as never).select().single()) as T[K]["Row"],
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useDelete(table: "notes" | "projects" | "threads" | "agents" | "case_items", invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { ok(await supabase.from(table).delete().eq("id", id)); },
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useRevokeKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { ok(await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id)); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api_keys"] }),
  });
}
