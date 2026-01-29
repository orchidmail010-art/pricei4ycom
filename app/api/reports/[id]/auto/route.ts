// app/api/reports/[id]/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { processReport } from "@/lib/auto/processReport";

import { updateUserTrust } from "@/lib/auto/elvaluateUserTrust";

if (evaluation) {
  await updateUserTrust(report.user_id, evaluation.success);
}


import { updateProviderTrust } from "@/lib/auto/evaluateProviderTrust";

if (evaluation) {
  await updateProviderTrust(report.provider_id, evaluation.success);
}


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

  // 1) 비즈니스 로직 실행 (상태 변화 예측 및 처리 로직 수행)
  // [중요] processReport 내부에서 실제 DB를 건드린다면, 전/후 스냅샷 로직이 processReport 밖으로 나와야 합니다.
  // 여기서는 processReport가 '계산'만 한다고 가정하거나, 혹은 업데이트 전/후를 여기서 통제합니다.
  
  const { data: before } = await supabase.from("reports").select("id, status, memo").eq("id", id).single();
  if (!before) return NextResponse.json({ ok: false, error: "REPORT_NOT_FOUND" }, { status: 404 });

  const beforeSnapshot: Snapshot = { status: before.status, memo: before.memo };

  // 2) 실제 자동 처리 로직 (상태값 결정)
  const autoResult: any = await processReport(id); 
  const newStatus = autoResult.newStatus ?? "auto_done";

  // 3) DB 업데이트
  const { data: after, error: updateError } = await supabase
    .from("reports")
    .update({
      status: newStatus,
      memo: autoResult.memo ?? beforeSnapshot.memo,
    })
    .eq("id", id)
    .select("id, status, memo")
    .single();

  if (updateError || !after) return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });

  const afterSnapshot: Snapshot = { status: after.status, memo: after.memo };
  const diffSummary = buildDiffSummary(beforeSnapshot, afterSnapshot);

  // 4) 로그 생성
  const { error: logError } = await supabase.from("report_logs").insert({
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

  // 5) [추가] AI/자동화 품질 평가 및 가중치 조절 로직 실행
  // 이 단계에서 시스템의 자동 처리 정확도를 평가하는 로직을 비동기로 실행할 수 있습니다.
  // await evaluateAndAdjustWeights(id, autoResult);

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