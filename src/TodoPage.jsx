import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const TYPES = ["갱신예정", "신규등록예정", "기타"];

const TYPE_COLOR = {
  "갱신예정":    "#f59e0b",
  "신규등록예정": "#7c5cfc",
  "기타":        "#4a4d5e",
};

function formatDate(d) {
  if (!d) return "—";
  return d.replace(/-/g, ".");
}

function daysLeft(due) {
  if (!due) return null;
  const diff = Math.ceil((new Date(due) - new Date()) / 86400000);
  return diff;
}

export default function TodoPage() {
  const [todos, setTodos]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ title: "", type: "갱신예정", due_date: "", note: "" });
  const [filter, setFilter]   = useState("전체");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("patent_todos")
      .select("*")
      .order("done", { ascending: true })
      .order("due_date", { ascending: true, nullsLast: true });
    setTodos(data || []);
    setLoading(false);
  }

  async function add() {
    if (!form.title.trim()) return;
    setSaving(true);
    await supabase.from("patent_todos").insert({
      title:    form.title.trim(),
      type:     form.type,
      due_date: form.due_date || null,
      note:     form.note.trim() || null,
    });
    setForm({ title: "", type: "갱신예정", due_date: "", note: "" });
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function toggleDone(id, done) {
    await supabase.from("patent_todos").update({ done: !done }).eq("id", id);
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t));
  }

  async function remove(id) {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("patent_todos").delete().eq("id", id);
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  const filters = ["전체", ...TYPES, "완료"];
  const filtered = todos.filter(t => {
    if (filter === "완료") return t.done;
    if (filter === "전체") return !t.done;
    return !t.done && t.type === filter;
  });

  const countOf = (f) => {
    if (f === "완료") return todos.filter(t => t.done).length;
    if (f === "전체") return todos.filter(t => !t.done).length;
    return todos.filter(t => !t.done && t.type === f).length;
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

      {/* 툴바 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                background: filter === f ? (TYPE_COLOR[f] || "#e8eaf0") + "22" : "#11141c",
                border: `1px solid ${filter === f ? (TYPE_COLOR[f] || "#e8eaf0") : "#1e2130"}`,
                borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                color: filter === f ? (TYPE_COLOR[f] || "#e8eaf0") : "#4a4d5e",
                fontSize: 12, fontWeight: 700,
              }}>
              {f} {countOf(f) > 0 && <span style={{ opacity: 0.7 }}>({countOf(f)})</span>}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ background: showForm ? "#2a2d3a" : "linear-gradient(135deg,#7c5cfc,#4a9eff)", border: "none", borderRadius: 7, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {showForm ? "취소" : "+ 추가"}
        </button>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="할 일 제목"
              style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: form.due_date ? "#e8eaf0" : "#4a4d5e", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="메모 (선택)"
              style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <button onClick={add} disabled={saving || !form.title.trim()}
              style={{ background: form.title.trim() ? "linear-gradient(135deg,#7c5cfc,#4a9eff)" : "#2a2d3a", border: "none", borderRadius: 7, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>
          {filter === "완료" ? "완료된 항목이 없습니다" : "할 일이 없습니다"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(t => {
            const dl = daysLeft(t.due_date);
            const urgent = dl !== null && dl <= 7 && !t.done;
            return (
              <div key={t.id} style={{ background: "#11141c", border: `1px solid ${urgent ? "#f59e0b44" : "#1e2130"}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* 체크박스 */}
                <div onClick={() => toggleDone(t.id, t.done)}
                  style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${t.done ? "#10b981" : "#2a2d3a"}`, background: t.done ? "#10b981" : "transparent", flexShrink: 0, cursor: "pointer", marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff" }}>
                  {t.done && "✓"}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: t.note ? 4 : 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.done ? "#4a4d5e" : "#e8eaf0", textDecoration: t.done ? "line-through" : "none" }}>
                      {t.title}
                    </span>
                    <span style={{ background: (TYPE_COLOR[t.type] || "#4a4d5e") + "22", color: TYPE_COLOR[t.type] || "#4a4d5e", border: `1px solid ${(TYPE_COLOR[t.type] || "#4a4d5e")}55`, borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {t.type}
                    </span>
                    {t.due_date && (
                      <span style={{ fontSize: 11, color: urgent ? "#f59e0b" : "#4a4d5e", fontWeight: urgent ? 700 : 400 }}>
                        {formatDate(t.due_date)}
                        {!t.done && dl !== null && (
                          dl === 0 ? " (오늘)" : dl < 0 ? ` (${Math.abs(dl)}일 초과)` : ` (D-${dl})`
                        )}
                      </span>
                    )}
                  </div>
                  {t.note && <div style={{ fontSize: 12, color: "#4a4d5e", lineHeight: 1.5 }}>{t.note}</div>}
                </div>

                <button onClick={() => remove(t.id)}
                  style={{ background: "transparent", border: "none", color: "#2a2d3a", fontSize: 16, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
