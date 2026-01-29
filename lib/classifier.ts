// /lib/classifier.ts
export function autoClassify(content: string): string {
  const text = content.toLowerCase();

  if (text.includes("가격") || text.includes("비용") || text.includes("요금")) {
    return "가격 오류";
  }

  if (text.includes("주소") || text.includes("위치") || text.includes("옮겼") || text.includes("이사")) {
    return "정보 수정";
  }

  if (text.includes("시간") || text.includes("휴무") || text.includes("진료")) {
    return "운영 정보 변경";
  }

  return "기타";
}
