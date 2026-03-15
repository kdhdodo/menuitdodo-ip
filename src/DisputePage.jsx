import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const STATUS_COLOR = {
  "진행중": "#f59e0b",
  "완료":   "#10b981",
  "보류":   "#4a4d5e",
};

function formatCommentDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function isImage(name) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

function FilePreview({ file, onRemove }) {
  const url = URL.createObjectURL(file);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 6, overflow: "hidden" }}>
      {isImage(file.name) ? (
        <img src={url} alt={file.name} style={{ width: 56, height: 56, objectFit: "cover" }} />
      ) : (
        <div style={{ padding: "6px 10px", fontSize: 11, color: "#8890a4", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📄 {file.name}
        </div>
      )}
      <button onClick={onRemove}
        style={{ position: "absolute", top: 2, right: 2, background: "#0d0f14cc", border: "none", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#e8eaf0", fontSize: 10, cursor: "pointer", padding: 0 }}>
        ×
      </button>
    </div>
  );
}

function AttachmentView({ att }) {
  if (isImage(att.name)) {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block" }}>
        <img src={att.url} alt={att.name}
          style={{ maxWidth: 200, maxHeight: 160, borderRadius: 6, border: "1px solid #1e2130", objectFit: "cover", cursor: "pointer" }} />
      </a>
    );
  }
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer" download={att.name}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 6, padding: "5px 10px", color: "#8890a4", fontSize: 12, textDecoration: "none" }}>
      📄 {att.name}
    </a>
  );
}

function LinkView({ link }) {
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 6, padding: "5px 10px", color: "#4a9eff", fontSize: 12, textDecoration: "none", maxWidth: 320, overflow: "hidden" }}>
      🔗 <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.label || link.url}</span>
    </a>
  );
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
  const [cForm, setCForm]           = useState({ author_id: "", custom_name: "", content: "" });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingLinks, setPendingLinks] = useState([]);
  const [linkInput, setLinkInput]   = useState({ url: "", label: "" });
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [saving, setSaving]         = useState(false);
  const timelineRef                 = useRef(null);
  const fileInputRef                = useRef(null);
  const dragItem                    = useRef(null);
  const dragOverItem                = useRef(null);
  const [dragIndex, setDragIndex]   = useState(null);
  const [dropIndex, setDropIndex]   = useState(null);

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
    if (data?.length > 0) setSelected(prev => prev ?? data[0]);
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
      .order("sort_order", { ascending: true, nullsFirst: false })
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

  async function uploadFiles(files) {
    const results = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${selected.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from("dispute-files")
        .upload(path, file, { upsert: false });
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from("dispute-files")
          .getPublicUrl(data.path);
        results.push({ name: file.name, url: publicUrl });
      }
    }
    return results;
  }

  async function addComment() {
    const isCustom = cForm.author_id === "__custom__";
    const authorName = isCustom
      ? cForm.custom_name.trim()
      : (() => { const m = members.find(m => m.id === cForm.author_id); return m?.name || m?.email || ""; })();
    if (!cForm.content.trim() || !authorName) return;
    setSaving(true);

    const uploadedFiles = pendingFiles.length > 0 ? await uploadFiles(pendingFiles) : [];
    const maxOrder = comments.reduce((max, c) => Math.max(max, c.sort_order ?? 0), 0);

    await supabase.from("dispute_comments").insert({
      dispute_id:  selected.id,
      author_id:   isCustom ? null : cForm.author_id,
      author_name: authorName,
      content:     cForm.content.trim(),
      sort_order:  maxOrder + 1,
      attachments: uploadedFiles,
      links:       pendingLinks,
    });
    setCForm(f => ({ ...f, content: "" }));
    setPendingFiles([]);
    setPendingLinks([]);
    setShowLinkForm(false);
    setLinkInput({ url: "", label: "" });
    setSaving(false);
    loadComments(selected.id);
  }

  function addLink() {
    if (!linkInput.url.trim()) return;
    let url = linkInput.url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    setPendingLinks(prev => [...prev, { url, label: linkInput.label.trim() || url }]);
    setLinkInput({ url: "", label: "" });
    setShowLinkForm(false);
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

  // ── 드래그 앤 드롭 ────────────────────────────────────────────
  function onDragStart(e, index) {
    dragItem.current = index;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragEnter(index) {
    dragOverItem.current = index;
    setDropIndex(index);
  }

  function onDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  async function onDrop() {
    const from = dragItem.current;
    const to   = dragOverItem.current;
    if (from === null || to === null || from === to) {
      dragItem.current = null;
      dragOverItem.current = null;
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const reordered = [...comments];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const updated = reordered.map((c, i) => ({ ...c, sort_order: i + 1 }));
    setComments(updated);
    await Promise.all(
      updated.map(c =>
        supabase.from("dispute_comments").update({ sort_order: c.sort_order }).eq("id", c.id)
      )
    );
    dragItem.current = null;
    dragOverItem.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }

  const canSubmit = cForm.content.trim() && cForm.author_id &&
    (cForm.author_id !== "__custom__" || cForm.custom_name.trim());

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
              <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: "#1e2130" }} />
              {comments.map((c, i) => (
                <div key={c.id}
                  draggable
                  onDragStart={e => onDragStart(e, i)}
                  onDragEnter={() => onDragEnter(i)}
                  onDragEnd={onDragEnd}
                  onDrop={onDrop}
                  onDragOver={e => e.preventDefault()}
                  style={{
                    display: "flex", gap: 16, paddingBottom: 20, position: "relative",
                    opacity: dragIndex === i ? 0.4 : 1,
                    borderTop: dropIndex === i && dragIndex !== i ? "2px solid #7c5cfc" : "2px solid transparent",
                    transition: "opacity 0.15s",
                    cursor: "grab",
                  }}>
                  <div style={{ width: 40, flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: 2 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#7c5cfc", border: "2px solid #0d0f14", zIndex: 1 }} />
                  </div>
                  <div style={{ flex: 1, background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#2a2d3a", fontSize: 14, cursor: "grab", userSelect: "none", letterSpacing: "-1px" }}>⠿</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#7c5cfc" }}>{c.author_name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#4a4d5e" }}>{formatCommentDate(c.created_at)}</span>
                        <button onClick={() => removeComment(c.id)}
                          style={{ background: "transparent", border: "none", color: "#2a2d3a", fontSize: 14, cursor: "pointer", padding: 0 }}>×</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#e8eaf0", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: (c.attachments?.length || c.links?.length) ? 10 : 0 }}>{c.content}</div>

                    {/* 첨부 파일 */}
                    {c.attachments?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: c.links?.length ? 8 : 0 }}>
                        {c.attachments.map((att, j) => <AttachmentView key={j} att={att} />)}
                      </div>
                    )}
                    {/* 링크 */}
                    {c.links?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {c.links.map((link, j) => <LinkView key={j} link={link} />)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 의견 입력 */}
          <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 8 }}>
              {/* 작성자 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <select value={cForm.author_id} onChange={e => setCForm(f => ({ ...f, author_id: e.target.value, custom_name: "" }))}
                  style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: cForm.author_id ? "#e8eaf0" : "#4a4d5e", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                  <option value="">작성자 선택</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.email}</option>
                  ))}
                  <option value="__custom__">직접 입력</option>
                </select>
                {cForm.author_id === "__custom__" && (
                  <input value={cForm.custom_name} onChange={e => setCForm(f => ({ ...f, custom_name: e.target.value }))}
                    placeholder="이름 입력"
                    style={{ background: "#0d0f14", border: "1px solid #7c5cfc55", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                )}
              </div>

              {/* 텍스트 입력 + 첨부 미리보기 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea value={cForm.content} onChange={e => setCForm(f => ({ ...f, content: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); }}}
                  placeholder="의견 입력 (Enter로 등록, Shift+Enter로 줄바꿈)"
                  rows={1}
                  style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "none", overflowY: "hidden", lineHeight: 1.6, minHeight: 36, fieldSizing: "content" }} />

                {/* 첨부 파일 미리보기 */}
                {pendingFiles.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {pendingFiles.map((f, i) => (
                      <FilePreview key={i} file={f} onRemove={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} />
                    ))}
                  </div>
                )}

                {/* 링크 미리보기 */}
                {pendingLinks.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {pendingLinks.map((link, i) => (
                      <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 6, padding: "4px 8px" }}>
                        <span style={{ fontSize: 11, color: "#4a9eff", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🔗 {link.label}</span>
                        <button onClick={() => setPendingLinks(prev => prev.filter((_, j) => j !== i))}
                          style={{ background: "transparent", border: "none", color: "#4a4d5e", fontSize: 12, cursor: "pointer", padding: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* URL 입력 폼 */}
                {showLinkForm && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}>
                    <input value={linkInput.url} onChange={e => setLinkInput(f => ({ ...f, url: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addLink()}
                      placeholder="URL (예: https://...)"
                      style={{ background: "#0d0f14", border: "1px solid #4a9eff55", borderRadius: 7, padding: "7px 10px", color: "#e8eaf0", fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                    <input value={linkInput.label} onChange={e => setLinkInput(f => ({ ...f, label: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addLink()}
                      placeholder="표시 이름 (선택)"
                      style={{ background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 7, padding: "7px 10px", color: "#e8eaf0", fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                    <button onClick={addLink}
                      style={{ background: "linear-gradient(135deg,#7c5cfc,#4a9eff)", border: "none", borderRadius: 7, padding: "7px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>추가</button>
                  </div>
                )}

                {/* 하단 버튼 */}
                <div style={{ display: "flex", gap: 6 }}>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                    style={{ display: "none" }}
                    onChange={e => { setPendingFiles(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = ""; }} />
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ background: "transparent", border: "1px solid #1e2130", borderRadius: 6, padding: "5px 10px", color: "#4a4d5e", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    📎 파일
                  </button>
                  <button onClick={() => setShowLinkForm(v => !v)}
                    style={{ background: showLinkForm ? "#1e2130" : "transparent", border: "1px solid #1e2130", borderRadius: 6, padding: "5px 10px", color: showLinkForm ? "#4a9eff" : "#4a4d5e", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    🔗 URL
                  </button>
                </div>
              </div>

              <button onClick={addComment}
                disabled={saving || !canSubmit}
                style={{ background: canSubmit ? "linear-gradient(135deg,#7c5cfc,#4a9eff)" : "#2a2d3a", border: "none", borderRadius: 7, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>
                {saving ? "..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
