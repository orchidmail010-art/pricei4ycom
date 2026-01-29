// app/reports/api/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = supabaseServer();

  const { searchParams } = new URL(req.url);

  // filter: all | auto | completed
  const filter = searchParams.get("filter") || "all";

  // sort: latest | priority
  const sort = searchParams.get("sort") || "latest";

  try {
    let query = supabase
      .from("reports")
      .select(
        `
        id,
        category,
        status,
        priority,
        content,
        created_at,
        updated_at,
        provider:providers(name)
      `)
      .eq("is_active", true); // ✅ 여기에 추가: 운영 중인 데이터만 가져옴
      

    // -----------------------------
    // 필터 적용
    // -----------------------------
    if (filter === "auto") {
      // 🔸 자동 처리 가능: 임시로 'pending' 상태만 보이게
      // 필요하면 나중에 조건 바꿔도 됨
      query = query.eq("status", "pending");
    } else if (filter === "completed") {
      // 🔸 처리 완료: 수동 완료 + 자동 완료 둘 다
      query = query.in("status", ["completed", "auto_done"]);
    }
    // filter === "all" 이면 필터 없음

    // -----------------------------
    // 기본 정렬: 최신순 (updated_at 없으면 created_at 기준)
    // -----------------------------
    if (sort === "latest") {
      query = query.order("updated_at", { ascending: false, nullsFirst: false });
    } else {
      // priority 정렬인 경우에도 일단 updated_at desc 로 기본 정렬
      query = query.order("updated_at", { ascending: false, nullsFirst: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ /reports/api 쿼리 에러:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    let result = data ?? [];

    // -----------------------------
    // 우선순위 정렬 (HIGH > NORMAL > LOW)
    // -----------------------------
    if (sort === "priority") {
      const weight: Record<string, number> = {
        high: 3,
        normal: 2,
        low: 1,
      };

      result = [...result].sort(
        (a: any, b: any) =>
          (weight[b.priority] || 0) - (weight[a.priority] || 0)
      );
    }

    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    console.error("❌ /reports/api 알 수 없는 에러:", e);
    return NextResponse.json(
      { ok: false, error: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
