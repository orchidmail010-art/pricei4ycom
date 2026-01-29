import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { processReport } from "@/lib/auto/processReport";
import { updateUserTrust } from "@/lib/auto/elvaluateUserTrust"; // 파일명 오타 유지
import { updateProviderTrust } from "@/lib/auto/evaluateProviderTrust";

const SYSTEM_ADMIN_ID = "864ab2c9-0b66-421e-a170-c5f9996966e6";

type Snapshot = {
  status: string | null;
  memo: string | null;
};

function buildDiffSummary(before: Snapshot, after: Snapshot): string {
  const changes: string[] = [];
  if ((before.memo || "") !== (after.memo || "")) changes.push("메모 변경");
  if (before.status !== after.status) {
    changes.push(`상태(${before.status ?? "-"}→${after.status ?? "-"})`);
  }
  return changes.length === 0 ? "변경된 항목 없음" : changes.join(", ");
}

async function handleAutoProcess(req: NextRequest, context: any) {
  const params = await context.params;
  const id = Number(params.id);

  if (!id || isNaN(id)) return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 400 });

  const supabase = supabaseServer();

  // 1) 기존 데이터 조회
  const { data: report } = await supabase.from("reports").select("*").eq("id", id).single();
  if (!report) return NextResponse.json({ ok: false, error: "REPORT_NOT_FOUND" }, { status: 404 });

  const beforeSnapshot: Snapshot = { status: report.status, memo: report.memo };

  // 2) 실제 자동 처리 로직 실행
  const autoResult: any = await processReport(id); 
  const newStatus = autoResult.newStatus ?? "auto_done";

  // 3) DB 업데이트
  const { data: after, error: updateError } = await supabase
    .from("reports")
    .update({
      status: newStatus,
      memo: autoResult.memo ?? report.memo,
    })
    .eq("id", id)
    .select("id, status, memo")
    .single();

  if (updateError || !after) return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });

  const afterSnapshot: Snapshot = { status: after.status, memo: after.memo };
  const diffSummary = buildDiffSummary(beforeSnapshot, afterSnapshot);

  // 4) [중요] 신뢰도 업데이트 로직 (함수 내부로 이동 및 변수 수정)
  // autoResult 안에 평가 결과가 있다고 가정하고 처리합니다.
  if (autoResult.evaluate) {
    await updateUserTrust(report.user_id, autoResult.evaluate.success);
    await updateProviderTrust(report.provider_id, autoResult.evaluate.success);
  }

  // 5) 로그 생성
  await supabase.from("report_logs").insert({
    report_id: id,
    admin_id: autoResult.adminId ?? SYSTEM_ADMIN_ID,
    old_status: beforeSnapshot.status,
    new_status: afterSnapshot.status,
    reason: autoResult.reason ?? "자동 처리",
    auto: true,
    auto_detail: {
      ...autoResult.auto_detail,
      before: beforeSnapshot,
      after: afterSnapshot,
      diff_summary: diffSummary,
    },
  });

  return NextResponse.json({
    ok: true,
    status: afterSnapshot.status,
    diffSummary,
    before: beforeSnapshot,
    after: afterSnapshot,
  });
}

export async function POST(req: NextRequest, context: any) { return handleAutoProcess(req, context); }
export async function GET(req: NextRequest, context: any) { return handleAutoProcess(req, context); }