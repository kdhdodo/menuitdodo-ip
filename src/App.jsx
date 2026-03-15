import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import PatentList from "./PatentList";

const ROLE_LABEL = { admin: "관리자", user: "사용자", external: "외부팀" };
const ROLE_COLOR = { admin: "#7c5cfc", user: "#4a9eff", external: "#10b981" };

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading]  = useState(true);
  const [profile, setProfile]  = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(uid) {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    setProfile(data);
    setLoading(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0d0f14", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a4d5e", fontFamily: "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif" }}>
      로딩 중...
    </div>
  );
  if (!session) return <Login />;

  const role = profile?.role || "external";

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f14", fontFamily: "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif", color: "#e8eaf0" }}>
      {/* 헤더 */}
      <div style={{ background: "#11141c", borderBottom: "1px solid #1e2130", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, background: "linear-gradient(135deg,#7c5cfc,#4a9eff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            메뉴잇 특허 관리
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#4a4d5e" }}>{session.user.email}</span>
          <span style={{ background: (ROLE_COLOR[role] || "#4a4d5e") + "22", color: ROLE_COLOR[role] || "#4a4d5e", border: `1px solid ${(ROLE_COLOR[role] || "#4a4d5e")}55`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
            {ROLE_LABEL[role] || role}
          </span>
          <button onClick={() => supabase.auth.signOut()}
            style={{ background: "transparent", border: "1px solid #1e2130", color: "#4a4d5e", borderRadius: 7, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 서브 헤더 */}
      <div style={{ background: "#0d0f14", borderBottom: "1px solid #1e2130", padding: "16px 32px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 0 }}>
            <div style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "#7c5cfc", borderBottom: "2px solid #7c5cfc", cursor: "pointer" }}>
              특허 목록
            </div>
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ paddingTop: 28 }}>
        <PatentList role={role} />
      </div>
    </div>
  );
}
