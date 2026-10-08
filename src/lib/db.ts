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

export function useInsert<K extends "cases" | "case_audit" | "agents" | "threads" | "projects" | "notes">(table: K, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: T[K]["Insert"]) => ok(await supabase.from(table).insert(row as never).select().single()) as T[K]["Row"],
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useDelete(table: "notes" | "projects" | "threads" | "agents", invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { ok(await supabase.from(table).delete().eq("id", id)); },
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}
