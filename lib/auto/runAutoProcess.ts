// 📌 경로: /lib/auto/runAutoProcess.ts
import { supabaseServer } from "@/lib/supabase/server";

// ---------------------------------------------------
// 자동 처리(Auto Process) + Diff 생성 + DB 저장
// ---------------------------------------------------
export async function runAutoProcess(reportId: number) {
  const supabase = supabaseServer();

  //
  // 1) 신고 데이터 조회
  //
  const { data: report, error: loadErr } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (loadErr || !report) {
    return { ok: false, message: "신고 데이터 조회 실패" };
  }

  //
  // 2) 기존(before) → 신규(after) 비교용 데이터 생성
  //
  // ⚠ 만약 실제 분석 로직이 있다면 여기에 대입 (지금은 테스트용)
  const before_json = report.before_json || {
    price: 12000,
    duration: 20,
    memo: "기존 내용",
  };

  const after_json = {
    price: 18000,
    duration: 25,
    memo: "자동 분석 후 변경됨",
  };

  //
  // 3) Diff summary 생성
  //
  const changes = [];

  if (before_json.price !== after_json.price) {
    changes.push(`가격(${before_json.price} → ${after_json.price})`);
  }

  if (before_json.duration !== after_json.duration) {
    changes.push(`시간(${before_json.duration}분 → ${after_json.duration}분)`);
  }

  if (before_json.memo !== after_json.memo) {
    changes.push(`메모 변경됨`);
  }

  const diff_summary =
    changes.length > 0 ? changes.join(", ") : "변경 사항 없음";

  //
  // 4) DB 업데이트: before/after + 요약(diff_summary)
  //
  const { error: updateErr } = await supabase
    .from("reports")
    .update({
      before_json: before_json,
      after_json: after_json,
      diff_summary: diff_summary,
      updated_at: new Date(),
    })
    .eq("id", reportId);

  if (updateErr) {
    return { ok: false, message: "DB 업데이트 실패", error: updateErr };
  }

  //
  // 5) 최종 응답
  //
  return {
    ok: true,
    reportId,
    diff_summary,
    before_json,
    after_json,
  };
}

