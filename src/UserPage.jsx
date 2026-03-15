import { useState } from "react";

export default function UserPage() {
  const [tab, setTab] = useState("patents");

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f14" }}>
      {/* 탭 헤더 */}
      <div style={{ background: "#0d0f14", borderBottom: "1px solid #1e2130", padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex" }}>
          <div onClick={() => setTab("patents")}
            style={{ padding: "14px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: tab === "patents" ? "#7c5cfc" : "#4a4d5e", borderBottom: tab === "patents" ? "2px solid #7c5cfc" : "2px solid transparent", transition: "all .15s" }}>
            특허 목록
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 20 }}>🚧</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#e8eaf0", marginBottom: 10 }}>준비 중입니다</div>
        <div style={{ fontSize: 14, color: "#4a4d5e" }}>특허 목록을 준비하고 있습니다.</div>
      </div>
    </div>
  );
}
