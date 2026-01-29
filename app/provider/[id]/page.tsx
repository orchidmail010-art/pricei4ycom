"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  FormEvent,
  useRef,
  useMemo,
} from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
const supabase = supabaseBrowser();

import { MapPin, Phone, ArrowLeft, Star, LogIn } from "lucide-react";

export default function ProviderDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [provider, setProvider] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]); // 🔹 비급여 가격 리스트
  const [imageSrc, setImageSrc] = useState("/images/default-hospital.jpg");
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [reportTarget, setReportTarget] = useState<any>(null);
  const [reportReason, setReportReason] = useState("");

  const [activeTab, setActiveTab] = useState<"info" | "review">("info");

  const [newReview, setNewReview] = useState({
    username: "",
    rating: 0,
    comment: "",
  });
  const [editingReview, setEditingReview] = useState<any>(null);

  const [visibleCount, setVisibleCount] = useState(5);
  const [sortOrder, setSortOrder] = useState<
    "newest" | "high" | "low" | "like"
  >("newest");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  /* ================================
      1) 병원 정보 + 가격 + 후기 불러오기
  ==================================*/
  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("provider_id", Number(id))
      .order("created_at", { ascending: false });

    setReviews(data || []);
  };

  const fetchPrices = async () => {
    const { data, error } = await supabase
      .from("prices_with_names") // 실제 쓰는 뷰/테이블명
      .select("*")
      .eq("provider_id", Number(id))
      .order("service_name", { ascending: true });

    if (error) {
      console.error("❌ 비급여 가격 조회 실패", error);
      setPrices([]);
    } else {
      setPrices(data || []);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: providerData } = await supabase
        .from("providers")
        .select("*")
        .eq("id", Number(id))
        .single();

      setProvider(providerData);
      setLoading(false);

      // 이미지
      const ts = Date.now();
      const customPath = `/images/hospital-${providerData.id}.jpg?v=${ts}`;
      const img = new Image();
      img.src = customPath;
      img.onload = () => setImageSrc(customPath);
      img.onerror = () =>
        setImageSrc(`/images/default-hospital.jpg?v=${ts}`);

      await Promise.all([fetchReviews(), fetchPrices()]);
    };
    if (id) fetchData();
  }, [id]);

  /* ================================
      2) 로그인 + 프로필 불러오기
  ==================================*/
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user || null;

      setUser(u);

      if (!u) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();

      if (!p) {
        const nickname = u.email?.split("@")[0] || "사용자";
        await supabase.from("profiles").insert({
          id: u.id,
          nickname,
          avatar_url: null,
        });

        setProfile({ nickname, avatar_url: null });
        setNewReview((prev) => ({ ...prev, username: nickname }));
      } else {
        setProfile(p);
        setNewReview((prev) => ({ ...prev, username: p.nickname }));
      }
    };

    loadUser();
  }, []);

  /* ================================
      3) 실시간 리뷰 구독
  ==================================*/
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`reviews_channel_${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `provider_id=eq.${id}`,
        },
        async () => {
          console.log("🔄 리뷰 실시간 갱신");
          await fetchReviews();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  /* ================================
      4) 무한스크롤
  ==================================*/
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) =>
          prev + 5 <= reviews.length ? prev + 5 : reviews.length
        );
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [reviews]);

  /* ================================
      5) 후기 작성 & 수정
  ==================================*/
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!newReview.rating || !newReview.comment.trim()) {
      alert("별점과 내용을 입력해주세요.");
      return;
    }

    if (!user) {
      alert("로그인 후 이용 가능합니다.");
      return;
    }

    if (editingReview) {
      await supabase
        .from("reviews")
        .update({
          rating: newReview.rating,
          comment: newReview.comment,
        })
        .eq("id", editingReview.id)
        .eq("user_id", user.id);

      setEditingReview(null);
      alert("후기가 수정되었습니다.");
    } else {
      await supabase.from("reviews").insert({
        provider_id: Number(id),
        username: newReview.username,
        rating: newReview.rating,
        comment: newReview.comment,
        user_id: user.id,
        like_count: 0,
      });

      alert("후기가 등록되었습니다.");
    }

    setNewReview({ username: newReview.username, rating: 0, comment: "" });
  };

  /* ================================
      6) 좋아요 기능
  ==================================*/
  const handleLike = async (reviewId: number) => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      return;
    }

    const { data: liked } = await supabase
      .from("review_likes")
      .select("*")
      .eq("review_id", reviewId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (liked) {
      alert("이미 추천하셨습니다.");
      return;
    }

    await supabase.from("review_likes").insert({
      review_id: reviewId,
      user_id: user.id,
    });

    await supabase.rpc("increment_like_count", { review_id: reviewId });

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, like_count: (r.like_count || 0) + 1 }
          : r
      )
    );
  };

  /* ================================
      7) 정렬 + 필터
  ==================================*/
  const filteredReviews = useMemo(() => {
    let arr = [...reviews];

    if (ratingFilter !== null) {
      if (ratingFilter === 3) {
        arr = arr.filter((r) => r.rating <= 3);
      } else {
        arr = arr.filter((r) => r.rating >= ratingFilter);
      }
    }

    if (sortOrder === "newest")
      arr.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
    if (sortOrder === "high") arr.sort((a, b) => b.rating - a.rating);
    if (sortOrder === "low") arr.sort((a, b) => a.rating - b.rating);
    if (sortOrder === "like")
      arr.sort(
        (a, b) => (b.like_count || 0) - (a.like_count || 0)
      );

    return arr;
  }, [reviews, sortOrder, ratingFilter]);

  if (loading)
    return (
      <p className="text-center mt-32 text-gray-500">
        ⏳ 불러오는 중...
      </p>
    );

  /* 🔹 가격 항목명/금액 가져오기용 헬퍼 */
  const getServiceName = (price: any) =>
    price.service_name || price.item_name || price.name || "비급여 항목";

  const getAmount = (price: any) =>
    price.amount ?? price.price ?? price.unit_price ?? null;

  /* ================================
      UI 렌더링
  ==================================*/
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* ----- 병원 이미지 ----- */}
      <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden shadow-md mb-6 border border-gray-100">
        <img
          src={imageSrc} // 위에서 로직으로 처리한 imageSrc가 여기 들어갑니다.
          alt={provider.name}
          className="w-full h-full object-cover brightness-95"
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <h2 className="text-white text-xl font-bold drop-shadow-md">
            {provider.name}
          </h2>
          <div className="flex items-center gap-1 text-yellow-400 text-sm mt-1">
            <Star size={14} fill="#facc15" />
            <span className="font-bold">{provider.avg_rating?.toFixed(1) || "0.0"}</span>
            <span className="text-gray-200">/ 5.0</span>
            <span className="text-gray-300 ml-2 text-xs">
              ({reviews.length}건)
            </span>
          </div>
        </div>
      </div>

      {/* 🔹 이 병원 전체 가격 신고하기 버튼 */}
      {provider && (
        <div className="flex justify-end mb-4">
          <Link
            href={`/my/reports/new?provider_id=${provider.id}&provider_name=${encodeURIComponent(
              provider.name || ""
            )}&category=${encodeURIComponent("가격 오류")}`}
            className="px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700"
          >
            이 병원 가격 전체 신고하기
          </Link>
        </div>
      )}

      {/* ----- 탭 버튼 ----- */}
      <div className="flex mb-4 border-b">
        {[
          { key: "info", label: "🏥 병원정보/비급여 가격" },
          { key: "review", label: "⭐ 후기" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 text-sm font-semibold ${
              activeTab === tab.key
                ? "border-b-2 border-emerald-600 text-emerald-700"
                : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================
          병원 정보 + 비급여 가격
      ==================================*/}
      {activeTab === "info" && (
        <section className="bg-gray-50 border rounded-xl p-5 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              기본 정보
            </h3>

            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-600" />
                <span>{provider.addr}</span>
              </li>

              <li className="flex items-center gap-2">
                <Phone size={16} className="text-emerald-600" />
                <a
                  href={`tel:${provider.phone}`}
                  className="hover:underline"
                >
                  {provider.phone}
                </a>
              </li>
            </ul>
          </div>

          {/* 🔹 비급여 가격 리스트 + 항목별 신고 버튼 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              비급여 가격 정보
            </h3>

            {prices.length === 0 ? (
              <p className="text-sm text-gray-500">
                등록된 비급여 가격 정보가 없습니다.
              </p>
            ) : (
              <div className="border rounded-lg bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">항목</th>
                      <th className="px-3 py-2 text-right">가격</th>
                      <th className="px-3 py-2 text-center">신고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p) => {
                      const name = getServiceName(p);
                      const amt = getAmount(p);
                      return (
                        <tr key={p.id} className="border-t">
                          <td className="px-3 py-2">{name}</td>
                          <td className="px-3 py-2 text-right">
                            {typeof amt === "number"
                              ? amt.toLocaleString("ko-KR") + "원"
                              : "-"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Link
                              href={`/my/reports/new?provider_id=${
                                provider.id
                              }&provider_name=${encodeURIComponent(
                                provider.name || ""
                              )}&category=${encodeURIComponent(
                                "가격 오류"
                              )}&service=${encodeURIComponent(name)}`}
                              className="inline-block px-2 py-1 text-xs rounded bg-red-50 text-red-600 border border-red-300 hover:bg-red-100"
                            >
                              이 항목 신고
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================================
          후기 UI
      ==================================*/}
      {activeTab === "review" && (
        <section className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">
            후기 및 별점
          </h3>

          {/* 평균 점수 */}
          <div className="bg-emerald-50 border rounded-xl p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star
                className="text-yellow-400 w-6 h-6"
                fill="#facc15"
              />
              <span className="text-xl font-bold text-emerald-700">
                {reviews.length
                  ? (
                      reviews.reduce(
                        (s, r) => s + r.rating,
                        0
                      ) / reviews.length
                    ).toFixed(1)
                  : "0.0"}
              </span>
              <span className="text-gray-500">/ 5.0</span>
            </div>
            <span className="text-gray-500 text-sm">
              총 <strong>{reviews.length}</strong>개
            </span>
          </div>

          {/* 정렬 + 필터 */}
          <div className="flex gap-2 mb-4">
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as any)
              }
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="newest">최신순</option>
              <option value="high">평점 높은순</option>
              <option value="low">평점 낮은순</option>
              <option value="like">추천순</option>
            </select>

            <select
              value={ratingFilter || ""}
              onChange={(e) =>
                setRatingFilter(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">전체</option>
              <option value="5">5점만</option>
              <option value="4">4점 이상</option>
              <option value="3">3점 이하</option>
            </select>
          </div>

          {/* 작성폼 */}
          {user ? (
            <form
              onSubmit={handleSubmit}
              className="bg-gray-50 p-4 rounded-xl mb-6 shadow-sm"
            >
              <input
                type="text"
                value={newReview.username}
                disabled
                className="border w-full mb-2 p-2 rounded bg-gray-100"
              />

              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    onClick={() =>
                      setNewReview({
                        ...newReview,
                        rating: n,
                      })
                    }
                    className={`w-6 h-6 cursor-pointer ${
                      n <= newReview.rating
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                    fill={
                      n <= newReview.rating ? "#facc15" : "none"
                    }
                  />
                ))}
              </div>

              <textarea
                value={newReview.comment}
                onChange={(e) =>
                  setNewReview({
                    ...newReview,
                    comment: e.target.value,
                  })
                }
                placeholder="후기 내용을 입력하세요"
                className="border w-full p-2 rounded mb-2 min-h-[80px]"
              />

              <button className="bg-emerald-600 text-white px-4 py-2 rounded">
                {editingReview ? "수정하기" : "등록하기"}
              </button>
            </form>
          ) : (
            <div className="text-center mb-6 bg-gray-50 p-4 rounded-xl">
              <LogIn className="inline-block mr-2" />
              <button
                onClick={() =>
                  router.push(`/login?redirect=/provider/${id}`)
                }
                className="text-emerald-600 underline"
              >
                로그인 후 작성 가능합니다
              </button>
            </div>
          )}

          {/* 후기 목록 */}
          <div className="space-y-4">
            {filteredReviews.slice(0, visibleCount).map((r) => (
              <div
                key={r.id}
                className="border rounded-lg p-4 bg-white shadow-sm relative"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold">{r.username}</h4>
                  <span className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-4 h-4 ${
                        n <= r.rating
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                      fill={
                        n <= r.rating ? "#facc15" : "none"
                      }
                    />
                  ))}
                </div>

                <p className="text-gray-700 whitespace-pre-line">
                  {r.comment}
                </p>

                <div className="flex gap-4 mt-3 text-sm">
                  <button
                    onClick={() => handleLike(r.id)}
                    className="flex items-center gap-1 text-gray-600"
                  >
                    👍 <span>{r.like_count || 0}</span>
                  </button>

                  <button
                    onClick={() => {
                      setReportTarget(r);
                      setReportReason("");
                    }}
                    className="text-red-500 underline"
                  >
                    🚨 신고
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredReviews.length > visibleCount && (
            <div
              ref={loadMoreRef}
              className="h-10 flex items-center justify-center text-gray-400"
            >
              스크롤 시 더보기...
            </div>
          )}
        </section>
      )}

      {/* 후기 신고 모달 */}
      {reportTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-80 rounded-xl p-5 shadow-lg">
            <h3 className="font-semibold text-lg mb-3">후기 신고</h3>

            <p className="text-sm mb-2">
              <b>{reportTarget.username}</b> 님의 후기를 신고합니다.
            </p>

            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="border w-full rounded p-2 mb-3"
            >
              <option value="">사유 선택</option>
              <option value="욕설/비방">욕설/비방</option>
              <option value="허위 정보">허위 정보</option>
              <option value="광고/스팸">광고/스팸</option>
              <option value="기타">기타</option>
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReportTarget(null)}
                className="text-gray-500"
              >
                취소
              </button>

              <button
                onClick={async () => {
                  if (!user) {
                    alert("로그인 후 이용해주세요.");
                    return;
                  }
                  if (!reportReason) {
                    alert("신고 사유를 선택해주세요.");
                    return;
                  }

                  const { error } = await supabase
                    .from("review_reports")
                    .insert({
                      review_id: reportTarget.id,
                      user_id: user.id,
                      reason: reportReason,
                    });

                  if (error) {
                    alert("신고 실패: " + error.message);
                    return;
                  }

                  alert("신고가 접수되었습니다.");
                  setReportTarget(null);
                }}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                신고하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 뒤로가기 */}
      <div className="text-center mt-10">
        <button
          onClick={() => router.back()}
          className="bg-gray-200 px-4 py-2 rounded-md"
        >
          <ArrowLeft className="inline-block mr-1" size={16} />
          목록으로
        </button>
      </div>
    </div>
  );
}
