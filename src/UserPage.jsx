import { useState, useEffect } from "react";

const CATEGORY_COLOR = {
  "국내특허": "#7c5cfc",
  "해외특허": "#4a9eff",
  "상표":     "#10b981",
  "디자인":   "#f59e0b",
  "해외디자인": "#ec4899",
};

const STATUS_COLOR = {
  "등록": "#10b981",
  "공개": "#4a9eff",
  "거절": "#ff5050",
  "소멸": "#4a4d5e",
};

function formatDate(d) {
  if (!d || d.length < 8) return "—";
  const s = d.replace(/-/g, "");
  if (s.length < 8) return d;
  return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
}

const CATEGORIES = ["전체", "국내특허", "해외특허", "상표", "디자인", "해외디자인"];

export default function UserPage() {
  const [patents, setPatents]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [expanded, setExpanded]       = useState(null);
  const [search, setSearch]           = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("https://djnsbwsguqirskimukxh.supabase.co/functions/v1/kipris-proxy", {
        headers: { "Content-Type": "application/json" }
      });
      const { patents: data, error: err } = await res.json();
      if (err) throw new Error(err);
      setPatents(data || []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const filtered = patents.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.inventionName?.toLowerCase().includes(q) || p.applicationNumber?.includes(q);
    const matchCat = activeCategory === "전체" || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const countBy = (cat) => cat === "전체" ? patents.length : patents.filter(p => p.category === cat).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

      {/* 카테고리 탭 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {CATEGORIES.map(cat => {
          const color = cat === "전체" ? "#e8eaf0" : (CATEGORY_COLOR[cat] || "#e8eaf0");
          const active = activeCategory === cat;
          return (
            <div key={cat} onClick={() => { setActiveCategory(cat); setExpanded(null); }}
              style={{
                background: active ? (color + "22") : "#11141c",
                border: `1px solid ${active ? color : "#1e2130"}`,
                borderRadius: 10, padding: "10px 18px", cursor: "pointer", textAlign: "center", minWidth: 80
              }}>
              <div style={{ fontSize: 11, color: active ? color : "#4a4d5e", fontWeight: 700, marginBottom: 3 }}>{cat}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: active ? color : "#e8eaf0" }}>{countBy(cat)}</div>
            </div>
          );
        })}
      </div>

      {/* 검색 */}
      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="명칭 / 번호 검색"
          style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 14px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit", width: 300 }} />
      </div>

      {/* 목록 */}
      <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 140px 100px 100px", padding: "10px 16px", borderBottom: "1px solid #1e2130", fontSize: 11, color: "#4a4d5e", fontWeight: 700 }}>
          <div>명칭</div><div>구분</div><div>출원번호</div><div>출원일</div><div>상태</div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>불러오는 중...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: "center", color: "#ff5050", fontSize: 13 }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>결과가 없습니다</div>
        ) : filtered.map((p, i) => (
          <div key={i}>
            <div onClick={() => setExpanded(expanded === i ? null : i)}
              style={{ display: "grid", gridTemplateColumns: "2fr 80px 140px 100px 100px", padding: "13px 16px", borderBottom: "1px solid #1e2130", alignItems: "center", fontSize: 13, cursor: "pointer", background: expanded === i ? "#151820" : "transparent" }}>
              <div style={{ color: "#e8eaf0", fontWeight: 600, paddingRight: 12, lineHeight: 1.4 }}>{p.inventionName || "—"}</div>
              <div>
                <span style={{ background: (CATEGORY_COLOR[p.category] || "#4a4d5e") + "22", color: CATEGORY_COLOR[p.category] || "#4a4d5e", border: `1px solid ${(CATEGORY_COLOR[p.category] || "#4a4d5e")}55`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {p.category}
                </span>
              </div>
              <div style={{ color: "#8890a4", fontSize: 12 }}>{p.applicationNumber || "—"}</div>
              <div style={{ color: "#8890a4", fontSize: 12 }}>{formatDate(p.applicationDate)}</div>
              <div>
                <span style={{ background: (STATUS_COLOR[p.registrationStatus] || "#4a4d5e") + "22", color: STATUS_COLOR[p.registrationStatus] || "#8890a4", border: `1px solid ${(STATUS_COLOR[p.registrationStatus] || "#4a4d5e")}55`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                  {p.registrationStatus || "—"}
                </span>
              </div>
            </div>

            {expanded === i && (
              <div style={{ background: "#0d0f14", borderBottom: "1px solid #1e2130", padding: "16px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: p.abstract ? 14 : 0 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>등록번호</div>
                    <div style={{ fontSize: 13, color: "#e8eaf0" }}>{p.registrationNumber || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>등록일</div>
                    <div style={{ fontSize: 13, color: "#e8eaf0" }}>{formatDate(p.registrationDate)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>공개일</div>
                    <div style={{ fontSize: 13, color: "#e8eaf0" }}>{formatDate(p.openingDate)}</div>
                  </div>
                  {p.applicant && (
                    <div>
                      <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>출원인</div>
                      <div style={{ fontSize: 13, color: "#e8eaf0" }}>{p.applicant}</div>
                    </div>
                  )}
                  {p.nation && (
                    <div>
                      <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>국가</div>
                      <div style={{ fontSize: 13, color: "#e8eaf0" }}>{p.nation}</div>
                    </div>
                  )}
                </div>
                {p.abstract && (
                  <div>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 6 }}>요약 / 분류</div>
                    <div style={{ fontSize: 12, color: "#8890a4", lineHeight: 1.7 }}>{p.abstract}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && !error && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#4a4d5e", textAlign: "right" }}>
          KIPRIS / KIPI 데이터 기준 · {activeCategory} {filtered.length}건
        </div>
      )}
    </div>
  );
}
