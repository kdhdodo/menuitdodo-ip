import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const ROLES = [
  { value: "admin",    label: "관리자", color: "#7c5cfc" },
  { value: "user",     label: "사용자", color: "#4a9eff" },
  { value: "external", label: "외부팀", color: "#10b981" },
];
const roleColor = Object.fromEntries(ROLES.map(r => [r.value, r.color]));

export default function AdminPage() {
  const [members, setMembers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm]           = useState({ email: "", role: "user" });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setMembers(data || []);
    setLoading(false);
  }

  async function invite() {
    if (!form.email.trim()) return;
    setSaving(true); setError("");
    const { error: err } = await supabase.auth.admin.inviteUserByEmail(form.email.trim());
    if (err) { setError(err.message); setSaving(false); return; }
    setForm({ email: "", role: "user" });
    setShowInvite(false); setSaving(false);
    setTimeout(load, 1000);
  }

  async function changeRole(id, role) {
    await supabase.from("profiles").update({ role }).eq("id", id);
    load();
  }

  async function removeMember(id) {
    if (!confirm("이 회원을 삭제하시겠습니까?")) return;
    await supabase.auth.admin.deleteUser(id);
    load();
  }

  const filtered = members.filter(m =>
    !search || m.email?.includes(search) || m.name?.includes(search)
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

      {/* 타이틀 */}
      <div style={{ fontSize: 18, fontWeight: 800, color: "#e8eaf0", marginBottom: 24 }}>회원 관리</div>

      {/* 툴바 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#4a4d5e" }}>총 {members.length}명</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 / 이메일 검색"
            style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 14px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit", width: 200 }} />
          <button onClick={() => { setShowInvite(v => !v); setError(""); }}
            style={{ background: showInvite ? "#2a2d3a" : "linear-gradient(135deg,#7c5cfc,#4a9eff)", border: "none", borderRadius: 7, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {showInvite ? "취소" : "+ 초대"}
          </button>
        </div>
      </div>

      {/* 초대 폼 */}
      {showInvite && (
        <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
          {error && <div style={{ color: "#ff5050", fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8 }}>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" placeholder="이메일"
              style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button onClick={invite} disabled={saving || !form.email.trim()}
              style={{ background: form.email.trim() ? "linear-gradient(135deg,#7c5cfc,#4a9eff)" : "#2a2d3a", border: "none", borderRadius: 7, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "..." : "초대"}
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", padding: "10px 16px", borderBottom: "1px solid #1e2130", fontSize: 11, color: "#4a4d5e", fontWeight: 700 }}>
          <div>이메일</div><div>이름</div><div>권한</div><div></div>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>회원이 없습니다</div>
        ) : filtered.map(m => (
          <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", padding: "12px 16px", borderBottom: "1px solid #1e2130", alignItems: "center", fontSize: 13 }}>
            <div style={{ color: "#e8eaf0" }}>{m.email}</div>
            <div style={{ color: "#8890a4" }}>{m.name || "—"}</div>
            <div>
              <select value={m.role || "user"} onChange={e => changeRole(m.id, e.target.value)}
                style={{ background: "transparent", border: `1px solid ${roleColor[m.role] || "#4a4d5e"}`, borderRadius: 5, padding: "3px 8px", color: roleColor[m.role] || "#4a4d5e", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <button onClick={() => removeMember(m.id)}
              style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff5050", borderRadius: 5, padding: "3px 10px", fontSize: 12, cursor: "pointer" }}>
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
