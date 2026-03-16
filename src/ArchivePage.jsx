import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const FONT = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif";

const CATEGORIES = ["전체", "특허", "디자인", "상표", "기타"];

function isImage(name) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export default function ArchivePage() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [catFilter, setCatFilter]   = useState("전체");
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState({ title: "", content: "", category: "특허" });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [saving, setSaving]         = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const fileRef                     = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("archive_items")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  async function uploadFiles(files) {
    const results = [];
    for (const file of files) {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const path = `archive/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from("dispute-files").upload(path, file, { upsert: false });
      if (error) { console.error(error); continue; }
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from("dispute-files").getPublicUrl(data.path);
        results.push({ name: file.name, url: publicUrl });
      }
    }
    return results;
  }

  async function addItem() {
    if (!form.title.trim() && pendingFiles.length === 0) return;
    setSaving(true);
    const uploaded = await uploadFiles(pendingFiles);
    await supabase.from("archive_items").insert({
      title:       form.title.trim() || null,
      content:     form.content.trim() || null,
      category:    form.category,
      attachments: uploaded,
    });
    setForm({ title: "", content: "", category: "특허" });
    setPendingFiles([]);
    setShowAdd(false);
    setSaving(false);
    load();
  }

  async function removeItem(id) {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("archive_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function updateItem() {
    if (!editingItem) return;
    setSaving(true);
    await supabase.from("archive_items").update({
      title:    editingItem.title?.trim() || null,
      content:  editingItem.content?.trim() || null,
      category: editingItem.category,
    }).eq("id", editingItem.id);
    setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...editingItem } : i));
    setEditingItem(null);
    setSaving(false);
  }

  function onPaste(e) {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find(i => i.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) setPendingFiles(prev => [...prev, file]);
    }
  }

  const filtered = items.filter(i => {
    const matchCat = catFilter === "전체" || i.category === catFilter;
    const matchSearch = !search || i.title?.includes(search) || i.content?.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px", fontFamily: FONT }}>

      {/* 툴바 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{ background: catFilter === c ? "#7c5cfc22" : "transparent", border: `1px solid ${catFilter === c ? "#7c5cfc" : "#1e2130"}`, borderRadius: 6, padding: "4px 12px", color: catFilter === c ? "#7c5cfc" : "#4a4d5e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색"
            style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 7, padding: "7px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit", width: 180 }} />
          <button onClick={() => setShowAdd(v => !v)}
            style={{ background: showAdd ? "#2a2d3a" : "linear-gradient(135deg,#7c5cfc,#4a9eff)", border: "none", borderRadius: 7, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {showAdd ? "취소" : "+ 등록"}
          </button>
        </div>
      </div>

      {/* 등록 폼 */}
      {showAdd && (
        <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="제목"
              style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
              {CATEGORIES.filter(c => c !== "전체").map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            onPaste={onPaste}
            placeholder="내용 입력 (Ctrl+V로 이미지 붙여넣기 가능)"
            rows={4}
            style={{ width: "100%", boxSizing: "border-box", background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", marginBottom: 8 }} />
          {/* 파일 첨부 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: pendingFiles.length > 0 ? 8 : 0 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 6, padding: "5px 12px", color: "#8890a4", fontSize: 12, cursor: "pointer" }}>
              📎 파일
              <input ref={fileRef} type="file" multiple style={{ opacity: 0, position: "absolute", width: 0 }}
                onChange={e => { setPendingFiles(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = ""; }} />
            </label>
          </div>
          {pendingFiles.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {pendingFiles.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 5, padding: "3px 8px", fontSize: 11, color: "#8890a4" }}>
                  {f.name}
                  <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "#4a4d5e", cursor: "pointer", padding: 0, fontSize: 12 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={addItem} disabled={saving || (!form.title.trim() && pendingFiles.length === 0)}
              style={{ background: (form.title.trim() || pendingFiles.length > 0) ? "linear-gradient(135deg,#7c5cfc,#4a9eff)" : "#2a2d3a", border: "none", borderRadius: 7, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#4a4d5e", fontSize: 13 }}>등록된 자료가 없습니다</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(item => (
            <div key={item.id} style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, padding: "16px 18px", position: "relative" }}>
              {editingItem?.id === item.id ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input value={editingItem.title || ""} onChange={e => setEditingItem(ei => ({ ...ei, title: e.target.value }))}
                      placeholder="제목"
                      style={{ background: "#0d0f14", border: "1px solid #7c5cfc55", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    <select value={editingItem.category} onChange={e => setEditingItem(ei => ({ ...ei, category: e.target.value }))}
                      style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                      {CATEGORIES.filter(c => c !== "전체").map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <textarea value={editingItem.content || ""} onChange={e => setEditingItem(ei => ({ ...ei, content: e.target.value }))}
                    rows={4}
                    style={{ width: "100%", boxSizing: "border-box", background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", marginBottom: 8 }} />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                    <button onClick={updateItem} disabled={saving}
                      style={{ background: "linear-gradient(135deg,#7c5cfc,#4a9eff)", border: "none", borderRadius: 7, padding: "7px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {saving ? "저장 중..." : "저장"}
                    </button>
                    <button onClick={() => setEditingItem(null)}
                      style={{ background: "transparent", border: "1px solid #1e2130", borderRadius: 7, padding: "7px 18px", color: "#4a4d5e", fontSize: 13, cursor: "pointer" }}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#7c5cfc", background: "#7c5cfc22", border: "1px solid #7c5cfc44", borderRadius: 4, padding: "2px 7px" }}>{item.category}</span>
                      {item.title && <span style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0" }}>{item.title}</span>}
                      <span style={{ fontSize: 11, color: "#4a4d5e", marginLeft: "auto" }}>{formatDate(item.created_at)}</span>
                    </div>
                    {item.content && (
                      <div style={{ fontSize: 13, color: "#8890a4", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: item.attachments?.length > 0 ? 10 : 0 }}>
                        {item.content}
                      </div>
                    )}
                    {item.attachments?.length > 0 && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        {item.attachments.map((att, i) => (
                          isImage(att.name) ? (
                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                              <img src={att.url} alt={att.name} style={{ maxWidth: 200, maxHeight: 140, borderRadius: 6, border: "1px solid #1e2130", objectFit: "cover", cursor: "pointer" }} />
                            </a>
                          ) : (
                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" download={att.name}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 6, padding: "5px 10px", color: "#8890a4", fontSize: 12, textDecoration: "none" }}>
                              📄 {att.name}
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <button onClick={() => setEditingItem({ id: item.id, title: item.title || "", content: item.content || "", category: item.category })}
                      style={{ background: "transparent", border: "none", color: "#4a4d5e", fontSize: 11, cursor: "pointer", padding: 0 }}>수정</button>
                    <button onClick={() => removeItem(item.id)}
                      style={{ background: "transparent", border: "none", color: "#2a2d3a", fontSize: 16, cursor: "pointer", padding: 0 }}>×</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
