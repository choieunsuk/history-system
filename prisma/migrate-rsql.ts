// r.sql(MS-SQL dbo.r_역사자료관리) → Prisma(SQLite) 실데이터 마이그레이션
// 실행: bunx tsx prisma/migrate-rsql.ts [경로]
import { PrismaClient } from "@prisma/client";
import { parseRSql, type LegacyRow } from "./parse-rsql";
import { CLASSIFICATION_MAP } from "../src/lib/constants";

const prisma = new PrismaClient();
const SRC = process.argv[2] || "/Users/ces/work/교회/r.sql";

const empt = (v: string | null) => v === null || v.trim() === "";

// HTML 이스케이프
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 자료내용(%%% 구분) → HTML 문단
function toHtml(raw: string | null, fallback: string): string {
  if (empt(raw)) return `<p>${esc(fallback)}</p>`;
  const parts = raw!
    .split("%%%")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return `<p>${esc(fallback)}</p>`;
  return parts.map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`).join("");
}

// 작성일: yyyymmdd / yyyymm / yyyy → Date (없으면 null)
function parseRefDate(v: string | null): Date | null {
  if (empt(v)) return null;
  const d = v!.replace(/[^0-9]/g, "");
  let y = 0, mo = 1, day = 1;
  if (d.length >= 8) { y = +d.slice(0, 4); mo = +d.slice(4, 6); day = +d.slice(6, 8); }
  else if (d.length === 6) { y = +d.slice(0, 4); mo = +d.slice(4, 6); }
  else if (d.length === 4) { y = +d.slice(0, 4); }
  else return null;
  if (y < 1800 || y > 2100) return null;
  if (mo < 1 || mo > 12) mo = 1;
  if (day < 1 || day > 31) day = 1;
  const dt = new Date(Date.UTC(y, mo - 1, day));
  return isNaN(dt.getTime()) ? null : dt;
}

// create_date / sysdate ('2014-02-16 11:55:00.450') → Date
function parseTs(v: string | null): Date | null {
  if (empt(v)) return null;
  const dt = new Date(v!.replace(" ", "T"));
  return isNaN(dt.getTime()) ? null : dt;
}

// 자료코드 앞 4자리 → 분류코드
function toClassification(자료코드: string | null): string {
  const c = (자료코드 ?? "").slice(0, 4);
  const remap: Record<string, string> = { "0100": "0102", "0200": "0201" };
  const code = remap[c] ?? c;
  return CLASSIFICATION_MAP[code] ? code : "0102";
}

// 자료내용구분 → 자료성격
function toCharacter(v: string | null): string {
  const s = (v ?? "").trim();
  if (s === "일반") return "일반";
  if (s === "예배설교교육회의") return "예배/설교";
  return "일반";
}

// 공개범위등급 → 공개여부 (등급 높을수록 공개, 빈값 기본 공개)
function toPublic(v: string | null): boolean {
  if (empt(v)) return true;
  const g = parseInt(v!, 10);
  return isNaN(g) ? true : g >= 3;
}

const MIME: Record<string, string> = {
  pdf: "application/pdf", hwp: "application/x-hwp", jpg: "image/jpeg", jpeg: "image/jpeg",
  png: "image/png", gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
  tif: "image/tiff", tiff: "image/tiff", thm: "image/jpeg",
  mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg", flac: "audio/flac",
  mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo", mkv: "video/x-matroska",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain", htm: "text/html", html: "text/html", zip: "application/zip", db: "application/octet-stream",
};
const IMG_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "tif", "tiff"]);

function extOf(name: string): string {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

interface ParsedFile { fileName: string; fileSize: number; }
// '관리파일명' → 파일 목록 (구분자 | ; ,  → name:size)
function parseFiles(v: string | null): ParsedFile[] {
  if (empt(v)) return [];
  const out: ParsedFile[] = [];
  for (const part of v!.split(/[|;]/)) {
    const p = part.trim();
    if (!p) continue;
    // 마지막 ':숫자' 를 크기로 분리 (파일명에 콤마 포함 가능)
    const m = p.match(/^(.*):(\d+)$/);
    if (m) out.push({ fileName: m[1].trim(), fileSize: parseInt(m[2], 10) || 0 });
    else out.push({ fileName: p, fileSize: 0 });
  }
  return out.filter((f) => f.fileName.length > 0);
}

async function main() {
  console.log("r.sql 파싱 중...");
  const rows: LegacyRow[] = parseRSql(SRC);
  console.log(`파싱된 레거시 행: ${rows.length}`);

  console.log("기존 데이터 삭제...");
  await prisma.attachment.deleteMany();
  await prisma.material.deleteMany();

  const materials: any[] = [];
  const attachments: any[] = [];
  const modifiedById: { id: string; ts: Date }[] = [];

  for (const r of rows) {
    const id = `legacy-${r["rownum"]}`;
    const createdAt = parseTs(r["create_date"]) ?? parseTs(r["sysdate"]) ?? new Date();
    const refDate = parseRefDate(r["작성일"]) ?? createdAt;

    const files = parseFiles(r["관리파일명"]);
    const firstImg = files.find((f) => IMG_EXT.has(extOf(f.fileName)));
    let representativeImg: string | null = firstImg ? `/uploads/legacy/${firstImg.fileName}` : null;

    // QR (기물자료) — 존재 시
    const qr = empt(r["QR코드_name"]) ? null : `/uploads/legacy/${r["QR코드_name"]!.trim()}`;

    // 검색 키워드: 제목_관리명 + 비고
    const kw = [r["제목_관리명"], r["비고"]].filter((x) => !empt(x)).map((x) => x!.trim());
    const searchKeywords = kw.length ? kw.join(", ") : null;

    materials.push({
      id,
      title: r["제목"]!.trim() || "(제목 없음)",
      content: toHtml(r["자료내용"], r["제목"] ?? ""),
      department: (r["소관코드"] ?? "").trim() || "미분류",
      classification: toClassification(r["자료코드"]),
      materialCharacter: toCharacter(r["자료내용구분"]),
      isPublic: toPublic(r["공개범위등급"]),
      referenceDate: refDate,
      representativeImg,
      qrImage: qr,
      searchKeywords,
      modifier: (r["sysuser_name"] ?? r["create_name"] ?? "").trim() || "시스템",
      createdAt,
    });

    const modTs = parseTs(r["sysdate"]) ?? createdAt;
    modifiedById.push({ id, ts: modTs });

    for (const f of files) {
      const ext = extOf(f.fileName);
      attachments.push({
        materialId: id,
        fileName: f.fileName,
        filePath: `/uploads/legacy/${f.fileName}`,
        fileType: MIME[ext] ?? "application/octet-stream",
        fileSize: f.fileSize,
        createdAt,
      });
    }
  }

  console.log(`자료 ${materials.length}건 삽입 중...`);
  const BATCH = 500;
  for (let i = 0; i < materials.length; i += BATCH) {
    await prisma.material.createMany({ data: materials.slice(i, i + BATCH) });
  }

  console.log(`첨부파일 ${attachments.length}건 삽입 중...`);
  for (let i = 0; i < attachments.length; i += BATCH) {
    await prisma.attachment.createMany({ data: attachments.slice(i, i + BATCH) });
  }

  // modifiedDate(@updatedAt)는 create 시 now로 덮어써지므로 sysdate로 복원
  console.log("수정일(modifiedDate) 복원 중...");
  await prisma.$transaction(
    modifiedById.map((m) =>
      prisma.$executeRaw`UPDATE Material SET modifiedDate = ${m.ts.toISOString()} WHERE id = ${m.id}`
    )
  );

  // 검증
  const mCount = await prisma.material.count();
  const aCount = await prisma.attachment.count();
  const pub = await prisma.material.count({ where: { isPublic: true } });
  const clsGroups = await prisma.material.groupBy({ by: ["classification"], _count: true });
  console.log("\n=== 마이그레이션 완료 ===");
  console.log(`자료: ${mCount}건 (공개 ${pub} / 비공개 ${mCount - pub})`);
  console.log(`첨부파일: ${aCount}건`);
  console.log("분류별:", clsGroups.map((g) => `${g.classification}=${g._count}`).join(", "));
  const sample = await prisma.material.findFirst({ include: { attachments: true }, orderBy: { createdAt: "asc" } });
  console.log("\n샘플:", JSON.stringify({ ...sample, content: sample?.content.slice(0, 80) + "..." }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
