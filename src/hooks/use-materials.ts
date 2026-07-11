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
        // 서버가 반환한 상세 에러 메시지 추출
        let detail = "";
        try {
          const data = await res.json();
          detail = data.error || data.message || "";
          if (data.hint) detail += ` (${data.hint})`;
        } catch {
          detail = await res.text().catch(() => "");
        }
        // 상태 코드별 사용자 친화적 메시지
        let prefix = "업로드 실패";
        if (res.status === 413) prefix = "파일 크기 초과";
        else if (res.status === 400) prefix = "업로드 불가 파일";
        else if (res.status >= 500) prefix = "서버 오류";
        throw new Error(
          `${prefix}${detail ? ` — ${detail}` : ` (HTTP ${res.status})`}`
        );
      }
      return (await res.json()) as UploadResult;
    },
  });
}

/** QR 코드 생성 결과 */
export interface QrGenerateResult extends UploadResult {
  text: string;
  size: number;
}

/** QR 코드 자동 생성 — 텍스트를 인코딩한 PNG 이미지를 서버에서 생성 */
export function useGenerateQr() {
  return useMutation<QrGenerateResult, Error, { text: string; size?: number }>({
    mutationFn: async ({ text, size }) => {
      const res = await fetch(`${BASE}/qr-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, size }),
      });
      if (!res.ok) {
        let detail = "";
        try {
          const data = await res.json();
          detail = data.error || data.detail || "";
        } catch {
          detail = await res.text().catch(() => "");
        }
        const prefix =
          res.status >= 500 ? "서버 오류" : "QR 생성 실패";
        throw new Error(
          `${prefix}${detail ? ` — ${detail}` : ` (HTTP ${res.status})`}`
        );
      }
      return (await res.json()) as QrGenerateResult;
    },
  });
}
