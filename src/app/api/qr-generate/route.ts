// 역사자료부 자료이관 시스템 - QR 코드 자동 생성 API
// 기물 자료 등록 시 자료 식별용 QR 코드를 서버에서 생성
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_TEXT_LENGTH = 2048; // QR 코드에 인코딩할 텍스트 최대 길이

/**
 * POST /api/qr-generate
 * Body: { text: string, size?: number }
 * 응답: { url, fileName, fileType, fileSize, text }
 *
 * - text: QR 코드에 인코딩할 내용 (자료 ID, URL, 텍스트 등)
 * - size: 이미지 픽셀 크기 (기본 320, 범위 128~1024)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.text !== "string") {
      return NextResponse.json(
        { error: "text 필드가 필요합니다. (QR에 인코딩할 내용)" },
        { status: 400 }
      );
    }

    const text = body.text.trim();
    if (!text) {
      return NextResponse.json(
        { error: "빈 텍스트는 QR 코드로 생성할 수 없습니다." },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error: `텍스트가 너무 깁니다. (최대 ${MAX_TEXT_LENGTH}자, 현재 ${text.length}자)`,
        },
        { status: 400 }
      );
    }

    // 이미지 크기 (기본 320px, 128~1024 범위)
    const requestedSize = Number(body.size) || 320;
    const size = Math.max(128, Math.min(1024, Math.round(requestedSize)));

    // 업로드 디렉토리 보증
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // QR 코드 PNG 버퍼 생성
    // - errorCorrectionLevel: 'M' (15% 복구율, 일반적 용도)
    // - margin: 2 (최소 여백, 스캔 안정성)
    // - width: 요청 크기
    const pngBuffer = await QRCode.toBuffer(text, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 2,
      width: size,
      color: {
        dark: "#1c1917", // stone-900 (warm black, 인쇄 선명)
        light: "#ffffff", // 흰 배경
      },
    });

    const uuid = crypto.randomUUID();
    const storedName = `qr-${uuid}.png`;
    const storedPath = path.join(UPLOAD_DIR, storedName);
    await fs.writeFile(storedPath, pngBuffer);

    // 저장 검증
    const stat = await fs.stat(storedPath).catch(() => null);
    if (!stat || stat.size !== pngBuffer.length) {
      await fs.unlink(storedPath).catch(() => {});
      return NextResponse.json(
        { error: "QR 이미지 저장 검증에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        url: `/uploads/${storedName}`,
        fileName: storedName,
        fileType: "image/png",
        fileSize: pngBuffer.length,
        text,
        size,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/qr-generate] error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "QR 코드 생성 중 오류가 발생했습니다.",
        detail: msg,
      },
      { status: 500 }
    );
  }
}
