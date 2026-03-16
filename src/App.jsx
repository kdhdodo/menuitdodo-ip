import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import AdminPage from "./AdminPage";
import UserPage from "./UserPage";
import TodoPage from "./TodoPage";
import DisputePage from "./DisputePage";
import ExternalPage from "./ExternalPage";
import ArchivePage from "./ArchivePage";

const FONT = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif";

function PasswordModal({ onClose }) {
  const [pw, setPw]         = useState("");
  const [pw2, setPw2]       = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  async function save() {
    if (!pw || pw.length < 6) { setMsg("비밀번호는 6자 이상이어야 합니다"); return; }
    if (pw !== pw2) { setMsg("비밀번호가 일치하지 않습니다"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setMsg(error.message); setSaving(false); return; }
    setMsg("✓ 변경 완료!");
    setTimeout(onClose, 1000);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: FONT }}>
      <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 14, padding: "36px 32px", width: 360, boxSizing: "border-box" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#e8eaf0", marginBottom: 6 }}>비밀번호 변경</div>
        <div style={{ fontSize: 13, color: "#4a4d5e", marginBottom: 24 }}>새 비밀번호를 입력해주세요 (6자 이상)</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)}
          placeholder="새 비밀번호"
          style={{ width: "100%", boxSizing: "border-box", background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 8, padding: "10px 12px", color: "#e8eaf0", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 10 }} />
        <input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
          onKeyDown={e => e.key === "Enter" && save()}
          placeholder="비밀번호 확인"
          style={{ width: "100%", boxSizing: "border-box", background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 8, padding: "10px 12px", color: "#e8eaf0", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 16 }} />
        {msg && <div style={{ fontSize: 12, color: msg.startsWith("✓") ? "#10b981" : "#ff5050", marginBottom: 12 }}>{msg}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} disabled={saving}
            style={{ flex: 1, background: "linear-gradient(135deg,#7c5cfc,#4a9eff)", border: "none", borderRadius: 8, padding: "11px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "저장 중..." : "변경하기"}
          </button>
          <button onClick={onClose}
            style={{ flex: 1, background: "transparent", border: "1px solid #1e2130", borderRadius: 8, padding: "11px", color: "#4a4d5e", fontSize: 14, cursor: "pointer" }}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [profile, setProfile]       = useState(null);
  const [view, setView]             = useState("admin");
  const [subView, setSubView]       = useState("patents");
  const [showPwModal, setShowPwModal] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const viewInitialized             = useRef(false);

  useEffect(() => {
    async function init() {
      const hash = window.location.hash;
      if (hash.includes("type=invite")) setIsFirstLogin(true);

      const params = new URLSearchParams(hash.substring(1));
      const at = params.get("access_token"), rt = params.get("refresh_token");
      if (at && rt && !hash.includes("type=invite")) {
        await supabase.auth.setSession({ access_token: at, refresh_token: rt });
        window.history.replaceState(null, "", window.location.pathname);
      }

      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    }
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "USER_UPDATED") return; // 비밀번호 변경 이벤트 무시
      setSession(s);
      if (s) loadProfile(s.user.id, false);
      else { setProfile(null); setLoading(false); viewInitialized.current = false; }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(uid, setViewOnLoad = true) {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    setProfile(data);
    if (setViewOnLoad && !viewInitialized.current) {
      const hasTodoParam = new URLSearchParams(window.location.search).get("todo");
      if (hasTodoParam) {
        setView("user");
        setSubView("todos");
      } else {
        const r = data?.role || "external";
        const resolvedRole = (r === "super_admin" || r === "admin") ? "admin" : (r === "member") ? "user" : r;
        setView(resolvedRole);
      }
      viewInitialized.current = true;
    }
    setLoading(false);
  }

  const [nickname, setNickname] = useState("");
  const [nickSaving, setNickSaving] = useState(false);

  async function saveNickname() {
    if (!nickname.trim()) return;
    setNickSaving(true);
    await supabase.from("profiles").update({ name: nickname.trim() }).eq("id", session.user.id);
    setProfile(p => ({ ...p, name: nickname.trim() }));
    setNickSaving(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0d0f14", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a4d5e", fontFamily: FONT }}>
      로딩 중...
    </div>
  );
  if (!session) return <Login />;

  // 초대 첫 로그인 → 비밀번호 설정
  if (isFirstLogin) return (
    <div style={{ minHeight: "100vh", background: "#0d0f14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 14, padding: "40px 36px", width: 380, boxSizing: "border-box" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#e8eaf0", marginBottom: 6 }}>비밀번호 설정</div>
        <div style={{ fontSize: 13, color: "#4a4d5e", marginBottom: 28 }}>사용할 비밀번호를 설정해주세요 (6자 이상)</div>
        <PasswordModal onClose={() => setIsFirstLogin(false)} />
      </div>
    </div>
  );

  // 닉네임 미설정
  if (session && profile && !profile.name) return (
    <div style={{ minHeight: "100vh", background: "#0d0f14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ background: "#11141c", border: "1px solid #1e2130", borderRadius: 14, padding: "40px 36px", width: 360, boxSizing: "border-box" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#e8eaf0", marginBottom: 6 }}>닉네임 설정</div>
        <div style={{ fontSize: 13, color: "#4a4d5e", marginBottom: 28 }}>앱에서 사용할 이름을 입력해주세요</div>
        <input value={nickname} onChange={e => setNickname(e.target.value)}
          onKeyDown={e => e.key === "Enter" && saveNickname()}
          placeholder="닉네임 입력"
          style={{ width: "100%", boxSizing: "border-box", background: "#0d0f14", border: "1px solid #1e2130", borderRadius: 8, padding: "10px 12px", color: "#e8eaf0", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 16 }} />
        <button onClick={saveNickname} disabled={nickSaving || !nickname.trim()}
          style={{ width: "100%", background: nickname.trim() ? "linear-gradient(135deg,#7c5cfc,#4a9eff)" : "#2a2d3a", border: "none", borderRadius: 8, padding: "12px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          {nickSaving ? "저장 중..." : "시작하기"}
        </button>
      </div>
    </div>
  );

  const rawRole = profile?.role || "external";
  const role = (rawRole === "super_admin" || rawRole === "admin") ? "admin" : (rawRole === "member") ? "user" : rawRole;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f14", fontFamily: FONT, color: "#e8eaf0" }}>

      {showPwModal && <PasswordModal onClose={() => setShowPwModal(false)} />}

      {/* 헤더 */}
      <div style={{ background: "#11141c", borderBottom: "1px solid #1e2130", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 800, background: "linear-gradient(135deg,#7c5cfc,#4a9eff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", whiteSpace: "nowrap" }}>
            메뉴잇 IP 관리
          </div>
          {(view === "user" || (role !== "admin" && role === "user")) && (
            <div style={{ display: "flex", gap: 4 }}>
              {[["todos", "TODO"], ["disputes", "분쟁관리"], ["patents", "등록목록"], ["archive", "아카이빙"]].map(([key, label]) => (
                <div key={key} onClick={() => setSubView(key)}
                  style={{ padding: "0 12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    color: subView === key ? "#7c5cfc" : "#4a4d5e",
                    borderBottom: subView === key ? "2px solid #7c5cfc" : "2px solid transparent",
                    height: 56, display: "flex", alignItems: "center" }}>
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#4a4d5e" }}>{profile?.name || session.user.email}</span>
          {role === "admin" && view === "admin" && (
            <button onClick={() => setView("user")}
              style={{ background: "transparent", border: "1px solid #1e2130", color: "#4a9eff", borderRadius: 7, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ← 사용자
            </button>
          )}
          {role === "admin" && view === "user" && (
            <button onClick={() => setView("admin")}
              style={{ background: "transparent", border: "1px solid #1e2130", color: "#7c5cfc", borderRadius: 7, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              관리자 →
            </button>
          )}
          <button onClick={() => setShowPwModal(true)}
            style={{ background: "transparent", border: "1px solid #1e2130", color: "#4a4d5e", borderRadius: 7, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>
            비밀번호 변경
          </button>
          <button onClick={() => supabase.auth.signOut()}
            style={{ background: "transparent", border: "1px solid #1e2130", color: "#4a4d5e", borderRadius: 7, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>
            로그아웃
          </button>
        </div>
      </div>
1
      {/* 페이지 */}
      {view === "admin"                            && <AdminPage />}
      {view === "user" && subView === "patents"    && <UserPage />}
      {view === "user" && subView === "todos"      && <TodoPage />}
      {view === "user" && subView === "disputes"   && <DisputePage />}
      {view === "user" && subView === "archive"    && <ArchivePage />}
      {view === "external"                         && <ExternalPage />}
    </div>
  );
}
