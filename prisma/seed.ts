// 역사자료부 자료이관 시스템 - 시드 데이터
import { PrismaClient } from "@prisma/client";
import { CLASSIFICATIONS, MATERIAL_CHARACTERS } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("시드 데이터 생성 시작...");

  // 기존 데이터 삭제
  await prisma.attachment.deleteMany();
  await prisma.material.deleteMany();

  const sampleTitles = [
    "창립 50주년 기념 예배 순서지",
    "역대 담임목사 이취임 예배 기록",
    "교회 설립 당시 예배당 건축 도면",
    "성가대 찬양 발표회 실황 녹음",
    "주일 대예배 설교 영상 모음",
    "교회 역사 사진전 자료집",
    "기념 패물 - 개척 기념 메달",
    "창립 40주년 기념 예술 작품",
    "장로 피택 감사 예배 순서",
    "교육부 수련회 프로그램 자료",
    "세미나: 한국 교회사 강의록",
    "성전 봉헌 기념 행사 사진",
    "구역 예배 인도자 교재",
    "주보 아카이브 1980년대 모음",
    "교회 행정 회의록 1990년대",
  ];

  const departments = [
    "역사자료부", "사무국", "교육부", "성가대", "선교부", "전도부", "청년부",
  ];

  const modifiers = ["김교역", "이사무", "박역사", "정간사"];
  const baseDate = new Date("2024-01-15");

  const materials = [];
  for (let i = 0; i < sampleTitles.length; i++) {
    const cls = CLASSIFICATIONS[i % CLASSIFICATIONS.length];
    const character = MATERIAL_CHARACTERS[i % MATERIAL_CHARACTERS.length];
    const isPublic = i % 4 !== 0; // 약 1/4은 비공개
    const refDate = new Date(baseDate);
    refDate.setDate(refDate.getDate() + i * 23);
    const isGimul = cls.category === "기물";

    materials.push({
      title: sampleTitles[i],
      content: `<p><strong>${sampleTitles[i]}</strong>에 대한 상세 자료입니다.</p><p>이 자료는 ${cls.label} 분류의 ${character} 자료로, ${departments[i % departments.length]}에서 소관하고 있습니다. 역사자료부에서 보존·관리하고 있으며, 교회 역사 연구와 기록 보존 목적으로 활용됩니다.</p><p>기준일자: ${refDate.toLocaleDateString("ko-KR")}</p>`,
      department: departments[i % departments.length],
      classification: cls.code,
      materialCharacter: character,
      isPublic,
      referenceDate: refDate,
      representativeImg: isGimul || i % 3 === 0 ? `/uploads/representative-${i + 1}.jpg` : null,
      qrImage: isGimul ? `/uploads/qr-${i + 1}.png` : null,
      searchKeywords: `역사, ${cls.label}, ${character}, ${departments[i % departments.length]}`,
      modifier: modifiers[i % modifiers.length],
    });
  }

  // 추가 랜덤 자료 (통계/페이지네이션 확인용)
  for (let i = 0; i < 35; i++) {
    const cls = CLASSIFICATIONS[i % CLASSIFICATIONS.length];
    const character = MATERIAL_CHARACTERS[i % MATERIAL_CHARACTERS.length];
    const refDate = new Date(baseDate);
    refDate.setDate(refDate.getDate() - i * 7);
    materials.push({
      title: `역사 자료 #${1000 + i} - ${cls.label}`,
      content: `<p>역사자료부 보관 자료 ${1000 + i}번입니다. ${cls.label} 분류의 ${character} 자료입니다.</p>`,
      department: departments[i % departments.length],
      classification: cls.code,
      materialCharacter: character,
      isPublic: i % 3 !== 0,
      referenceDate: refDate,
      representativeImg: null,
      qrImage: null,
      searchKeywords: `자료${1000 + i}, ${cls.label}`,
      modifier: modifiers[i % modifiers.length],
    });
  }

  for (const m of materials) {
    await prisma.material.create({ data: m });
  }

  // 일부 자료에 첨부파일 메타데이터 추가
  const allMaterials = await prisma.material.findMany({ take: 8 });
  for (let i = 0; i < allMaterials.length; i++) {
    const m = allMaterials[i];
    const fileTypes = [
      { name: `${m.title}.pdf`, type: "application/pdf", size: 245678 },
      { name: `참고자료.xlsx`, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 89432 },
    ];
    for (const ft of fileTypes) {
      await prisma.attachment.create({
        data: {
          materialId: m.id,
          fileName: ft.name,
          filePath: `/uploads/${ft.name}`,
          fileType: ft.type,
          fileSize: ft.size,
        },
      });
    }
  }

  // 데모 사용자
  await prisma.user.deleteMany();
  await prisma.user.create({
    data: { email: "admin@church.kr", name: "관리자", role: "교역자" },
  });

  const count = await prisma.material.count();
  console.log(`시드 완료: 자료 ${count}건, 첨부파일 생성됨`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
