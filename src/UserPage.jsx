import { useState, useEffect } from "react";

const STATUS_COLOR = {
  "등록": "#10b981",
  "공개": "#4a9eff",
  "거절": "#ff5050",
  "소멸": "#4a4d5e",
};

function formatDate(d) {
  if (!d || d.length !== 8) return "—";
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
}

export default function UserPage() {
  const [patents, setPatents]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [expanded, setExpanded]   = useState(null);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");

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

  const statuses = [...new Set(patents.map(p => p.registrationStatus).filter(Boolean))];

  const filtered = patents.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.inventionName?.toLowerCase().includes(q) || p.applicationNumber?.includes(q);
    const matchStatus = !filterStatus || p.registrationStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

      {/* 요약 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {statuses.map(s => (
          <div key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
            style={{ background: filterStatus === s ? (STATUS_COLOR[s] || "#4a4d5e") + "22" : "#11141c", border: `1px solid ${filterStatus === s ? (STATUS_COLOR[s] || "#4a4d5e") : "#1e2130"}`, borderRadius: 10, padding: "12px 20px", cursor: "pointer", minWidth: 90, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>{s}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: filterStatus === s ? (STATUS_COLOR[s] || "#e8eaf0") : "#e8eaf0" }}>
              {patents.filter(p => p.registrationStatus === s).length}
            </div>
          </div>
        ))}
        <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, padding: "12px 20px", minWidth: 90, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>전체</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#e8eaf0" }}>{patents.length}</div>
        </div>
      </div>

      {/* 검색 */}
      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="발명 명칭 / 출원번호 검색"
          style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 14px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit", width: 300 }} />
      </div>

      {/* 목록 */}
      <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 140px 100px 100px", padding: "10px 16px", borderBottom: "1px solid #1e2130", fontSize: 11, color: "#4a4d5e", fontWeight: 700 }}>
          <div>발명 명칭</div><div>출원번호</div><div>출원일</div><div>상태</div>
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
              style={{ display: "grid", gridTemplateColumns: "3fr 140px 100px 100px", padding: "13px 16px", borderBottom: "1px solid #1e2130", alignItems: "center", fontSize: 13, cursor: "pointer", background: expanded === i ? "#151820" : "transparent" }}>
              <div style={{ color: "#e8eaf0", fontWeight: 600, paddingRight: 16, lineHeight: 1.4 }}>{p.inventionName}</div>
              <div style={{ color: "#8890a4", fontSize: 12 }}>{p.applicationNumber}</div>
              <div style={{ color: "#8890a4", fontSize: 12 }}>{formatDate(p.applicationDate)}</div>
              <div>
                <span style={{ background: (STATUS_COLOR[p.registrationStatus] || "#4a4d5e") + "22", color: STATUS_COLOR[p.registrationStatus] || "#4a4d5e", border: `1px solid ${(STATUS_COLOR[p.registrationStatus] || "#4a4d5e")}55`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
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
                </div>
                {p.abstract && (
                  <div>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 6 }}>요약</div>
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
          키프리스(KIPRIS) 데이터 기준 · 총 {filtered.length}건
        </div>
      )}
    </div>
  );
}
