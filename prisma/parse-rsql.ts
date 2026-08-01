// r.sql (MS-SQL dump) 파서 — dbo.r_역사자료관리 → 행 배열
import { readFileSync } from "fs";

export const LEGACY_COLUMNS = [
  "rownum", "church_id", "제목", "제목_관리명", "자료내용구분", "자료내용", "요청일",
  "요청자_id", "요청자", "요청자_관리권한등급", "기증자", "기증자_성별", "기증자_소속",
  "기증자_소속_기타", "기증자_직분직위", "기증자_직분직위_기타", "기증자_휴대폰",
  "기증자_이메일", "기증자_암호", "통신란구분", "통신란입력", "자료수정요청승인여부",
  "처리구분", "보완반려사유", "등록일", "등록번호", "등록자_id", "등록자",
  "file_folder_name", "upload_time", "file_hidden", "file_hidden_eng", "관리파일명",
  "링크", "QR코드_name", "QR코드_date", "자료코드", "소관코드", "수납파일", "자료종류",
  "자료형태", "발행형식", "작성자", "작성일", "발급자코드", "발급자_입력", "수급자코드",
  "수급자_입력", "입수구분", "입수구분_구입_가격", "입수일", "입수처코드", "입수처_입력",
  "용지", "가로", "세로", "높이", "길이", "지름", "쪽", "시", "분", "초", "무게",
  "수량단위_일반_건", "수량단위_일반_개", "수량단위_일반_매", "수량단위_일반_면",
  "수량단위_서책_책", "수량단위_서책_질", "수량단위_서책_권", "용도", "현상", "비고",
  "문서관리등급코드", "관리권한등급", "보존기간등급", "보존기간", "공개범위등급",
  "특별공개대상자_id", "특별공개대상자", "공개시기등급", "공개시기", "create_user",
  "create_name", "create_date", "sysuser", "sysuser_name", "sysdate",
] as const;

export type LegacyRow = Record<(typeof LEGACY_COLUMNS)[number], string | null>;

export function parseRSql(path: string): LegacyRow[] {
  const text = readFileSync(path, "utf8");
  // 첫 'values' 뒤부터 값 목록 시작
  const start = text.indexOf("values");
  const body = text.slice(start + "values".length);

  const rows: LegacyRow[] = [];
  let i = 0;
  const n = body.length;

  while (i < n) {
    // 다음 '(' 찾기 (튜플 시작)
    while (i < n && body[i] !== "(") i++;
    if (i >= n) break;
    i++; // consume '('
    const values: (string | null)[] = [];
    // 튜플 내 값 파싱
    while (i < n) {
      // 공백/콤마 스킵
      while (i < n && (body[i] === " " || body[i] === "\n" || body[i] === "\r" || body[i] === "\t" || body[i] === ",")) i++;
      if (body[i] === ")") { i++; break; }
      // 문자열 N'...' 또는 '...'
      if (body[i] === "N" && body[i + 1] === "'") i++; // skip N
      if (body[i] === "'") {
        i++; // opening quote
        let s = "";
        while (i < n) {
          if (body[i] === "'") {
            if (body[i + 1] === "'") { s += "'"; i += 2; continue; }
            i++; // closing quote
            break;
          }
          s += body[i];
          i++;
        }
        values.push(s);
      } else {
        // null 또는 숫자 (다음 , 또는 )까지)
        let tok = "";
        while (i < n && body[i] !== "," && body[i] !== ")") { tok += body[i]; i++; }
        tok = tok.trim();
        values.push(tok.toLowerCase() === "null" ? null : tok);
      }
    }
    if (values.length === 0) continue;
    const row = {} as LegacyRow;
    LEGACY_COLUMNS.forEach((c, idx) => { row[c] = values[idx] ?? null; });
    rows.push(row);
  }
  return rows;
}

// 직접 실행 시: 분석 리포트
if (require.main === module) {
  const path = process.argv[2] || "/Users/ces/work/교회/r.sql";
  const rows = parseRSql(path);
  console.log("총 행 수:", rows.length);

  const dist = (col: (typeof LEGACY_COLUMNS)[number], top = 15) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const v = r[col] === null ? "<null>" : r[col] === "" ? "<empty>" : r[col]!;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`\n[${col}] distinct=${m.size}`);
    sorted.slice(0, top).forEach(([v, c]) => console.log(`  ${c}\t${v.slice(0, 60)}`));
  };

  dist("자료내용구분");
  dist("공개범위등급");
  dist("처리구분");
  // 자료코드 앞 4자리 분포
  const cls = new Map<string, number>();
  for (const r of rows) {
    const c = (r["자료코드"] ?? "").slice(0, 4) || "<empty>";
    cls.set(c, (cls.get(c) ?? 0) + 1);
  }
  console.log("\n[자료코드 앞4자리]");
  [...cls.entries()].sort((a, b) => b[1] - a[1]).forEach(([v, c]) => console.log(`  ${c}\t${v}`));
  dist("소관코드", 20);
  dist("작성일");
  dist("sysuser_name");
  // 파일 필드 샘플
  console.log("\n[파일 필드 샘플 5건]");
  rows.slice(0, 5).forEach((r) => console.log("  관리파일명:", JSON.stringify(r["관리파일명"]), "| file_hidden:", JSON.stringify(r["file_hidden"]), "| QR:", JSON.stringify(r["QR코드_name"])));
  // 작성일 형식 이상치
  const badDate = rows.filter((r) => r["작성일"] && !/^\d{8}$/.test(r["작성일"]!)).slice(0, 10);
  console.log("\n[작성일 비표준 형식 예:", rows.filter((r) => r["작성일"] && !/^\d{8}$/.test(r["작성일"]!)).length, "건]");
  badDate.forEach((r) => console.log("  ", JSON.stringify(r["작성일"])));
}
