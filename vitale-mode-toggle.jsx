import { useState, useEffect, useCallback } from "react";

// ── Athlytic-inspired color system ────────────────────────────────
const C = {
  bg: "#0a0c0a",
  surface: "#111413",
  card: "#161918",
  card2: "#1c1f1e",
  border: "rgba(255,255,255,0.07)",
  borderAccent: "rgba(0,229,160,0.25)",
  accent: "#00E5A0",
  accentDim: "rgba(0,229,160,0.08)",
  warn: "#FFAD33",
  warnDim: "rgba(255,173,51,0.10)",
  danger: "#FF5757",
  dangerDim: "rgba(255,87,87,0.10)",
  info: "#5B7FFF",
  infoDim: "rgba(91,127,255,0.10)",
  muted: "#666e6a",
  text: "#f0f5f2",
  text2: "#9aa59e",
  purple: "#9B7FFF",
  purpleDim: "rgba(155,127,255,0.10)",
};

// ── Utility: Recovery color ────────────────────────────────────────
function recoveryColor(v) {
  if (v >= 75) return C.accent;
  if (v >= 50) return C.warn;
  return C.danger;
}
function recoveryLabel(v) {
  if (v >= 75) return "Optimal";
  if (v >= 50) return "Erholt";
  return "Kritisch";
}
function sleepColor(v) {
  if (v >= 70) return C.purple;
  if (v >= 50) return C.warn;
  return C.danger;
}

// ── SVG Ring ──────────────────────────────────────────────────────
function Ring({ value, size = 96, stroke = 8, color }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * value) / 100;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s" }}
      />
    </svg>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────
function Bar({ value, color, height = 6 }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(100, value)}%`, height: "100%",
        background: color, borderRadius: 99,
        transition: "width 0.6s ease"
      }} />
    </div>
  );
}

// ── Athlytic Kachel (Beginner) ────────────────────────────────────
function Tile({ label, value, unit, sub, color, ring, icon }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 18, padding: "18px 16px",
      display: "flex", flexDirection: "column", gap: 8,
      position: "relative", overflow: "hidden"
    }}>
      {/* subtle glow */}
      <div style={{
        position: "absolute", top: -20, right: -20, width: 80, height: 80,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        pointerEvents: "none"
      }} />
      <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase" }}>
        {icon} {label}
      </div>
      {ring ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
            <Ring value={value} size={56} stroke={5} color={color} />
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 700, color, fontFamily: "DM Mono, monospace"
            }}>{value}</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{value}<span style={{ fontSize: 11, color: C.muted, marginLeft: 3 }}>%</span></div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 3 }}>{sub}</div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "DM Mono, monospace", lineHeight: 1 }}>
            {value}<span style={{ fontSize: 11, color: C.muted, marginLeft: 4, fontWeight: 400 }}>{unit}</span>
          </div>
          {sub && <div style={{ fontSize: 11, color: C.text2 }}>{sub}</div>}
        </>
      )}
      <Bar value={value} color={color} />
    </div>
  );
}

// ── Mode Toggle ───────────────────────────────────────────────────
function ModeToggle({ mode, onChange }) {
  return (
    <div style={{
      display: "flex", background: C.surface,
      border: `1px solid ${C.border}`, borderRadius: 12,
      padding: 4, gap: 4
    }}>
      {["beginner", "advanced"].map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          flex: 1, padding: "8px 0", borderRadius: 9, border: "none",
          background: mode === m ? C.card2 : "transparent",
          color: mode === m ? C.accent : C.muted,
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
          boxShadow: mode === m ? `0 0 0 1px ${C.borderAccent}` : "none",
          transition: "all 0.2s",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2
        }}>
          <span style={{ fontSize: 14 }}>{m === "beginner" ? "🌱" : "⚡"}</span>
          <span>{m === "beginner" ? "Einsteiger" : "Advanced"}</span>
        </button>
      ))}
    </div>
  );
}

// ── BEGINNER HOME ─────────────────────────────────────────────────
function BeginnerHome({ data, onNavigate }) {
  const rc = recoveryColor(data.recovery);
  const sc = sleepColor(data.sleep);
  const kc = data.netEnergy < 0 ? C.accent : C.warn;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Hero — wie Athlytic Today */}
      <div style={{
        background: `linear-gradient(145deg, ${C.card}, ${C.card2})`,
        border: `1px solid ${C.border}`, borderRadius: 22,
        padding: 22, position: "relative", overflow: "hidden"
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at top right, ${rc}12 0%, transparent 65%)`,
          pointerEvents: "none"
        }} />
        <div style={{ fontSize: 11, color: C.muted, fontFamily: "DM Mono, monospace", marginBottom: 6 }}>
          {data.greeting}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", color: C.text }}>
              {data.workoutLabel}
            </div>
            <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>{data.workoutSub}</div>
          </div>
          {/* Big Recovery Ring */}
          <div style={{ position: "relative", width: 72, height: 72 }}>
            <Ring value={data.recovery} size={72} stroke={6} color={rc} />
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center"
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: rc, fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{data.recovery}</div>
              <div style={{ fontSize: 8, color: C.muted, letterSpacing: ".05em" }}>%</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: `${rc}18`, border: `1px solid ${rc}40`,
            borderRadius: 8, padding: "4px 10px",
            fontSize: 11, color: rc, fontFamily: "DM Mono, monospace", fontWeight: 600
          }}>
            {rc === C.accent ? "✓" : rc === C.warn ? "~" : "!"} {recoveryLabel(data.recovery)}
          </div>
        </div>
      </div>

      {/* 4 Athlytic-Kacheln */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Tile label="Recovery" value={data.recovery} unit="%" sub={recoveryLabel(data.recovery)} color={rc} ring />
        <Tile label="Schlaf" value={data.sleep} unit="%" sub={`${data.sleepHours}h ${data.sleepMin}m`} color={sc} ring />
        <Tile label="Belastung" value={data.exertion * 10} unit="/10" sub={`${data.exertion}/10 · ${data.exertionLabel}`} color={C.info} ring={false} icon="🔥" />
        <Tile label="Net Energy" value={Math.min(100, Math.abs(data.netEnergy) / 20)} unit="kcal" sub={`${data.netEnergy > 0 ? "+" : ""}${data.netEnergy} Balance`} color={kc} ring={false} icon="⚡" />
      </div>

      {/* Kalorien-Karte */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20
      }}>
        <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14 }}>
          🥗 Ernährung heute
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          {[
            { label: "Ziel", val: data.kcalGoal, color: C.accent },
            { label: "Gegessen", val: data.kcalEaten, color: C.text },
            { label: "Rest", val: data.kcalGoal - data.kcalEaten, color: data.kcalEaten > data.kcalGoal ? C.danger : C.info },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: item.color, fontFamily: "DM Mono, monospace" }}>{item.val.toLocaleString("de-DE")}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{item.label}</div>
            </div>
          ))}
        </div>
        <Bar value={(data.kcalEaten / data.kcalGoal) * 100} color={data.kcalEaten > data.kcalGoal ? C.danger : C.accent} height={8} />
        <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 11, fontFamily: "DM Mono, monospace" }}>
          {[
            { label: "P", val: data.protein + "g", color: C.info },
            { label: "K", val: data.carbs + "g", color: C.warn },
            { label: "F", val: data.fat + "g", color: "#EC4899" },
          ].map(m => (
            <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
              <span style={{ color: C.text2 }}>{m.label}</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{m.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Training-Karte */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20
      }}>
        <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14 }}>
          🏋️ Training heute
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{data.workoutLabel}</div>
            <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>{data.workoutSub}</div>
          </div>
          <button onClick={() => onNavigate("training")} style={{
            background: C.accentDim, border: `1px solid ${C.borderAccent}`,
            borderRadius: 10, padding: "8px 14px",
            color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "DM Sans, sans-serif"
          }}>
            Log →
          </button>
        </div>
        {/* Mini week */}
        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          {data.weekPlan.map((day, i) => (
            <div key={i} style={{
              flex: 1, textAlign: "center",
              padding: "8px 4px", borderRadius: 9,
              background: day.isToday ? C.accentDim : C.surface,
              border: `1px solid ${day.isToday ? C.borderAccent : C.border}`,
            }}>
              <div style={{ fontSize: 8, color: C.muted, fontFamily: "DM Mono, monospace" }}>{day.name}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: day.isToday ? C.accent : day.type === "rest" ? C.muted : C.text2, marginTop: 3 }}>{day.short}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ADVANCED HOME ─────────────────────────────────────────────────
function AdvancedHome({ data }) {
  const rc = recoveryColor(data.recovery);
  const sc = sleepColor(data.sleep);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Kompakter Hero */}
      <div style={{
        background: `linear-gradient(145deg, ${C.card}, ${C.card2})`,
        border: `1px solid ${C.border}`, borderRadius: 22,
        padding: "18px 20px", display: "flex", alignItems: "center", gap: 16
      }}>
        <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
          <Ring value={data.recovery} size={88} stroke={7} color={rc} />
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center"
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: rc, fontFamily: "DM Mono, monospace" }}>{data.recovery}</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: ".08em" }}>Recovery</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: "DM Mono, monospace", marginBottom: 4 }}>{data.greeting}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>{data.workoutLabel}</div>
          <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{data.workoutSub}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 10, fontSize: 11, fontFamily: "DM Mono, monospace" }}>
            <span style={{ color: C.text2 }}>HRV <span style={{ color: rc, fontWeight: 600 }}>{data.hrv}ms</span></span>
            <span style={{ color: C.muted }}>·</span>
            <span style={{ color: C.text2 }}>RHR <span style={{ color: rc, fontWeight: 600 }}>{data.rhr}bpm</span></span>
          </div>
        </div>
      </div>

      {/* 4 Metriken nebeneinander */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {[
          { label: "Recovery", val: data.recovery + "%", color: rc },
          { label: "Schlaf", val: data.sleep + "%", color: sc },
          { label: "Exertion", val: data.exertion + "/10", color: C.info },
          { label: "Net Kcal", val: (data.netEnergy > 0 ? "+" : "") + data.netEnergy, color: data.netEnergy <= 0 ? C.accent : C.warn },
        ].map(m => (
          <div key={m.label} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "12px 8px", textAlign: "center"
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: m.color, fontFamily: "DM Mono, monospace" }}>{m.val}</div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 3, fontFamily: "DM Mono, monospace", letterSpacing: ".06em", textTransform: "uppercase" }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Schlaf-Detail */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20 }}>
        <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14 }}>
          🌙 Schlaf-Stages
        </div>
        {[
          { label: "Wach", pct: data.sleepAwake, time: data.sleepAwakeTime, color: "#FF7043" },
          { label: "REM", pct: data.sleepREM, time: data.sleepREMTime, color: sc },
          { label: "Core", pct: data.sleepCore, time: data.sleepCoreTime, color: C.info },
          { label: "Tief", pct: data.sleepDeep, time: data.sleepDeepTime, color: C.purple },
        ].map(s => (
          <div key={s.label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.text2 }}>{s.label} <span style={{ color: s.color, fontWeight: 600 }}>{s.pct}%</span></span>
              <span style={{ fontSize: 11, color: C.muted, fontFamily: "DM Mono, monospace" }}>{s.time}</span>
            </div>
            <Bar value={s.pct} color={s.color} height={5} />
          </div>
        ))}
      </div>

      {/* Energie + HRV nebeneinander */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Energie */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 12 }}>⚡ Energie</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: data.netEnergy <= 0 ? C.accent : C.warn, fontFamily: "DM Mono, monospace" }}>
            {data.netEnergy > 0 ? "+" : ""}{data.netEnergy}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>kcal Balance</div>
          <div style={{ fontSize: 11, color: C.text2 }}>Verbrannt <span style={{ color: C.text, fontWeight: 600 }}>{data.burned}</span></div>
          <div style={{ fontSize: 11, color: C.text2, marginTop: 3 }}>Gegessen <span style={{ color: C.text, fontWeight: 600 }}>{data.kcalEaten}</span></div>
        </div>
        {/* HRV Trend */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 12 }}>💓 HRV (7T)</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: rc, fontFamily: "DM Mono, monospace" }}>{data.hrv}<span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}> ms</span></div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>Baseline {data.hrvBaseline}ms</div>
          {/* Sparkline */}
          <svg width="100%" height="36" style={{ overflow: "visible" }}>
            {data.hrvWeek.map((v, i) => {
              const x = (i / (data.hrvWeek.length - 1)) * 100;
              const y = 36 - ((v - 50) / 70) * 36;
              const color = v >= data.hrvBaseline ? C.accent : C.warn;
              return (
                <g key={i}>
                  {i > 0 && (
                    <line
                      x1={`${((i - 1) / (data.hrvWeek.length - 1)) * 100}%`}
                      y1={36 - ((data.hrvWeek[i - 1] - 50) / 70) * 36}
                      x2={`${x}%`} y2={y}
                      stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"
                    />
                  )}
                  <circle cx={`${x}%`} cy={y} r="3" fill={color} />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Stress */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>
              🧘 Stress heute
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.info, fontFamily: "DM Mono, monospace" }}>{data.stress}</div>
            <div style={{ fontSize: 11, color: C.text2 }}>{data.stressLabel} · Ø {data.stressAvg}/100</div>
          </div>
          <div style={{
            background: C.infoDim, border: `1px solid ${C.info}40`,
            borderRadius: 8, padding: "4px 10px", fontSize: 11, color: C.info, fontWeight: 600
          }}>
            {data.stress < 30 ? "Niedrig" : data.stress < 60 ? "Moderat" : "Hoch"}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8, fontSize: 11, fontFamily: "DM Mono, monospace" }}>
            {[{ label: "Niedrig", pct: data.stressLow, color: C.info }, { label: "Moderat", pct: data.stressMod, color: C.accent }, { label: "Hoch", pct: data.stressHigh, color: C.warn }].map(s => (
              <span key={s.label} style={{ color: C.text2 }}><span style={{ color: s.color }}>■</span> {s.label} {s.pct}%</span>
            ))}
          </div>
        </div>
      </div>

      {/* Makros Detail */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20 }}>
        <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14 }}>
          🥗 Makros & Ernährung
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Protein", val: data.protein + "g", pct: 33, color: C.info },
            { label: "Carbs", val: data.carbs + "g", pct: 39, color: C.warn },
            { label: "Fett", val: data.fat + "g", pct: 28, color: "#EC4899" },
          ].map(m => (
            <div key={m.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: "DM Mono, monospace" }}>{m.val}</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: m.color, fontFamily: "DM Mono, monospace", marginTop: 2 }}>{m.pct}%</div>
            </div>
          ))}
        </div>
        <div style={{ height: 10, borderRadius: 5, overflow: "hidden", display: "flex" }}>
          <div style={{ flex: 33, background: C.info }} />
          <div style={{ flex: 39, background: C.warn }} />
          <div style={{ flex: 28, background: "#EC4899" }} />
        </div>
      </div>
    </div>
  );
}

// ── MOCK DATA ─────────────────────────────────────────────────────
function getMockData() {
  const hour = new Date().getHours();
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const todayIdx = (new Date().getDay() + 6) % 7;
  const plans = ["Push", "Pull", "Bein", "Push", "Pull", "Aktiv", "Rest"];
  const types = ["push", "pull", "legs", "push", "pull", "recovery", "rest"];

  return {
    greeting: (hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend") + " · " + ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"][todayIdx],
    recovery: 46,
    sleep: 46,
    sleepHours: 7, sleepMin: 38,
    sleepAwake: 19, sleepAwakeTime: "1h 29m",
    sleepREM: 14, sleepREMTime: "1h 2m",
    sleepCore: 59, sleepCoreTime: "4h 33m",
    sleepDeep: 7, sleepDeepTime: "34m",
    exertion: 3.3, exertionLabel: "Light",
    netEnergy: -94,
    kcalGoal: 1626, kcalEaten: 1007,
    burned: 1101, protein: 82, carbs: 97, fat: 31,
    hrv: 65, hrvBaseline: 79,
    hrvWeek: [97, 90, 108, 70, 58, 105, 65],
    rhr: 62,
    stress: 19, stressLabel: "Niedrig", stressAvg: 26,
    stressLow: 57, stressMod: 33, stressHigh: 8,
    workoutLabel: plans[todayIdx] + " · Hypertrophie",
    workoutSub: "Recovery niedrig — moderate Session",
    weekPlan: days.map((name, i) => ({
      name, short: plans[i].substring(0, 3),
      type: types[i], isToday: i === todayIdx
    })),
  };
}

// ── MAIN APP ──────────────────────────────────────────────────────
export default function VitaleApp() {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem("vitale_ui_mode") || "beginner"; } catch { return "beginner"; }
  });
  const [activeTab, setActiveTab] = useState("home");
  const data = getMockData();

  const changeMode = useCallback((m) => {
    setMode(m);
    try { localStorage.setItem("vitale_ui_mode", m); } catch {}
  }, []);

  const navigateTo = (tab) => setActiveTab(tab);

  const tabs = [
    { id: "home", icon: "⚡", label: "Heute" },
    { id: "training", icon: "🏋️", label: "Training" },
    { id: "nutrition", icon: "🥗", label: "Ernährung" },
    { id: "profile", icon: "👤", label: "Profil" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "DM Sans, sans-serif", color: C.text,
      maxWidth: 430, margin: "0 auto",
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: "18px 18px 0",
        position: "sticky", top: 0, zIndex: 50,
        background: `${C.bg}ee`, backdropFilter: "blur(12px)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: `linear-gradient(135deg, ${C.accent}, #00C5DE)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "#000"
            }}>Ai</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>Vi<span style={{ color: C.accent }}>tale</span></div>
              <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".06em" }}>KI · HEALTH · APPLE WATCH</div>
            </div>
          </div>
          {/* Mode toggle — global */}
          <ModeToggle mode={mode} onChange={changeMode} />
        </div>

        {/* Nav tabs */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)",
          gap: 4, background: C.surface,
          padding: 4, borderRadius: 14,
          border: `1px solid ${C.border}`, marginBottom: 0
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "10px 6px", borderRadius: 10,
              fontSize: 11, fontWeight: activeTab === t.id ? 600 : 500,
              cursor: "pointer", color: activeTab === t.id ? C.accent : C.muted,
              background: activeTab === t.id ? C.card2 : "transparent",
              border: "none", fontFamily: "DM Sans, sans-serif",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              boxShadow: activeTab === t.id ? `inset 0 0 0 1px ${C.borderAccent}` : "none",
              transition: "all 0.18s"
            }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "16px 18px 40px" }}>
        {activeTab === "home" && (
          mode === "beginner"
            ? <BeginnerHome data={data} onNavigate={navigateTo} />
            : <AdvancedHome data={data} />
        )}

        {activeTab === "training" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14 }}>🏋️ Training</div>
            <div style={{ fontSize: 15, color: C.text2 }}>
              {mode === "beginner"
                ? "Im Einsteiger-Modus plant die KI deinen Wochenplan automatisch basierend auf deiner Recovery."
                : "Im Advanced-Modus kannst du jeden Tag individuell anpassen — Übungen, Sätze, Reps."}
            </div>
            <div style={{ marginTop: 16, padding: 14, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, color: C.text }}>Aktueller Modus: <span style={{ color: C.accent, fontWeight: 600 }}>{mode === "beginner" ? "🌱 Einsteiger" : "⚡ Advanced"}</span></div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Wechsle den Modus oben rechts im Header.</div>
            </div>
          </div>
        )}

        {activeTab === "nutrition" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20 }}>
              <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14 }}>🥗 Ernährung heute</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[{ l: "Tagesziel", v: data.kcalGoal, c: C.accent }, { l: "Gegessen", v: data.kcalEaten, c: C.text }, { l: "Verbleibend", v: data.kcalGoal - data.kcalEaten, c: C.info }].map(m => (
                  <div key={m.l} style={{ textAlign: "center", background: C.surface, borderRadius: 12, padding: "12px 8px", border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: m.c, fontFamily: "DM Mono, monospace" }}>{m.v.toLocaleString("de-DE")}</div>
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{m.l}</div>
                  </div>
                ))}
              </div>
              <Bar value={(data.kcalEaten / data.kcalGoal) * 100} color={C.accent} height={8} />
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20 }}>
              <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14 }}>Makros</div>
              {[{ l: "Protein", v: data.protein + "g", c: C.info, pct: 33 }, { l: "Carbs", v: data.carbs + "g", c: C.warn, pct: 39 }, { l: "Fett", v: data.fat + "g", c: "#EC4899", pct: 28 }].map(m => (
                <div key={m.l} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: C.text2 }}>{m.l}</span>
                    <span style={{ fontSize: 12, fontFamily: "DM Mono, monospace", color: m.c, fontWeight: 600 }}>{m.v} <span style={{ color: C.muted, fontWeight: 400 }}>{m.pct}%</span></span>
                  </div>
                  <Bar value={m.pct * 2.5} color={m.c} height={6} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono, monospace", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14 }}>👤 Profil</div>
            {[
              { l: "HRV", v: data.hrv + " ms", note: `Baseline ${data.hrvBaseline} ms`, c: recoveryColor(data.recovery) },
              { l: "RHR", v: data.rhr + " bpm", note: "Within 58–69", c: C.accent },
              { l: "Atemfrequenz", v: "14,4 BrPM", note: "Within 12.7–16.2", c: C.accent },
              { l: "Athlytic Age", v: "21,1", note: "Unter deinem echten Alter", c: C.accent },
            ].map(item => (
              <div key={item.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 13, color: C.text }}>{item.l}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{item.note}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: item.c, fontFamily: "DM Mono, monospace" }}>{item.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
