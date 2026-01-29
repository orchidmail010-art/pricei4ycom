"use client";

import { useEffect } from "react";

export default function AdSense() {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // 로컬 / 애드블록 환경에서는 에러 무시
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", margin: "24px 0" }}
      data-ad-client="ca-pub-3230635014319056"
      data-ad-slot="5906892515"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
