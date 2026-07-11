"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type {
  MaterialListParams,
  MaterialListResponse,
  MaterialRecord,
  StatsResponse,
  MaterialAttachment,
} from "@/lib/constants";

const BASE = "/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.error || data?.message || JSON.stringify(data);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(
      `요청 실패 (${res.status} ${res.statusText})${detail ? ` — ${detail}` : ""}`
    );
  }
  // 204 등 빈 응답 처리
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

function toSearch(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** 자료 목록 조회 */
export function useMaterials(params: MaterialListParams & { enabled?: boolean }) {
  const { enabled = true, ...rest } = params;
  const qs = toSearch(rest);
  return useQuery<MaterialListResponse>({
    queryKey: ["materials", rest],
    queryFn: () => fetchJson<MaterialListResponse>(`${BASE}/materials${qs}`),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** 단건 자료 조회 */
export function useMaterial(
  id: string | null | undefined,
  userRole?: string
) {
  return useQuery<MaterialRecord>({
    queryKey: ["material", id, userRole],
    queryFn: () =>
      fetchJson<MaterialRecord>(
        `${BASE}/materials/${id}${toSearch({ userRole })}`
      ),
    enabled: !!id,
  });
}

/** 대시보드 통계 */
export function useStats(userRole?: string) {
  return useQuery<StatsResponse>({
    queryKey: ["stats", userRole],
    queryFn: () =>
      fetchJson<StatsResponse>(`${BASE}/stats${toSearch({ userRole })}`),
  });
}

export interface MaterialInputBody {
  title: string;
  content: string;
  department: string;
  classification: string;
  materialCharacter: string;
  isPublic: boolean;
  referenceDate: string;
  representativeImg: string | null;
  qrImage: string | null;
  searchKeywords: string | null;
  attachments?: Omit<MaterialAttachment, "id">[];
}

/** 자료 등록 */
export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation<MaterialRecord, Error, MaterialInputBody>({
    mutationFn: (body) =>
      fetchJson<MaterialRecord>(`${BASE}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

/** 자료 수정 */
export function useUpdateMaterial() {
  const qc = useQueryClient();
  return useMutation<MaterialRecord, Error, { id: string; body: MaterialInputBody }>({
    mutationFn: ({ id, body }) =>
      fetchJson<MaterialRecord>(`${BASE}/materials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["material", id] });
    },
  });
}

/** 자료 삭제 */
export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) =>
      fetchJson<{ success: boolean }>(`${BASE}/materials/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export interface UploadResult {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

/** 파일 업로드 */
export function useUploadFile() {
  return useMutation<UploadResult, Error, File>({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${BASE}/upload`, { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`파일 업로드 실패 (${res.status})${text ? ` — ${text}` : ""}`);
      }
      return (await res.json()) as UploadResult;
    },
  });
}
