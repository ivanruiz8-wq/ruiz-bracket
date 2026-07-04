import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── SUPABASE ───────────────────────────────────────────────────────────────
const supabase = createClient(
  "https://cdtmqrdiugvhbgxtrekr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdG1xcmRpdWd2aGJneHRyZWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwOTAxODUsImV4cCI6MjA5ODY2NjE4NX0.XlKDJhcricCOBaEcFlIzhNgV_TVhQqX5GPn3IvMJ9TU"
);

// ── CONFIG ─────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "Youdabest123$!$";
const LOCK_TIME = new Date("2026-07-04T22:00:00Z");

const FAMILY = [
  "Ivan Sr","Ivan Jr","Isabella","Alfonso","Edgard",
  "Edgard Alfonso","Yvette","Giovanna","Tatiana","Alex"
];

const ROUND_POINTS = { r16: 2, qf: 4, sf: 8, final: 16 };

// ── ACTUAL RESULTS (update & push to redeploy) ─────────────────────────────
const RESULTS = {
  r16:     { 0:"", 1:"", 2:"", 3:"", 4:"", 5:"", 6:"", 7:"" },
  qf:      { 0:"", 1:"", 2:"", 3:"" },
  sf:      { 0:"", 1:"" },
  champion: "",
};

// ── R32 MATCHUPS ───────────────────────────────────────────────────────────
// R32 ordered so adjacent pairs feed the correct R16 match.
// Verified against FIFA official bracket (matches 73-88).
//
// R16[0] = M89: Paraguay(M74) vs Norway(M77)
// R16[1] = M90: Canada(M73) vs Morocco(M75)
// R16[2] = M91: Brazil(M76) vs Mexico(M79)  ← Brazil & France in SAME half → can only meet in final
// R16[3] = M92: England(M80) vs Colombia(M87... wait - M87 is Colombia, M80 is England)
// R16[4] = M93: Portugal(M83) vs Spain(M84)
// R16[5] = M94: USA(M81) vs Belgium(M82)
// R16[6] = M95: Argentina(M86) vs Egypt(M88)
// R16[7] = M96: Switzerland(M85) vs Colombia(M87)
//
// QF: M97=R16[0]vsR16[1], M99=R16[2]vsR16[3], M98=R16[4]vsR16[5], M100=R16[6]vsR16[7]
// SF: M101=QF_M97 vs QF_M98 (Dallas), M102=QF_M99 vs QF_M100 (Atlanta)
// Final: M101 winner vs M102 winner
//
// Top half (can meet in SF1): Paraguay/France/Canada/Morocco AND Brazil/Norway/England/Colombia(GHA)
// Bottom half (can meet in SF2): Portugal/Spain/USA/Belgium AND Argentina/Egypt/Switzerland/Colombia
//
// France and Brazil: France in top half (M89), Brazil in top half (M91) → SF1 → FINAL only ✓

// R16 matches (M89-M96) and their R32 feeders, in correct bracket order:
// M89: Paraguay(M74) vs France(M77)   → QF M97 (Boston)  ─┐ SF1 Dallas
// M90: Canada(M73)   vs Morocco(M75)  → QF M97 (Boston)  ─┘
// M93: Portugal(M83) vs Spain(M84)    → QF M98 (LA)      ─┐ SF1 Dallas
// M94: USA(M81)      vs Belgium(M82)  → QF M98 (LA)      ─┘
//
// M91: Brazil(M76)   vs Norway(M78*)  → QF M99 (Miami)   ─┐ SF2 Atlanta  ← France & Brazil different halves ✓
// M92: Mexico(M79)   vs England(M80)  → QF M99 (Miami)   ─┘
// M95: Argentina(M86)vs Egypt(M88)    → QF M100 (KC)     ─┐ SF2 Atlanta
// M96: Switzerland(M85) vs Colombia(M87) → QF M100 (KC)  ─┘
//
// *M78=Ivory Coast/Norway result → Norway

const R32_MATCHUPS = [
  // → R16[0] = M89: Paraguay vs France
  { id:"r32_4",  home:"Germany",      away:"Paraguay",    winner:"Paraguay"     }, // M74
  { id:"r32_3",  home:"France",       away:"Sweden",      winner:"France"       }, // M77
  // → R16[1] = M90: Canada vs Morocco
  { id:"r32_2",  home:"South Africa", away:"Canada",      winner:"Canada"       }, // M73
  { id:"r32_1",  home:"Netherlands",  away:"Morocco",     winner:"Morocco"      }, // M75
  // → R16[2] = M93: Portugal vs Spain  (SF1 bottom, same half as France)
  { id:"r32_9",  home:"Portugal",     away:"Croatia",     winner:"Portugal"     }, // M83
  { id:"r32_10", home:"Spain",        away:"Austria",     winner:"Spain"        }, // M84
  // → R16[3] = M94: USA vs Belgium     (SF1 bottom)
  { id:"r32_11", home:"USA",          away:"Bosnia",      winner:"USA"          }, // M81
  { id:"r32_12", home:"Belgium",      away:"Senegal",     winner:"Belgium"      }, // M82
  // → R16[4] = M91: Brazil vs Norway   (SF2, different half from France ✓)
  { id:"r32_5",  home:"Brazil",       away:"Japan",       winner:"Brazil"       }, // M76
  { id:"r32_6",  home:"Ivory Coast",  away:"Norway",      winner:"Norway"       }, // M78
  // → R16[5] = M92: Mexico vs England  (SF2)
  { id:"r32_7",  home:"Mexico",       away:"Ecuador",     winner:"Mexico"       }, // M79
  { id:"r32_8",  home:"England",      away:"DR Congo",    winner:"England"      }, // M80
  // → R16[6] = M95: Argentina vs Egypt (SF2)
  { id:"r32_13", home:"Argentina",    away:"Cape Verde",  winner:"Argentina"    }, // M86
  { id:"r32_14", home:"Australia",    away:"Egypt",       winner:"Egypt"        }, // M88
  // → R16[7] = M96: Switzerland vs Colombia (SF2)
  { id:"r32_15", home:"Switzerland",  away:"Algeria",     winner:"Switzerland"  }, // M85
  { id:"r32_16", home:"Colombia",     away:"Ghana",       winner:"Colombia"     }, // M87
];

// Adjacent pairs feed R16 matches 0-7
const R16_PAIRS = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]];
// QF: [0,1]=R16[0]vsR16[1]=M97, [2,3]=R16[2]vsR16[3]=M98 → SF1 (Dallas)
//     [4,5]=R16[4]vsR16[5]=M99, [6,7]=R16[6]vsR16[7]=M100 → SF2 (Atlanta)
const QF_PAIRS = [[0,1],[2,3],[4,5],[6,7]];
// SF1 (Dallas)  = QF[0](M97) vs QF[1](M98) → France/Morocco half vs Portugal/Spain/USA half
// SF2 (Atlanta) = QF[2](M99) vs QF[3](M100) → Brazil/Norway/Mexico/England half vs Argentina/Egypt/Switzerland half
// France and Brazil are in DIFFERENT SF halves → can only meet in the Final ✓
const SF_PAIRS = [[0,1],[2,3]];

// ── HELPERS ────────────────────────────────────────────────────────────────
const isLocked = () => new Date() >= LOCK_TIME;

function defaultBracket() {
  const b = { r32:{}, r16:{}, qf:{}, sf:{}, final:{}, champion:"" };
  R32_MATCHUPS.forEach(m => { b.r32[m.id] = m.winner || ""; });
  for (let i=0;i<8;i++) b.r16[i]="";
  for (let i=0;i<4;i++) b.qf[i]="";
  for (let i=0;i<2;i++) b.sf[i]="";
  b.final[0]="";
  return b;
}

function calcScore(bracket) {
  let score = 0;
  for (let i=0;i<8;i++) if (RESULTS.r16[i] && bracket.r16[i]===RESULTS.r16[i]) score+=ROUND_POINTS.r16;
  for (let i=0;i<4;i++) if (RESULTS.qf[i]  && bracket.qf[i] ===RESULTS.qf[i])  score+=ROUND_POINTS.qf;
  for (let i=0;i<2;i++) if (RESULTS.sf[i]  && bracket.sf[i] ===RESULTS.sf[i])  score+=ROUND_POINTS.sf;
  // Final: only the champion pick scores (16pts) — picking the finalist who wins = champion pick
  if (RESULTS.champion && bracket.champion === RESULTS.champion) score+=ROUND_POINTS.final;
  return score;
}

// ── COLORS ────────────────────────────────────────────────────────────────
const C = {
  bg:"#07111a", card:"#0d1f2d", border:"rgba(255,255,255,0.07)",
  gold:"#f0c040", silver:"#c0c8d8", bronze:"#cd7f45",
  dim:"#6b7f8e", white:"#e8f0f5", green:"#3dba6f",
};
const accentFor = r => r===1?C.gold:r===2?C.silver:r===3?C.bronze:C.dim;

// ── MATCHUP BUTTON ─────────────────────────────────────────────────────────
function MatchupPick({ home, away, value, onChange, locked, actualWinner }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      {[home,away].map(team => {
        const sel=value===team;
        const isCorrect=sel&&actualWinner===team;
        const isWrong=sel&&actualWinner&&actualWinner!==team;
        const isActual=!sel&&actualWinner===team;
        return (
          <button key={team} onClick={()=>!locked&&onChange(team)} style={{
            background: sel?(isWrong?"rgba(220,60,60,0.18)":"rgba(240,192,64,0.15)"):isActual?"rgba(61,186,111,0.10)":C.card,
            border:`1px solid ${sel?(isWrong?"#dc3c3c":C.gold):isActual?C.green:C.border}`,
            borderRadius:5, color:sel?C.gold:isActual?C.green:C.white,
            fontFamily:"inherit", fontSize:12, fontWeight:sel||isActual?700:400,
            padding:"7px 12px", cursor:locked?"default":"pointer",
            textAlign:"left", transition:"all 0.15s",
            display:"flex", justifyContent:"space-between", alignItems:"center",
          }}>
            <span>{team}</span>
            {isCorrect&&<span style={{fontSize:10}}>✓</span>}
            {isWrong&&<span style={{fontSize:10}}>✗</span>}
            {isActual&&<span style={{fontSize:9,color:C.green}}>actual</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── ROUND SECTION ──────────────────────────────────────────────────────────
function RoundSection({ title, pts, matchups, picks, onPick, locked, actual }) {
  return (
    <div style={{marginBottom:32}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:C.gold}}>{title}</div>
        {pts!=null
          ? <div style={{fontSize:10,color:C.dim,background:"rgba(240,192,64,0.08)",border:`1px solid rgba(240,192,64,0.15)`,borderRadius:3,padding:"2px 7px"}}>{pts}pt{pts>1?"s":""} each</div>
          : <div style={{fontSize:10,color:C.dim,background:"rgba(255,255,255,0.04)",border:`1px solid rgba(255,255,255,0.08)`,borderRadius:3,padding:"2px 7px"}}>not scored</div>
        }
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))",gap:10}}>
        {matchups.map((m,i)=>(
          <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:7,padding:"12px 14px"}}>
            <div style={{fontSize:9,color:C.dim,marginBottom:8,letterSpacing:"0.1em",textTransform:"uppercase"}}>Match {i+1}</div>
            <MatchupPick home={m.home} away={m.away} value={picks[i]} onChange={v=>onPick(i,v)}
              locked={locked} actualWinner={actual?actual[i]:null}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SAVE INDICATOR ─────────────────────────────────────────────────────────
function SaveIndicator({ status }) {
  if (!status) return null;
  const configs = {
    saving: { color: C.dim,   text: "Saving…" },
    saved:  { color: C.green, text: "✓ Saved" },
    error:  { color: "#e05252", text: "⚠ Save failed — check connection" },
  };
  const cfg = configs[status];
  return <div style={{fontSize:12,color:cfg.color,transition:"color 0.3s"}}>{cfg.text}</div>;
}

// ── BRACKET ENTRY ──────────────────────────────────────────────────────────
function BracketEntry({ playerName, initialBracket, locked }) {
  const [bracket, setBracket] = useState(()=>initialBracket||defaultBracket());
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(()=>{ setBracket(initialBracket||defaultBracket()); },[initialBracket]);

  async function savePick(newBracket) {
    setSaveStatus("saving");
    try {
      const { error } = await supabase.from("brackets").upsert({
        player_name: playerName,
        picks: newBracket,
        updated_at: new Date().toISOString(),
      }, { onConflict: "player_name" });
      if (error) throw error;
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus(null), 2000);
    } catch(e) {
      console.error(e);
      setSaveStatus("error");
      setTimeout(()=>setSaveStatus(null), 4000);
    }
  }

  function pick(updater) {
    if (locked) return;
    setBracket(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      updater(next);
      savePick(next);
      return next;
    });
  }

  const r16Matchups = R16_PAIRS.map(([a,b])=>({
    home: bracket.r32[R32_MATCHUPS[a].id]||`Winner M${a+1}`,
    away: bracket.r32[R32_MATCHUPS[b].id]||`Winner M${b+1}`,
  }));
  const qfMatchups = QF_PAIRS.map(([a,b])=>({
    home: bracket.r16[a]||`R16 Winner ${a+1}`,
    away: bracket.r16[b]||`R16 Winner ${b+1}`,
  }));
  const sfMatchups = SF_PAIRS.map(([a,b])=>({
    home: bracket.qf[a]||`QF Winner ${a+1}`,
    away: bracket.qf[b]||`QF Winner ${b+1}`,
  }));
  const finalMatchup = {
    home: bracket.sf[0]||"SF Winner 1",
    away: bracket.sf[1]||"SF Winner 2",
  };
  const finalTeams = [bracket.sf[0],bracket.sf[1]].filter(Boolean);

  return (
    <div>
      {/* Save indicator — sticky top right */}
      <div style={{position:"sticky",top:12,zIndex:10,display:"flex",justifyContent:"flex-end",marginBottom:-28,pointerEvents:"none"}}>
        <div style={{background:"rgba(7,17,26,0.85)",borderRadius:5,padding:"4px 12px",backdropFilter:"blur(4px)"}}>
          <SaveIndicator status={saveStatus}/>
        </div>
      </div>

      <RoundSection title="Round of 32" pts={null}
        matchups={R32_MATCHUPS.map(m=>({home:m.home,away:m.away}))}
        picks={R32_MATCHUPS.map(m=>bracket.r32[m.id]||"")}
        onPick={(i,v)=>{ if(!R32_MATCHUPS[i].winner) pick(n=>{ n.r32[R32_MATCHUPS[i].id]=v; }); }}
        locked={locked}
        actual={R32_MATCHUPS.map(m=>m.winner||null)}/>

      <RoundSection title="Round of 16" pts={2}
        matchups={r16Matchups}
        picks={Array.from({length:8},(_,i)=>bracket.r16[i]||"")}
        onPick={(i,v)=>pick(n=>{ n.r16[i]=v; })}
        locked={locked} actual={null}/>

      <RoundSection title="Quarterfinals" pts={4}
        matchups={qfMatchups}
        picks={Array.from({length:4},(_,i)=>bracket.qf[i]||"")}
        onPick={(i,v)=>pick(n=>{ n.qf[i]=v; })}
        locked={locked} actual={null}/>

      <RoundSection title="Semifinals" pts={8}
        matchups={sfMatchups}
        picks={Array.from({length:2},(_,i)=>bracket.sf[i]||"")}
        onPick={(i,v)=>pick(n=>{ n.sf[i]=v; })}
        locked={locked} actual={null}/>

      {/* Final */}
      <div style={{marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:C.gold}}>Final</div>
          <div style={{fontSize:10,color:C.dim,background:"rgba(240,192,64,0.08)",border:`1px solid rgba(240,192,64,0.15)`,borderRadius:3,padding:"2px 7px"}}>16pts</div>
        </div>
        <div style={{maxWidth:220}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:7,padding:"12px 14px"}}>
            <div style={{fontSize:9,color:C.dim,marginBottom:8,letterSpacing:"0.1em",textTransform:"uppercase"}}>Match 1</div>
            <MatchupPick home={finalMatchup.home} away={finalMatchup.away}
              value={bracket.final[0]} onChange={v=>pick(n=>{ n.final[0]=v; })}
              locked={locked} actualWinner={null}/>
          </div>
        </div>
      </div>

      {/* Champion */}
      {bracket.final[0] && (
        <div style={{marginBottom:28}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:C.gold,marginBottom:12}}>
            🏆 World Cup Champion <span style={{color:C.dim,fontWeight:400}}>— bonus 16pts</span>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {finalTeams.length>0 ? finalTeams.map(team=>(
              <button key={team} onClick={()=>pick(n=>{ n.champion=team; })}
                style={{
                  background:bracket.champion===team?"rgba(240,192,64,0.15)":C.card,
                  border:`1px solid ${bracket.champion===team?C.gold:C.border}`,
                  borderRadius:6,color:bracket.champion===team?C.gold:C.white,
                  fontFamily:"inherit",fontSize:14,fontWeight:700,
                  padding:"10px 22px",cursor:locked?"default":"pointer",
                }}>{team}</button>
            )) : (
              <div style={{fontSize:12,color:C.dim}}>Pick your Final teams first.</div>
            )}
          </div>
        </div>
      )}

      {locked && (
        <div style={{fontSize:12,color:"#e05252",padding:"10px 14px",background:"rgba(224,82,82,0.08)",border:"1px solid rgba(224,82,82,0.2)",borderRadius:5}}>
          🔒 Brackets are locked — viewing only
        </div>
      )}
    </div>
  );
}

// ── LEADERBOARD ────────────────────────────────────────────────────────────
function Leaderboard({ allPicks }) {
  const scores = FAMILY.map(p=>({
    name:p,
    score: calcScore(allPicks[p]||defaultBracket()),
    submitted: !!allPicks[p],
  }));
  scores.sort((a,b)=>b.score-a.score);
  const max = Math.max(...scores.map(s=>s.score),1);

  return (
    <div style={{marginBottom:36}}>
      {scores.map(({name,score,submitted},i)=>{
        const rank=i+1;
        const accent=accentFor(rank);
        const pct=Math.round((score/max)*100);
        const medal=rank===1?"🥇":rank===2?"🥈":rank===3?"🥉":rank;
        return (
          <div key={name} style={{
            display:"grid",gridTemplateColumns:"38px 1fr 64px",alignItems:"center",gap:12,
            background:rank<=3?`rgba(${rank===1?"240,192,64":rank===2?"192,200,216":"205,127,69"},0.07)`:C.card,
            border:`1px solid ${rank<=3?accent:C.border}`,
            borderRadius:6,padding:"12px 16px",marginBottom:7,
            opacity:submitted?1:0.55,
          }}>
            <div style={{fontFamily:"Georgia,serif",fontSize:20,textAlign:"center",color:accent,fontWeight:700}}>{medal}</div>
            <div>
              <div style={{fontWeight:600,fontSize:14,marginBottom:5,display:"flex",alignItems:"center",gap:8}}>
                {name}
                {!submitted&&<span style={{fontSize:9,color:C.dim,fontWeight:400,border:`1px solid ${C.border}`,borderRadius:3,padding:"1px 6px"}}>no bracket yet</span>}
              </div>
              <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2}}>
                <div style={{height:"100%",width:`${pct}%`,background:accent,borderRadius:2,transition:"width 0.5s"}}/>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:26,fontWeight:700,lineHeight:1}}>{score}</div>
              <div style={{fontSize:9,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>pts</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]                   = useState("leaderboard");
  const [playerName, setPlayerName]       = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [nameErr, setNameErr]             = useState("");
  const [showPwGate, setShowPwGate]       = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pwVal, setPwVal]                 = useState("");
  const [pwErr, setPwErr]                 = useState("");
  const [allPicks, setAllPicks]           = useState({});
  const [myBracket, setMyBracket]         = useState(null);
  const [loading, setLoading]             = useState(true);
  const locked = isLocked();

  // Load all picks from Supabase on mount + poll every 10s
  async function loadAllPicks() {
    try {
      const { data, error } = await supabase.from("brackets").select("player_name, picks");
      if (error) throw error;
      const map = {};
      data.forEach(row => { map[row.player_name] = row.picks; });
      setAllPicks(map);
    } catch(e) { console.error("Load error", e); }
    setLoading(false);
  }

  useEffect(()=>{
    loadAllPicks();
    const iv = setInterval(loadAllPicks, 10000);
    return ()=>clearInterval(iv);
  },[]);

  // When player is confirmed, load their bracket
  useEffect(()=>{
    if (nameConfirmed && playerName) {
      setMyBracket(allPicks[playerName] || defaultBracket());
    }
  },[nameConfirmed, playerName, allPicks]);

  function confirmName() {
    const trimmed = playerName.trim();
    if (!trimmed) { setNameErr("Please select your name."); return; }
    setPlayerName(trimmed);
    setNameConfirmed(true);
    setNameErr("");
  }

  function checkPw() {
    if (pwVal===ADMIN_PASSWORD) {
      setAdminUnlocked(true); setShowPwGate(false); setPwErr(""); setPwVal("");
    } else { setPwErr("Incorrect password."); }
  }

  const inputStyle = {
    background:C.card, border:`1px solid rgba(255,255,255,0.12)`, borderRadius:5,
    color:C.white, fontFamily:"inherit", fontSize:14, padding:"10px 14px", outline:"none",
  };

  const navBtn = (label, target) => (
    <button onClick={()=>setView(target)} style={{
      background:view===target?"rgba(240,192,64,0.12)":"none",
      border:`1px solid ${view===target?C.gold:C.border}`,
      borderRadius:5, color:view===target?C.gold:C.dim,
      fontFamily:"inherit", fontSize:12, fontWeight:600,
      padding:"7px 16px", cursor:"pointer", letterSpacing:"0.04em",
    }}>{label}</button>
  );

  const lockLabel = locked
    ? "🔒 Brackets locked · July 4 @ 4:00 PM ET"
    : "⏳ Locks July 4 @ 4:00 PM ET";

  return (
    <div style={{fontFamily:"'Inter','Helvetica Neue',sans-serif",background:C.bg,color:C.white,minHeight:"100vh"}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        backgroundImage:"linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)",
        backgroundSize:"52px 52px"}}/>

      <div style={{maxWidth:900,margin:"0 auto",padding:"0 16px 60px",position:"relative",zIndex:1}}>

        {/* Header */}
        <header style={{textAlign:"center",padding:"40px 0 24px",borderBottom:`1px solid rgba(240,192,64,0.12)`,marginBottom:28}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.24em",textTransform:"uppercase",color:C.gold,marginBottom:8}}>FIFA World Cup 2026</div>
          <h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(34px,8vw,72px)",lineHeight:0.93,fontWeight:700,margin:0}}>
            Knockout <span style={{color:C.gold}}>Bracket</span>
          </h1>
          <p style={{marginTop:10,fontSize:12,color:C.dim}}>Round of 32 → Champion · 10 Competitors · Scoring from R16 onwards</p>
          <div style={{marginTop:12,display:"inline-flex",alignItems:"center",gap:6,fontSize:11,
            color:locked?"#e05252":C.dim,background:"rgba(255,255,255,0.03)",
            border:`1px solid ${locked?"rgba(224,82,82,0.3)":C.border}`,borderRadius:4,padding:"4px 12px"}}>
            {lockLabel}
          </div>
        </header>

        {/* Nav */}
        <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:8}}>
            {navBtn("🏆 Leaderboard","leaderboard")}
            {navBtn(locked?"📋 View Bracket":"✏️ Fill Out Bracket","submit")}
          </div>
          <button onClick={()=>{ if(adminUnlocked){setAdminUnlocked(false);}else setShowPwGate(p=>!p); }}
            style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,fontSize:11,fontFamily:"inherit",padding:"5px 12px",borderRadius:4,cursor:"pointer"}}>
            {adminUnlocked?"🔒 Lock Admin":"⚙ Admin"}
          </button>
        </div>

        {/* Password gate */}
        {showPwGate&&!adminUnlocked&&(
          <div style={{background:C.card,border:`1px solid rgba(240,192,64,0.18)`,borderRadius:8,padding:24,maxWidth:340,margin:"0 auto 24px",textAlign:"center"}}>
            <p style={{fontSize:13,color:C.dim,marginBottom:14}}>Enter admin password.</p>
            <input type="password" placeholder="Password" value={pwVal}
              onChange={e=>setPwVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&checkPw()}
              style={{...inputStyle,width:"100%",marginBottom:10}}/>
            <button onClick={checkPw} style={{width:"100%",background:C.gold,color:"#07111a",border:"none",borderRadius:5,fontWeight:800,fontSize:13,padding:"10px",cursor:"pointer",fontFamily:"inherit"}}>Unlock</button>
            {pwErr&&<div style={{fontSize:12,color:"#e05252",marginTop:8}}>{pwErr}</div>}
          </div>
        )}

        {/* Admin info */}
        {adminUnlocked&&(
          <div style={{background:C.card,border:`1px solid rgba(240,192,64,0.2)`,borderRadius:10,padding:24,marginBottom:28,fontSize:13,color:C.dim,lineHeight:1.8}}>
            <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,color:C.gold,marginBottom:10}}>Admin Notes</div>
            <div><span style={{color:C.gold,fontWeight:700}}>Picks</span> are saved automatically to Supabase as players click — nothing to do on your end.</div>
            <div style={{marginTop:8}}><span style={{color:C.gold,fontWeight:700}}>To update results:</span> edit the <code style={{background:"rgba(255,255,255,0.07)",padding:"1px 5px",borderRadius:3}}>RESULTS</code> object at the top of <code style={{background:"rgba(255,255,255,0.07)",padding:"1px 5px",borderRadius:3}}>src/App.js</code>, then push to GitHub. Vercel redeploys in ~60 seconds.</div>
          </div>
        )}

        {/* LEADERBOARD */}
        {view==="leaderboard"&&(
          <>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:C.gold,marginBottom:14}}>🏆 Standings</div>
            {loading
              ? <div style={{color:C.dim,fontSize:13,padding:"20px 0"}}>Loading scores…</div>
              : <Leaderboard allPicks={allPicks}/>
            }
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"14px 18px",display:"flex",gap:20,flexWrap:"wrap"}}>
              {[["#f0c040","2pts · Round of 16"],["#c0c8d8","4pts · Quarterfinal"],["#cd7f45","8pts · Semifinal"],["#1a8cff","16pts · Champion"]].map(([color,label])=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:C.dim}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>{label}
                </div>
              ))}
            </div>
          </>
        )}

        {/* SUBMIT */}
        {view==="submit"&&(
          <>
            {!nameConfirmed?(
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:28,maxWidth:380,margin:"0 auto"}}>
                <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,color:C.gold,marginBottom:6}}>Who are you?</div>
                <p style={{fontSize:13,color:C.dim,marginBottom:16}}>
                  Select your name and pick your winners — your bracket saves automatically as you click.
                </p>
                <select value={playerName} onChange={e=>setPlayerName(e.target.value)}
                  style={{...inputStyle,width:"100%",marginBottom:10,cursor:"pointer"}}>
                  <option value="">— Select your name —</option>
                  {FAMILY.map(name=>(
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button onClick={confirmName} style={{width:"100%",background:C.gold,color:"#07111a",border:"none",borderRadius:5,fontWeight:800,fontSize:13,padding:"10px",cursor:"pointer",fontFamily:"inherit"}}>
                  {locked?"View My Bracket":"Start My Bracket"}
                </button>
                {nameErr&&<div style={{fontSize:12,color:"#e05252",marginTop:8}}>{nameErr}</div>}
              </div>
            ):(
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div>
                    <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:700}}>{playerName}'s Bracket</div>
                    {!locked&&<div style={{fontSize:12,color:C.dim,marginTop:4}}>Your picks save automatically as you click</div>}
                  </div>
                  <button onClick={()=>{setNameConfirmed(false);setPlayerName("");setMyBracket(null);}}
                    style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,fontSize:11,fontFamily:"inherit",padding:"5px 12px",borderRadius:4,cursor:"pointer"}}>
                    Change name
                  </button>
                </div>
                {myBracket
                  ? <BracketEntry playerName={playerName} initialBracket={myBracket} locked={locked}/>
                  : <div style={{color:C.dim,fontSize:13}}>Loading your bracket…</div>
                }
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
