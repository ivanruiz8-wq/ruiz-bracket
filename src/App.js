import { useState } from "react";
import PICKS from "./picks";

// ── CONFIG ─────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "Youdabest123$!$";
const LOCK_TIME = new Date("2026-07-04T16:59:00Z"); // 12:59 PM ET = 16:59 UTC

const FAMILY = [
  "Ivan Sr","Ivan Jr","Isabella","Alfonso","Edgard",
  "Edgard Alfonso","Yvette","Giovanna","Tatiana","Alex"
];

// Points per round — R32 not scored, scoring starts at R16
const ROUND_POINTS = { r16: 2, qf: 4, sf: 8, final: 16 };

// ── ACTUAL TOURNAMENT RESULTS ────────────────────────────────────────────
// Update this object as real results come in, then push to redeploy.
const RESULTS = {
  r16: { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: "", 7: "" },
  qf:  { 0: "", 1: "", 2: "", 3: "" },
  sf:  { 0: "", 1: "" },
  final: { 0: "" },
  champion: "",
};

// Round of 32 matchups — winner pre-filled where result is already known.
// Order matters: indices [0,1] feed R16 Match 1, [2,3] feed R16 Match 2, etc.
// Verified against FIFA's official fixed bracket.
const R32_MATCHUPS = [
  { id: "r32_1",  home: "Netherlands",  away: "Morocco",    winner: "Morocco" },      // Morocco won on pens
  { id: "r32_2",  home: "South Africa", away: "Canada",     winner: "Canada" },       // Canada won 1-0
  { id: "r32_3",  home: "France",       away: "Sweden",     winner: "France" },       // France won 3-0
  { id: "r32_4",  home: "Germany",      away: "Paraguay",   winner: "Paraguay" },     // Paraguay won on pens
  { id: "r32_5",  home: "Brazil",       away: "Japan",      winner: "Brazil" },       // Brazil won 2-1
  { id: "r32_6",  home: "Ivory Coast",  away: "Norway",     winner: "Norway" },       // Norway won 2-1
  { id: "r32_7",  home: "Mexico",       away: "Ecuador",    winner: "Mexico" },       // Mexico won 2-0
  { id: "r32_8",  home: "England",      away: "DR Congo",   winner: "England" },      // England won 2-1
  { id: "r32_9",  home: "Portugal",     away: "Croatia",    winner: "Portugal" },     // Portugal won 2-1
  { id: "r32_10", home: "Spain",        away: "Austria",    winner: "Spain" },        // Spain won 3-0
  { id: "r32_11", home: "USA",          away: "Bosnia",     winner: "USA" },          // USA won 2-0
  { id: "r32_12", home: "Belgium",      away: "Senegal",    winner: "Belgium" },      // Belgium won 3-2
  { id: "r32_13", home: "Argentina",    away: "Cape Verde", winner: "" },             // Jul 3, not played yet
  { id: "r32_14", home: "Australia",    away: "Egypt",      winner: "" },             // Jul 3, not played yet
  { id: "r32_15", home: "Switzerland",  away: "Algeria",    winner: "Switzerland" }, // Switzerland won 2-0
  { id: "r32_16", home: "Colombia",     away: "Ghana",      winner: "" },             // Jul 3, not played yet
];

const R16_PAIRS = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]];
const QF_PAIRS  = [[0,1],[2,3],[4,5],[6,7]];
const SF_PAIRS  = [[0,1],[2,3]];

// ── HELPERS ────────────────────────────────────────────────────────────────
function isLocked() { return new Date() >= LOCK_TIME; }

function defaultBracket() {
  const b = { r32: {}, r16: {}, qf: {}, sf: {}, final: {}, champion: "" };
  R32_MATCHUPS.forEach(m => { b.r32[m.id] = m.winner || ""; });
  for (let i = 0; i < 8; i++) b.r16[i] = "";
  for (let i = 0; i < 4; i++) b.qf[i] = "";
  for (let i = 0; i < 2; i++) b.sf[i] = "";
  b.final[0] = "";
  return b;
}

// Build full bracket state for every family member: real picks where
// submitted, defaults otherwise.
function buildBrackets() {
  const brackets = {};
  FAMILY.forEach(p => {
    const submitted = PICKS[p];
    brackets[p] = submitted
      ? { ...defaultBracket(), ...submitted, r32: { ...defaultBracket().r32, ...(submitted.r32 || {}) } }
      : defaultBracket();
  });
  return brackets;
}

function calcScore(bracket) {
  let score = 0;
  for (let i = 0; i < 8; i++) {
    if (RESULTS.r16[i] && bracket.r16[i] === RESULTS.r16[i]) score += ROUND_POINTS.r16;
  }
  for (let i = 0; i < 4; i++) {
    if (RESULTS.qf[i] && bracket.qf[i] === RESULTS.qf[i]) score += ROUND_POINTS.qf;
  }
  for (let i = 0; i < 2; i++) {
    if (RESULTS.sf[i] && bracket.sf[i] === RESULTS.sf[i]) score += ROUND_POINTS.sf;
  }
  if (RESULTS.final[0] && bracket.final[0] === RESULTS.final[0]) score += ROUND_POINTS.final;
  if (RESULTS.champion && bracket.champion === RESULTS.champion) score += ROUND_POINTS.final;
  return score;
}

// ── COLORS ────────────────────────────────────────────────────────────────
const C = {
  bg: "#07111a", card: "#0d1f2d", border: "rgba(255,255,255,0.07)",
  gold: "#f0c040", silver: "#c0c8d8", bronze: "#cd7f45",
  dim: "#6b7f8e", white: "#e8f0f5", green: "#3dba6f", accent: "#1a8cff",
};
const accentFor = r => r === 1 ? C.gold : r === 2 ? C.silver : r === 3 ? C.bronze : C.dim;

// ── MATCHUP PICK BUTTON ────────────────────────────────────────────────────
function MatchupPick({ home, away, value, onChange, locked, actualWinner }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {[home, away].map(team => {
        const sel = value === team;
        const isCorrect = sel && actualWinner === team;
        const isWrong = sel && actualWinner && actualWinner !== team;
        const isActual = !sel && actualWinner === team;
        return (
          <button key={team} onClick={() => !locked && onChange(team)} style={{
            background: sel ? (isWrong ? "rgba(220,60,60,0.18)" : "rgba(240,192,64,0.15)") : isActual ? "rgba(61,186,111,0.10)" : C.card,
            border: `1px solid ${sel ? (isWrong ? "#dc3c3c" : C.gold) : isActual ? C.green : C.border}`,
            borderRadius: 5, color: sel ? C.gold : isActual ? C.green : C.white,
            fontFamily: "inherit", fontSize: 12, fontWeight: sel || isActual ? 700 : 400,
            padding: "7px 12px", cursor: locked ? "default" : "pointer",
            textAlign: "left", transition: "all 0.15s",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>{team}</span>
            {isCorrect && <span style={{ fontSize: 10 }}>✓</span>}
            {isWrong  && <span style={{ fontSize: 10 }}>✗</span>}
            {isActual && <span style={{ fontSize: 9, color: C.green }}>actual</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── ROUND SECTION ─────────────────────────────────────────────────────────
function RoundSection({ title, pts, matchups, picks, onPick, locked, actual }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold }}>{title}</div>
        {pts != null
          ? <div style={{ fontSize: 10, color: C.dim, background: "rgba(240,192,64,0.08)", border: `1px solid rgba(240,192,64,0.15)`, borderRadius: 3, padding: "2px 7px" }}>{pts}pt{pts > 1 ? "s" : ""} each</div>
          : <div style={{ fontSize: 10, color: C.dim, background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 3, padding: "2px 7px" }}>not scored</div>
        }
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
        {matchups.map((m, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: C.dim, marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>Match {i + 1}</div>
            <MatchupPick home={m.home} away={m.away} value={picks[i]} onChange={v => onPick(i, v)}
              locked={locked} actualWinner={actual ? actual[i] : null} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Build a compact JS-snippet string from a bracket object
function bracketToSnippet(name, bracket) {
  // Only include non-empty / non-prefilled r32 picks (user picks for undecided matches)
  const r32Out = {};
  R32_MATCHUPS.forEach(m => {
    if (!m.winner && bracket.r32[m.id]) r32Out[m.id] = bracket.r32[m.id];
  });
  const obj = {
    r32: r32Out,
    r16: bracket.r16,
    qf: bracket.qf,
    sf: bracket.sf,
    final: bracket.final,
    champion: bracket.champion,
  };
  return `"${name}": ${JSON.stringify(obj)},`;
}

// ── BRACKET ENTRY ──────────────────────────────────────────────────────────
function BracketEntry({ playerName, initialBracket, locked }) {
  const [bracket, setBracket] = useState(() => initialBracket || defaultBracket());
  const [snippet, setSnippet] = useState("");
  const [copied, setCopied] = useState(false);

  function pickR32(id, team) { if (!locked) { setBracket(prev => { const n = JSON.parse(JSON.stringify(prev)); n.r32[id] = team; return n; }); setSnippet(""); } }
  function pickR16(i, team)  { if (!locked) { setBracket(prev => { const n = JSON.parse(JSON.stringify(prev)); n.r16[i] = team; return n; }); setSnippet(""); } }
  function pickQF(i, team)   { if (!locked) { setBracket(prev => { const n = JSON.parse(JSON.stringify(prev)); n.qf[i] = team; return n; }); setSnippet(""); } }
  function pickSF(i, team)   { if (!locked) { setBracket(prev => { const n = JSON.parse(JSON.stringify(prev)); n.sf[i] = team; return n; }); setSnippet(""); } }
  function pickFinal(team)   { if (!locked) { setBracket(prev => { const n = JSON.parse(JSON.stringify(prev)); n.final[0] = team; return n; }); setSnippet(""); } }

  const r16Matchups = R16_PAIRS.map(([a, b]) => ({
    home: bracket.r32[R32_MATCHUPS[a].id] || `Winner M${a+1}`,
    away: bracket.r32[R32_MATCHUPS[b].id] || `Winner M${b+1}`,
  }));
  const qfMatchups = QF_PAIRS.map(([a, b]) => ({
    home: bracket.r16[a] || `R16 Winner ${a+1}`,
    away: bracket.r16[b] || `R16 Winner ${b+1}`,
  }));
  const sfMatchups = SF_PAIRS.map(([a, b]) => ({
    home: bracket.qf[a] || `QF Winner ${a+1}`,
    away: bracket.qf[b] || `QF Winner ${b+1}`,
  }));
  const finalMatchup = {
    home: bracket.sf[0] || "SF Winner 1",
    away: bracket.sf[1] || "SF Winner 2",
  };
  const finalTeams = [bracket.sf[0], bracket.sf[1]].filter(Boolean);

  function handleGenerate() {
    setSnippet(bracketToSnippet(playerName, bracket));
    setCopied(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) { /* clipboard may be blocked; user can select manually */ }
  }

  return (
    <div>
      <RoundSection title="Round of 32" pts={null}
        matchups={R32_MATCHUPS.map(m => ({ home: m.home, away: m.away }))}
        picks={R32_MATCHUPS.map(m => bracket.r32[m.id] || "")}
        onPick={(i, v) => { if (!R32_MATCHUPS[i].winner) pickR32(R32_MATCHUPS[i].id, v); }}
        locked={locked}
        actual={R32_MATCHUPS.map(m => m.winner || null)} />

      <RoundSection title="Round of 16" pts={2}
        matchups={r16Matchups}
        picks={Array.from({ length: 8 }, (_, i) => bracket.r16[i] || "")}
        onPick={pickR16} locked={locked} actual={null} />

      <RoundSection title="Quarterfinals" pts={4}
        matchups={qfMatchups}
        picks={Array.from({ length: 4 }, (_, i) => bracket.qf[i] || "")}
        onPick={pickQF} locked={locked} actual={null} />

      <RoundSection title="Semifinals" pts={8}
        matchups={sfMatchups}
        picks={Array.from({ length: 2 }, (_, i) => bracket.sf[i] || "")}
        onPick={pickSF} locked={locked} actual={null} />

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold }}>Final</div>
          <div style={{ fontSize: 10, color: C.dim, background: "rgba(240,192,64,0.08)", border: `1px solid rgba(240,192,64,0.15)`, borderRadius: 3, padding: "2px 7px" }}>16pts</div>
        </div>
        <div style={{ maxWidth: 220 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: C.dim, marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>Match 1</div>
            <MatchupPick home={finalMatchup.home} away={finalMatchup.away}
              value={bracket.final[0]} onChange={pickFinal}
              locked={locked} actualWinner={null} />
          </div>
        </div>
      </div>

      {bracket.final[0] && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold, marginBottom: 12 }}>
            🏆 World Cup Champion <span style={{ color: C.dim, fontWeight: 400 }}>— bonus 16pts</span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {finalTeams.length > 0 ? finalTeams.map(team => (
              <button key={team} onClick={() => !locked && setBracket(prev => ({ ...prev, champion: team }))}
                style={{
                  background: bracket.champion === team ? "rgba(240,192,64,0.15)" : C.card,
                  border: `1px solid ${bracket.champion === team ? C.gold : C.border}`,
                  borderRadius: 6, color: bracket.champion === team ? C.gold : C.white,
                  fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                  padding: "10px 22px", cursor: locked ? "default" : "pointer",
                }}>{team}</button>
            )) : (
              <div style={{ fontSize: 12, color: C.dim }}>Pick your Final teams first to select a champion.</div>
            )}
          </div>
        </div>
      )}

      {!locked && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: snippet ? 16 : 0 }}>
            <button onClick={handleGenerate} style={{
              background: C.gold, color: "#07111a", border: "none", borderRadius: 5,
              fontWeight: 800, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "11px 26px", cursor: "pointer", fontFamily: "inherit",
            }}>Generate My Code</button>
          </div>

          {snippet && (
            <div style={{ background: C.card, border: `1px solid rgba(240,192,64,0.25)`, borderRadius: 8, padding: 18 }}>
              <div style={{ fontSize: 12, color: C.dim, marginBottom: 10, lineHeight: 1.6 }}>
                Copy this code and send it to <strong style={{ color: C.white }}>Ivan</strong> (text or email).
                He'll paste it into the tracker to register your picks.
              </div>
              <textarea readOnly value={snippet} rows={4}
                style={{
                  width: "100%", background: "#07111a", border: `1px solid ${C.border}`, borderRadius: 5,
                  color: C.gold, fontFamily: "monospace", fontSize: 11, padding: 10, resize: "vertical",
                }}
                onClick={e => e.target.select()} />
              <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
                <button onClick={handleCopy} style={{
                  background: "none", border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 5,
                  fontWeight: 700, fontSize: 12, padding: "8px 18px", cursor: "pointer", fontFamily: "inherit",
                }}>Copy Code</button>
                {copied && <span style={{ fontSize: 12, color: C.green }}>✓ Copied!</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── LEADERBOARD ────────────────────────────────────────────────────────────
function Leaderboard({ brackets }) {
  const scores = FAMILY.map(p => ({ name: p, score: calcScore(brackets[p]), submitted: !!PICKS[p] }));
  scores.sort((a, b) => b.score - a.score);
  const max = Math.max(...scores.map(s => s.score), 1);

  return (
    <div style={{ marginBottom: 36 }}>
      {scores.map(({ name, score, submitted }, i) => {
        const rank = i + 1;
        const accent = accentFor(rank);
        const pct = Math.round((score / max) * 100);
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
        return (
          <div key={name} style={{
            display: "grid", gridTemplateColumns: "38px 1fr 64px", alignItems: "center", gap: 12,
            background: rank <= 3 ? `rgba(${rank===1?"240,192,64":rank===2?"192,200,216":"205,127,69"},0.07)` : C.card,
            border: `1px solid ${rank <= 3 ? accent : C.border}`,
            borderRadius: 6, padding: "12px 16px", marginBottom: 7,
            opacity: submitted ? 1 : 0.55,
          }}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 20, textAlign: "center", color: accent, fontWeight: 700 }}>{medal}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                {name}
                {!submitted && <span style={{ fontSize: 9, color: C.dim, fontWeight: 400, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 6px" }}>no bracket yet</span>}
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: accent, borderRadius: 2, transition: "width 0.5s" }} />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Georgia,serif", fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>pts</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("leaderboard");
  const [playerName, setPlayerName] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [nameErr, setNameErr] = useState("");
  const [showPwGate, setShowPwGate] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pwVal, setPwVal] = useState("");
  const [pwErr, setPwErr] = useState("");
  const locked = isLocked();
  const brackets = buildBrackets();

  function confirmName() {
    const trimmed = playerName.trim();
    if (!trimmed) { setNameErr("Please enter your name."); return; }
    setPlayerName(trimmed);
    setNameConfirmed(true);
    setNameErr("");
  }

  function checkPw() {
    if (pwVal === ADMIN_PASSWORD) {
      setAdminUnlocked(true); setShowPwGate(false); setPwErr(""); setPwVal("");
    } else { setPwErr("Incorrect password."); }
  }

  const inputStyle = {
    background: C.card, border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 5,
    color: C.white, fontFamily: "inherit", fontSize: 14, padding: "10px 14px", outline: "none",
  };

  const navBtn = (label, target) => (
    <button onClick={() => setView(target)} style={{
      background: view === target ? "rgba(240,192,64,0.12)" : "none",
      border: `1px solid ${view === target ? C.gold : C.border}`,
      borderRadius: 5, color: view === target ? C.gold : C.dim,
      fontFamily: "inherit", fontSize: 12, fontWeight: 600,
      padding: "7px 16px", cursor: "pointer", letterSpacing: "0.04em",
    }}>{label}</button>
  );

  const lockLabel = locked ? "🔒 Brackets locked · July 4 @ 12:59 PM ET" : "⏳ Locks July 4 @ 12:59 PM ET";

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", background: C.bg, color: C.white, minHeight: "100vh" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)",
        backgroundSize: "52px 52px" }} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 60px", position: "relative", zIndex: 1 }}>

        <header style={{ textAlign: "center", padding: "40px 0 24px", borderBottom: `1px solid rgba(240,192,64,0.12)`, marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: C.gold, marginBottom: 8 }}>FIFA World Cup 2026</div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(34px,8vw,72px)", lineHeight: 0.93, fontWeight: 700, margin: 0 }}>
            Knockout <span style={{ color: C.gold }}>Bracket</span>
          </h1>
          <p style={{ marginTop: 10, fontSize: 12, color: C.dim }}>Round of 32 → Champion · 10 Competitors · Scoring from R16 onwards</p>
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11,
            color: locked ? "#e05252" : C.dim, background: "rgba(255,255,255,0.03)",
            border: `1px solid ${locked ? "rgba(224,82,82,0.3)" : C.border}`, borderRadius: 4, padding: "4px 12px" }}>
            {lockLabel}
          </div>
        </header>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {navBtn("🏆 Leaderboard", "leaderboard")}
            {navBtn(locked ? "📋 View Bracket" : "✏️ Fill Out Bracket", "submit")}
          </div>
          <button onClick={() => { if (adminUnlocked) { setAdminUnlocked(false); } else setShowPwGate(p => !p); }}
            style={{ background: "none", border: `1px solid ${C.border}`, color: C.dim, fontSize: 11, fontFamily: "inherit", padding: "5px 12px", borderRadius: 4, cursor: "pointer" }}>
            {adminUnlocked ? "🔒 Hide Admin Info" : "⚙ Admin"}
          </button>
        </div>

        {showPwGate && !adminUnlocked && (
          <div style={{ background: C.card, border: `1px solid rgba(240,192,64,0.18)`, borderRadius: 8, padding: 24, maxWidth: 340, margin: "0 auto 24px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: C.dim, marginBottom: 14 }}>Enter admin password.</p>
            <input type="password" placeholder="Password" value={pwVal}
              onChange={e => setPwVal(e.target.value)} onKeyDown={e => e.key === "Enter" && checkPw()}
              style={{ ...inputStyle, width: "100%", marginBottom: 10 }} />
            <button onClick={checkPw} style={{ width: "100%", background: C.gold, color: "#07111a", border: "none", borderRadius: 5, fontWeight: 800, fontSize: 13, padding: "10px", cursor: "pointer", fontFamily: "inherit" }}>Unlock</button>
            {pwErr && <div style={{ fontSize: 12, color: "#e05252", marginTop: 8 }}>{pwErr}</div>}
          </div>
        )}

        {adminUnlocked && (
          <div style={{ background: C.card, border: `1px solid rgba(240,192,64,0.2)`, borderRadius: 10, padding: 24, marginBottom: 28, fontSize: 13, color: C.dim, lineHeight: 1.8 }}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700, color: C.gold, marginBottom: 10 }}>Admin Notes</div>
            <div><span style={{ color: C.gold, fontWeight: 700 }}>To add a family member's picks:</span> paste their code snippet into <code style={{ background: "rgba(255,255,255,0.07)", padding: "1px 5px", borderRadius: 3 }}>src/picks.js</code>, then push to GitHub.</div>
            <div style={{ marginTop: 8 }}><span style={{ color: C.gold, fontWeight: 700 }}>To update match results:</span> edit the <code style={{ background: "rgba(255,255,255,0.07)", padding: "1px 5px", borderRadius: 3 }}>RESULTS</code> object at the top of <code style={{ background: "rgba(255,255,255,0.07)", padding: "1px 5px", borderRadius: 3 }}>src/App.js</code>, then push.</div>
            <div style={{ marginTop: 8 }}>Vercel redeploys automatically in ~60 seconds after each push.</div>
          </div>
        )}

        {view === "leaderboard" && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold, marginBottom: 14 }}>🏆 Standings</div>
            <Leaderboard brackets={brackets} />
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "14px 18px", display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[["#f0c040","2pts · Round of 16"],["#c0c8d8","4pts · Quarterfinal"],["#cd7f45","8pts · Semifinal"],["#1a8cff","16pts · Final & Champion"]].map(([color, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.dim }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />{label}
                </div>
              ))}
            </div>
          </>
        )}

        {view === "submit" && (
          <>
            {!nameConfirmed ? (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 28, maxWidth: 380, margin: "0 auto" }}>
                <div style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700, color: C.gold, marginBottom: 6 }}>Who are you?</div>
                <p style={{ fontSize: 13, color: C.dim, marginBottom: 16 }}>
                  Enter your name, fill out your bracket, then generate a code to send to Ivan.
                </p>
                <input placeholder="Your name" value={playerName} onChange={e => setPlayerName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && confirmName()}
                  style={{ ...inputStyle, width: "100%", marginBottom: 10 }} />
                <button onClick={confirmName} style={{ width: "100%", background: C.gold, color: "#07111a", border: "none", borderRadius: 5, fontWeight: 800, fontSize: 13, padding: "10px", cursor: "pointer", fontFamily: "inherit" }}>
                  {locked ? "View Bracket" : "Start My Bracket"}
                </button>
                {nameErr && <div style={{ fontSize: 12, color: "#e05252", marginTop: 8 }}>{nameErr}</div>}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700 }}>{playerName}'s Bracket</div>
                    {locked
                      ? <div style={{ fontSize: 12, color: "#e05252", marginTop: 4 }}>🔒 Brackets are locked — viewing only</div>
                      : <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>Fill out your picks, then generate your code below to send to Ivan</div>
                    }
                  </div>
                  <button onClick={() => { setNameConfirmed(false); setPlayerName(""); }}
                    style={{ background: "none", border: `1px solid ${C.border}`, color: C.dim, fontSize: 11, fontFamily: "inherit", padding: "5px 12px", borderRadius: 4, cursor: "pointer" }}>
                    Change name
                  </button>
                </div>
                {PICKS[playerName] && (
                  <div style={{ fontSize: 12, color: C.green, marginBottom: 16, background: "rgba(61,186,111,0.08)", border: "1px solid rgba(61,186,111,0.2)", borderRadius: 5, padding: "8px 14px" }}>
                    ✓ Ivan already has a bracket on file for you. Filling this out again and sending a new code will update your picks.
                  </div>
                )}
                <BracketEntry playerName={playerName} initialBracket={brackets[playerName]} locked={locked} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
