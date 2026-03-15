import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const STATUS_COLOR = {
  "진행중": "#f59e0b",
  "완료":   "#10b981",
  "보류":   "#4a4d5e",
};

function timeAgo(ts) {
  const diff = Math.floor((new Date() - new Date(ts)) / 1000);
  if (diff < 60)   return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return new Date(ts).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function DisputePage() {
  const [disputes, setDisputes]     = useState([]);
  const [selected, setSelected]     = useState(null);
  const [comments, setComments]     = useState([]);
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [cLoading, setCLoading]     = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [dForm, setDForm]           = useState({ title: "", status: "진행중", note: "" });
  const [cForm, setCForm]           = useState({ author_id: "", content: "" });
  const [saving, setSaving]         = useState(false);
  const timelineRef                 = useRef(null);

  useEffect(() => {
    loadDisputes();
    loadMembers();
  }, []);

  useEffect(() => {
    if (selected) loadComments(selected.id);
  }, [selected]);

  async function loadDisputes() {
    setLoading(true);
    const { data } = await supabase
      .from("disputes")
      .select("*")
      .order("created_at", { ascending: false });
    setDisputes(data || []);
    setLoading(false);
  }

  async function loadMembers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, name")
      .order("created_at");
    setMembers(data || []);
  }

  async function loadComments(disputeId) {
    setCLoading(true);
    const { data } = await supabase
      .from("dispute_comments")
      .select("*")
      .eq("dispute_id", disputeId)
      .order("created_at", { ascending: true });
    setComments(data || []);
    setCLoading(false);
    setTimeout(() => timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  async function addDispute() {
    if (!dForm.title.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("disputes").insert({
      title:  dForm.title.trim(),
      status: dForm.status,
      note:   dForm.note.trim() || null,
    }).select().single();
    setDForm({ title: "", status: "진행중", note: "" });
    setShowAdd(false);
    setSaving(false);
    await loadDisputes();
    if (data) setSelected(data);
  }

  async function addComment() {
    if (!cForm.content.trim() || !cForm.author_id) return;
    setSaving(true);
    const member = members.find(m => m.id === cForm.author_id);
    await supabase.from("dispute_comments").insert({
      dispute_id:  selected.id,
      author_id:   cForm.author_id,
      author_name: member?.name || member?.email || "알 수 없음",
      content:     cForm.content.trim(),
    });
    setCForm(f => ({ ...f, content: "" }));
    setSaving(false);
    loadComments(selected.id);
  }

  async function removeDispute(id) {
    if (!confirm("사건을 삭제하시겠습니까? 관련 의견도 모두 삭제됩니다.")) return;
    await supabase.from("disputes").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
    loadDisputes();
  }

  async function removeComment(id) {
    await supabase.from("dispute_comments").delete().eq("id", id);
    setComments(prev => prev.filter(c => c.id !== id));
  }

  async function changeStatus(id, status) {
    await supabase.from("disputes").update({ status }).eq("id", id);
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

      {/* ── 사건 목록 ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#4a4d5e" }}>총 {disputes.length}건</div>
        <button onClick={() => setShowAdd(v => !v)}
          style={{ background: showAdd ? "#2a2d3a" : "linear-gradient(135deg,#7c5cfc,#4a9eff)", border: "none", borderRadius: 7, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {showAdd ? "취소" : "+ 사건 추가"}
        </button>
      </div>

      {/* 사건 추가 폼 */}
      {showAdd && (
        <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
            <input value={dForm.title} onChange={e => setDForm(f => ({ ...f, title: e.target.value }))}
              placeholder="사건명"
              style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <select value={dForm.status} onChange={e => setDForm(f => ({ ...f, status: e.target.value }))}
              style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
              {Object.keys(STATUS_COLOR).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input value={dForm.note} onChange={e => setDForm(f => ({ ...f, note: e.target.value }))}
              placeholder="사건 설명 (선택)"
              style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <button onClick={addDispute} disabled={saving || !dForm.title.trim()}
              style={{ background: dForm.title.trim() ? "linear-gradient(135deg,#7c5cfc,#4a9eff)" : "#2a2d3a", border: "none", borderRadius: 7, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* 사건 카드 목록 */}
      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>불러오는 중...</div>
      ) : disputes.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>등록된 사건이 없습니다</div>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
          {disputes.map(d => (
            <div key={d.id} onClick={() => setSelected(selected?.id === d.id ? null : d)}
              style={{
                background: selected?.id === d.id ? "#151820" : "#11141c",
                border: `1px solid ${selected?.id === d.id ? (STATUS_COLOR[d.status] || "#4a4d5e") : "#1e2130"}`,
                borderRadius: 10, padding: "12px 16px", cursor: "pointer", minWidth: 160, position: "relative",
              }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e8eaf0", marginBottom: 6, paddingRight: 20 }}>{d.title}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <select value={d.status}
                  onClick={e => e.stopPropagation()}
                  onChange={e => { e.stopPropagation(); changeStatus(d.id, e.target.value); }}
                  style={{ background: (STATUS_COLOR[d.status] || "#4a4d5e") + "22", border: `1px solid ${(STATUS_COLOR[d.status] || "#4a4d5e")}55`, borderRadius: 4, padding: "2px 6px", color: STATUS_COLOR[d.status] || "#4a4d5e", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {Object.keys(STATUS_COLOR).map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={e => { e.stopPropagation(); removeDispute(d.id); }}
                  style={{ background: "transparent", border: "none", color: "#2a2d3a", fontSize: 15, cursor: "pointer", padding: "0 2px", position: "absolute", top: 8, right: 8 }}>×</button>
              </div>
              {d.note && <div style={{ fontSize: 11, color: "#4a4d5e", marginTop: 6, lineHeight: 1.4 }}>{d.note}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── 타임라인 ── */}
      {selected && (
        <div ref={timelineRef}>
          <div style={{ borderTop: "1px solid #1e2130", paddingTop: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#e8eaf0" }}>{selected.title}</div>
            {selected.note && <div style={{ fontSize: 12, color: "#4a4d5e", marginTop: 4 }}>{selected.note}</div>}
          </div>

          {/* 의견 목록 */}
          {cLoading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>불러오는 중...</div>
          ) : comments.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>아직 등록된 의견이 없습니다</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 24, position: "relative" }}>
              {/* 타임라인 세로선 */}
              <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: "#1e2130" }} />
              {comments.map((c, i) => (
                <div key={c.id} style={{ display: "flex", gap: 16, paddingBottom: 20, position: "relative" }}>
                  {/* 타임라인 점 */}
                  <div style={{ width: 40, flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: 2 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#7c5cfc", border: "2px solid #0d0f14", zIndex: 1 }} />
                  </div>
                  <div style={{ flex: 1, background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#7c5cfc" }}>{c.author_name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#4a4d5e" }}>{timeAgo(c.created_at)}</span>
                        <button onClick={() => removeComment(c.id)}
                          style={{ background: "transparent", border: "none", color: "#2a2d3a", fontSize: 14, cursor: "pointer", padding: 0 }}>×</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#e8eaf0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 의견 입력 */}
          <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 8 }}>
              <select value={cForm.author_id} onChange={e => setCForm(f => ({ ...f, author_id: e.target.value }))}
                style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: cForm.author_id ? "#e8eaf0" : "#4a4d5e", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                <option value="">작성자 선택</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.email}</option>
                ))}
              </select>
              <input value={cForm.content} onChange={e => setCForm(f => ({ ...f, content: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); }}}
                placeholder="의견 입력 (Enter로 등록)"
                style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              <button onClick={addComment} disabled={saving || !cForm.content.trim() || !cForm.author_id}
                style={{ background: (cForm.content.trim() && cForm.author_id) ? "linear-gradient(135deg,#7c5cfc,#4a9eff)" : "#2a2d3a", border: "none", borderRadius: 7, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
