import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import AdminPage from "./AdminPage";
import UserPage from "./UserPage";
import TodoPage from "./TodoPage";
import DisputePage from "./DisputePage";
import ExternalPage from "./ExternalPage";


export default function App() {
  const [session, setSession]  = useState(null);
  const [loading, setLoading]  = useState(true);
  const [profile, setProfile]  = useState(null);
  const [view, setView]        = useState("admin");
  const [subView, setSubView]  = useState("patents");
  const viewInitialized        = useRef(false);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id, false);
      else { setProfile(null); setLoading(false); viewInitialized.current = false; }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(uid, setViewOnLoad = true) {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    setProfile(data);
    // view는 최초 1회만 역할 기반으로 설정, 이후 토큰 갱신 등에선 건드리지 않음
    if (setViewOnLoad && !viewInitialized.current) {
      const r = data?.role || "external";
      const resolvedRole = (r === "super_admin" || r === "admin") ? "admin" : r;
      setView(resolvedRole);
      viewInitialized.current = true;
    }
    setLoading(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0d0f14", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a4d5e", fontFamily: "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif" }}>
      로딩 중...
    </div>
  );
  if (!session) return <Login />;

  const rawRole = profile?.role || "external";
  const role = (rawRole === "super_admin" || rawRole === "admin") ? "admin" : rawRole;


  return (
    <div style={{ minHeight: "100vh", background: "#0d0f14", fontFamily: "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif", color: "#e8eaf0" }}>

      {/* 헤더 */}
      <div style={{ background: "#11141c", borderBottom: "1px solid #1e2130", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 800, background: "linear-gradient(135deg,#7c5cfc,#4a9eff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", whiteSpace: "nowrap" }}>
            메뉴잇 IP 관리
          </div>
          {(view === "user" || (role !== "admin" && role === "user")) && (
            <div style={{ display: "flex", gap: 4 }}>
              {[["todos", "TODO"], ["disputes", "분쟁관리"], ["patents", "특허 목록"]].map(([key, label]) => (
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
          <span style={{ fontSize: 12, color: "#4a4d5e" }}>{session.user.email}</span>
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
          <button onClick={() => supabase.auth.signOut()}
            style={{ background: "transparent", border: "1px solid #1e2130", color: "#4a4d5e", borderRadius: 7, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>
            로그아웃
          </button>
        </div>
      </div>


      {/* 페이지 */}
      {view === "admin"                            && <AdminPage />}
      {view === "user" && subView === "patents"    && <UserPage />}
      {view === "user" && subView === "todos"      && <TodoPage />}
      {view === "user" && subView === "disputes"   && <DisputePage />}
      {view === "external"                         && <ExternalPage />}
    </div>
  );
}
