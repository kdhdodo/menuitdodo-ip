import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const STATUS = {
  applied:    { label: "출원중",  color: "#f59e0b" },
  reviewing:  { label: "심사중",  color: "#4a9eff" },
  registered: { label: "등록",    color: "#10b981" },
  rejected:   { label: "거절",    color: "#ff5050" },
  expired:    { label: "만료",    color: "#4a4d5e" },
};

const CATEGORY = ["제품", "방법", "디자인", "상표", "기타"];
const COUNTRY  = ["KR", "US", "JP", "CN", "EU", "기타"];

function Badge({ status }) {
  const s = STATUS[status] || STATUS.applied;
  return (
    <span style={{ background: s.color + "22", color: s.color, border: `1px solid ${s.color}55`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

export default function PatentList({ role }) {
  const isAdmin    = role === "admin";
  const isExternal = role === "external";

  const [patents, setPatents]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null); // patent object or null
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState(null);

  const emptyForm = { title: "", application_number: "", registration_number: "", status: "applied", category: "제품", inventor: "", applicant: "메뉴잇", country: "KR", filed_at: "", registered_at: "", expires_at: "", description: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("ip_patents").select("*").order("created_at", { ascending: false });
    setPatents(data || []);
    setLoading(false);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editing) {
      await supabase.from("ip_patents").update(form).eq("id", editing.id);
    } else {
      await supabase.from("ip_patents").insert([form]);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  }

  async function remove(id) {
    if (!confirm("이 특허를 삭제하시겠습니까?")) return;
    await supabase.from("ip_patents").delete().eq("id", id);
    load();
  }

  function startEdit(p) {
    setEditing(p);
    setForm({ ...emptyForm, ...p });
    setShowForm(true);
    setExpanded(null);
  }

  const filtered = patents.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.title?.toLowerCase().includes(q) || p.application_number?.toLowerCase().includes(q) || p.registration_number?.toLowerCase().includes(q) || p.inventor?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = Object.fromEntries(Object.keys(STATUS).map(k => [k, patents.filter(p => p.status === k).length]));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 48px" }}>

      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
        {Object.entries(STATUS).map(([k, v]) => (
          <div key={k} onClick={() => setFilterStatus(filterStatus === k ? "" : k)}
            style={{ background: filterStatus === k ? v.color + "22" : "#11141c", border: `1px solid ${filterStatus === k ? v.color : "#1e2130"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all .15s" }}>
            <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 6 }}>{v.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: filterStatus === k ? v.color : "#e8eaf0" }}>{counts[k] || 0}</div>
          </div>
        ))}
      </div>

      {/* 툴바 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="특허명 / 출원번호 / 발명자 검색"
            style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 14px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit", width: 280 }} />
        </div>
        {!isExternal && (
          <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(v => !v); }}
            style={{ background: showForm ? "#2a2d3a" : "linear-gradient(135deg,#7c5cfc,#4a9eff)", border: "none", borderRadius: 7, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {showForm ? "취소" : "+ 특허 추가"}
          </button>
        )}
      </div>

      {/* 추가/수정 폼 */}
      {showForm && (
        <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, padding: "20px 22px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0", marginBottom: 16 }}>{editing ? "특허 수정" : "새 특허 등록"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="특허명 *"
              style={inputStyle} />
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
              {CATEGORY.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input value={form.application_number} onChange={e => setForm(f => ({ ...f, application_number: e.target.value }))} placeholder="출원번호"
              style={inputStyle} />
            <input value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} placeholder="등록번호"
              style={inputStyle} />
            <input value={form.inventor} onChange={e => setForm(f => ({ ...f, inventor: e.target.value }))} placeholder="발명자"
              style={inputStyle} />
            <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} style={inputStyle}>
              {COUNTRY.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "#4a4d5e", marginBottom: 4 }}>출원일</div>
              <input type="date" value={form.filed_at} onChange={e => setForm(f => ({ ...f, filed_at: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#4a4d5e", marginBottom: 4 }}>등록일</div>
              <input type="date" value={form.registered_at} onChange={e => setForm(f => ({ ...f, registered_at: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#4a4d5e", marginBottom: 4 }}>만료일</div>
              <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="특허 설명"
            rows={3} style={{ ...inputStyle, width: "100%", resize: "vertical", boxSizing: "border-box", marginBottom: 10 }} />
          {isAdmin && (
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="내부 메모 (관리자 전용)"
              rows={2} style={{ ...inputStyle, width: "100%", resize: "vertical", boxSizing: "border-box", marginBottom: 10, borderColor: "#7c5cfc55" }} />
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              style={{ background: "#2a2d3a", border: "none", borderRadius: 7, padding: "8px 18px", color: "#8890a4", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>취소</button>
            <button onClick={save} disabled={saving || !form.title.trim()}
              style={{ background: "linear-gradient(135deg,#7c5cfc,#4a9eff)", border: "none", borderRadius: 7, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: isExternal ? "2fr 80px 80px 80px 100px" : "2fr 80px 80px 80px 100px 100px", padding: "10px 16px", borderBottom: "1px solid #1e2130", fontSize: 11, color: "#4a4d5e", fontWeight: 700 }}>
          <div>특허명</div><div>상태</div><div>분류</div><div>국가</div><div>출원일</div>
          {!isExternal && <div></div>}
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>등록된 특허가 없습니다</div>
        ) : filtered.map(p => (
          <div key={p.id}>
            <div onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              style={{ display: "grid", gridTemplateColumns: isExternal ? "2fr 80px 80px 80px 100px" : "2fr 80px 80px 80px 100px 100px", padding: "13px 16px", borderBottom: "1px solid #1e2130", alignItems: "center", fontSize: 13, cursor: "pointer", background: expanded === p.id ? "#151820" : "transparent" }}>
              <div>
                <div style={{ color: "#e8eaf0", fontWeight: 600 }}>{p.title}</div>
                {p.application_number && <div style={{ fontSize: 11, color: "#4a4d5e", marginTop: 2 }}>출원번호: {p.application_number}</div>}
              </div>
              <div><Badge status={p.status} /></div>
              <div style={{ color: "#8890a4", fontSize: 12 }}>{p.category || "—"}</div>
              <div style={{ color: "#8890a4", fontSize: 12 }}>{p.country || "—"}</div>
              <div style={{ color: "#8890a4", fontSize: 12 }}>{p.filed_at || "—"}</div>
              {!isExternal && (
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => startEdit(p)}
                    style={{ background: "transparent", border: "1px solid #1e2130", color: "#8890a4", borderRadius: 5, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>수정</button>
                  {isAdmin && (
                    <button onClick={() => remove(p.id)}
                      style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff5050", borderRadius: 5, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>삭제</button>
                  )}
                </div>
              )}
            </div>

            {/* 상세 패널 */}
            {expanded === p.id && (
              <div style={{ background: "#0d0f14", borderBottom: "1px solid #1e2130", padding: "16px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>출원번호</div>
                    <div style={{ fontSize: 13, color: "#e8eaf0" }}>{p.application_number || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>등록번호</div>
                    <div style={{ fontSize: 13, color: "#e8eaf0" }}>{p.registration_number || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>발명자</div>
                    <div style={{ fontSize: 13, color: "#e8eaf0" }}>{p.inventor || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>출원일</div>
                    <div style={{ fontSize: 13, color: "#e8eaf0" }}>{p.filed_at || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>등록일</div>
                    <div style={{ fontSize: 13, color: "#e8eaf0" }}>{p.registered_at || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>만료일</div>
                    <div style={{ fontSize: 13, color: p.expires_at && new Date(p.expires_at) < new Date(Date.now() + 90*24*60*60*1000) ? "#f59e0b" : "#e8eaf0" }}>{p.expires_at || "—"}</div>
                  </div>
                </div>
                {p.description && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#4a4d5e", fontWeight: 700, marginBottom: 4 }}>설명</div>
                    <div style={{ fontSize: 13, color: "#8890a4", lineHeight: 1.6 }}>{p.description}</div>
                  </div>
                )}
                {!isExternal && p.notes && (
                  <div style={{ background: "#7c5cfc11", border: "1px solid #7c5cfc33", borderRadius: 7, padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, color: "#7c5cfc", fontWeight: 700, marginBottom: 4 }}>내부 메모</div>
                    <div style={{ fontSize: 13, color: "#8890a4", lineHeight: 1.6 }}>{p.notes}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#4a4d5e", textAlign: "right" }}>
          총 {filtered.length}건 {filterStatus && `(${STATUS[filterStatus]?.label} 필터)`}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7,
  padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none",
  fontFamily: "inherit", width: "100%", boxSizing: "border-box"
};
