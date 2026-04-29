"use client";

import { useEffect, useState } from "react";

type SupportProgram = {
  id: number;
  business_name: string;
  target_text: string;
  category: string;
  department: string;
  start_date: string;
  end_date: string;
  notice_url: string;
  source: string;
};

export default function Home() {
  const [data, setData] = useState<SupportProgram[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    let url = "http://localhost:8000/support";

    if (keyword.trim() !== "") {
      url += `?keyword=${encodeURIComponent(keyword)}`;
    }

    const res = await fetch(url);
    const result = await res.json();
    setData(result);
  };

  const collectData = async () => {
    setLoading(true);

    const res = await fetch("http://localhost:8000/collect?page=1&per_page=50", {
      method: "POST",
    });

    const result = await res.json();
    alert(result.message + ` / 저장 건수: ${result.saved_count}`);

    setLoading(false);
    loadData();
  };


  const collectMsitData = async () => {
    setLoading(true);

    const res = await fetch(
      "http://localhost:8000/collect-msit?start_page=1&page_count=3&per_page=10",
      {
        method: "POST",
      }
    );

    const result = await res.json();

    alert(
      result.message +
        ` / 저장 건수: ${result.saved_count}` +
        (result.failed_pages?.length
          ? ` / 실패 페이지: ${result.failed_pages.length}`
          : "")
    );

    setLoading(false);
    loadData();
  };


  useEffect(() => {
    loadData();
  }, []);

  const primaryBtn = {
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const secondaryBtn = {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    fontWeight: 700,
    cursor: "pointer",
  };

  const searchBtn = {
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const inputStyle = {
    flex: 1,
    minWidth: 220,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    color: "#111",           // 🔥 추가
    background: "#fff",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f7f9",
        padding: "40px 24px",
        fontFamily: "Arial, sans-serif",
        color: "#111827", // 검정
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>
            과기부&중기부 정부지원사업 조회 시스템
          </h1>
          <p style={{ color: "#666", margin: 0 }}>
            정부지원사업 공고를 수집하고 검색할 수 있습니다.
          </p>
        </header>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button onClick={collectData} disabled={loading} style={primaryBtn}>
              {loading ? "수집 중..." : "정부 API 수집"}
            </button>

            <button onClick={collectMsitData} disabled={loading} style={secondaryBtn}>
              {loading ? "수집 중..." : "과기정통부 API 수집"}
            </button>

            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="검색어 입력"
              style={inputStyle}
            />

            <button onClick={loadData} style={searchBtn}>
              검색
            </button>
          </div>
        </section>

        <p style={{ marginBottom: 16, color: "#111" }}>
          총 <strong>{data.length}</strong>건
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          {data.map((item) => (
            <article
              key={item.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                padding: 20,
                borderRadius: 16,
                boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "#eef2ff",
                    color: "#3730a3",
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  {item.source || "공공 API"}
                </span>

                <h3 style={{ margin: "0 0 8px", fontSize: 20 , color: "#111" }}>
                  {item.business_name}
                </h3>
              </div>

              <p style={{ margin: "6px 0", color: "#222" }}>
                분야: {item.category || "-"}
              </p>

              <p style={{ margin: "6px 0", color: "#222" }}>
                담당부처: {item.department || "-"}
              </p>

              {item.notice_url && (
                <a
                  href={item.notice_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    color: "#2563eb",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  공고 바로가기 →
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}