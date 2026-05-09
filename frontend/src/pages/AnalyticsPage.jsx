import { useState, useEffect, useRef } from "react";
import { analyticsAPI } from '../services/api';
import realtimeService from '../services/realtime';

const FONT_URL = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap";

const CSS = `
  :root {
    --bg: #080c18;
    --bg2: #0e1424;
    --bg3: #141929;
    --border: rgba(255,255,255,0.07);
    --border2: rgba(255,255,255,0.13);
    --text: #e8eaf0;
    --text2: #7a8099;
    --text3: #4a5068;
    --accent: #5d8bff;
    --accent2: #8b5cf6;
    --lime: #a3e635;
    --red: #f87171;
    --orange: #fb923c;
    --yellow: #fbbf24;
    --green: #34d399;
    --card-glow: 0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); }
  .dash { font-family: 'DM Sans', sans-serif; background: var(--bg); min-height: 100vh; padding: 28px 32px; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .syne { font-family: 'Syne', sans-serif; }

  .hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; gap: 16px; flex-wrap: wrap; }
  .hdr-title { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg, #fff 40%, #7a8099); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .hdr-sub { font-size: 13px; color: var(--text2); margin-top: 4px; }
  .hdr-actions { display: flex; align-items: center; gap: 10px; }

  .pill-select { background: var(--bg2); border: 1px solid var(--border2); border-radius: 10px; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 8px 14px; cursor: pointer; outline: none; appearance: none; }
  .icon-btn { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text2); transition: all 0.2s; }
  .icon-btn:hover { border-color: var(--border2); color: var(--text); }
  .icon-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(93,139,255,0.1); }

  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--lime); animation: pulse 2s infinite; display: inline-block; }
  @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.8); } }

  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
  @media (max-width: 900px) { .metrics { grid-template-columns: repeat(2,1fr); } }

  .mc { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 22px; cursor: pointer; transition: all 0.22s; position: relative; overflow: hidden; }
  .mc::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity 0.22s; border-radius: 16px; }
  .mc:hover { border-color: var(--border2); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
  .mc.red::before { background: radial-gradient(circle at top right, rgba(248,113,113,0.08), transparent 60%); }
  .mc.blue::before { background: radial-gradient(circle at top right, rgba(93,139,255,0.08), transparent 60%); }
  .mc.green::before { background: radial-gradient(circle at top right, rgba(52,211,153,0.08), transparent 60%); }
  .mc.purple::before { background: radial-gradient(circle at top right, rgba(139,92,246,0.08), transparent 60%); }
  .mc:hover::before { opacity: 1; }

  .mc-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
  .mc-icon.red { background: rgba(248,113,113,0.15); color: var(--red); }
  .mc-icon.blue { background: rgba(93,139,255,0.15); color: var(--accent); }
  .mc-icon.green { background: rgba(52,211,153,0.15); color: var(--green); }
  .mc-icon.purple { background: rgba(139,92,246,0.15); color: var(--accent2); }

  .mc-label { font-size: 12px; color: var(--text2); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .mc-value { font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 600; line-height: 1; }
  .mc-sub { font-size: 12px; color: var(--text3); margin-top: 6px; }
  .badge { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 500; padding: 3px 8px; border-radius: 6px; }
  .badge.up { background: rgba(52,211,153,0.12); color: var(--green); }
  .badge.down { background: rgba(248,113,113,0.12); color: var(--red); }
  .badge-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  @media (max-width: 900px) { .grid2 { grid-template-columns: 1fr; } }

  .card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
  .card-title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.2px; }
  .card-sub { font-size: 12px; color: var(--text2); margin-top: 2px; }
  .card-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }

  .chart-wrap { position: relative; height: 180px; display: flex; align-items: flex-end; gap: 5px; padding: 0 2px; }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; height: 100%; cursor: pointer; }
  .bar { width: 100%; border-radius: 6px 6px 0 0; transition: all 0.2s; min-height: 4px; background: rgba(93,139,255,0.3); position: relative; overflow: visible; }
  .bar:hover, .bar.active { background: var(--accent); }
  .bar-lbl { font-size: 10px; color: var(--text3); font-family: 'JetBrains Mono', monospace; white-space: nowrap; }

  .tooltip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: var(--bg3); border: 1px solid var(--border2); border-radius: 8px; padding: 6px 10px; white-space: nowrap; z-index: 10; pointer-events: none; }
  .tooltip-val { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--text); }
  .tooltip-lbl { font-size: 10px; color: var(--text2); }
  .tooltip-arrow { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid var(--border2); }

  .err-row { border-radius: 12px; padding: 14px 16px; background: var(--bg3); border: 1px solid var(--border); margin-bottom: 8px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
  .err-row::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 3px 0 0 3px; }
  .err-row.critical::before { background: var(--red); }
  .err-row.high::before { background: var(--orange); }
  .err-row.medium::before { background: var(--yellow); }
  .err-row:hover { border-color: var(--border2); }
  .err-name { font-size: 13px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
  .err-meta { font-size: 11px; color: var(--text2); margin-top: 3px; }
  .err-count { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 600; color: var(--text); }
  .err-count-lbl { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em; }

  .sev-badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.06em; }
  .sev-badge.critical { background: rgba(248,113,113,0.12); color: var(--red); }
  .sev-badge.high { background: rgba(251,146,60,0.12); color: var(--orange); }
  .sev-badge.medium { background: rgba(251,191,36,0.12); color: var(--yellow); }

  .bar-track { background: var(--bg3); border-radius: 4px; height: 5px; flex: 1; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1); }
  .bar-fill.critical { background: var(--red); }
  .bar-fill.high { background: var(--orange); }
  .bar-fill.medium { background: var(--yellow); }
  .bar-fill.low { background: var(--accent); }

  .perf-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
  @media (max-width: 700px) { .perf-grid { grid-template-columns: repeat(2,1fr); } }
  .perf-card { background: var(--bg3); border-radius: 12px; padding: 18px; text-align: center; border: 1px solid var(--border); }
  .perf-val { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 600; margin-bottom: 4px; }
  .perf-lbl { font-size: 12px; color: var(--text2); }
  .perf-status { font-size: 11px; margin-top: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

  .activity-bar { background: rgba(163,230,53,0.08); border: 1px solid rgba(163,230,53,0.15); border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
  .activity-item { background: var(--bg2); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; flex: 1; border: 1px solid var(--border); font-size: 13px; }
  .activity-items { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }

  .section-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; font-weight: 500; }
  .divider { height: 1px; background: var(--border); margin: 20px 0; }

  .sparkline-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .sparkline { display: flex; align-items: flex-end; gap: 2px; height: 28px; }
  .spark-bar { width: 4px; border-radius: 2px; background: rgba(93,139,255,0.3); transition: background 0.2s; }
  .spark-bar:hover { background: var(--accent); }

  .tag { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; font-size: 11px; color: var(--text2); padding: 2px 8px; font-family: 'JetBrains Mono', monospace; }

  .expand-zone { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }
  .expand-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
  .expand-stat { background: var(--bg); border-radius: 8px; padding: 12px; text-align: center; }
  .expand-val { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 600; }
  .expand-lbl { font-size: 11px; color: var(--text2); margin-top: 3px; }
  .action-btn { border: 1px solid var(--border2); background: transparent; border-radius: 8px; padding: 7px 14px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .action-btn.primary { background: rgba(93,139,255,0.15); border-color: rgba(93,139,255,0.4); color: var(--accent); }
  .action-btn.primary:hover { background: rgba(93,139,255,0.25); }
  .action-btn.secondary { color: var(--text2); }
  .action-btn.secondary:hover { color: var(--text); border-color: var(--border2); }
`;

function Icon({ name, size = 16 }) {
  const icons = {
    alert: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    activity: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    trending: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    refresh: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" /></svg>,
    zap: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    file: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    up: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>,
    down: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    more: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>,
  };
  return icons[name] || null;
}

function MetricCard({ title, value, iconName, color, subtitle, trend, trendDir }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`mc ${color}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="badge-row">
        <div className={`mc-icon ${color}`}><Icon name={iconName} size={18} /></div>
        {trend && (
          <span className={`badge ${trendDir === "up" ? "up" : "down"}`}>
            <Icon name={trendDir === "up" ? "up" : "down"} size={10} />
            {trend}
          </span>
        )}
      </div>
      <div className="mc-label">{title}</div>
      <div className={`mc-value`} style={{ color: color === "red" ? "var(--red)" : color === "green" ? "var(--green)" : color === "blue" ? "var(--accent)" : "var(--accent2)" }}>
        {value}
      </div>
      <div className="mc-sub">{subtitle}</div>
    </div>
  );
}

function BarChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...data.map(d => d.total));
  return (
    <div>
      <div className="chart-wrap">
        {data.map((d, i) => {
          const h = Math.max(8, (d.total / max) * 160);
          const isH = hovered === i;
          return (
            <div key={i} className="bar-col" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <div className={`bar ${isH ? "active" : ""}`} style={{ height: h }} >
                {isH && (
                  <div className="tooltip">
                    <div className="tooltip-val">{d.total}</div>
                    <div className="tooltip-lbl">{new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</div>
                    <div className="tooltip-arrow" />
                  </div>
                )}
              </div>
              <span className="bar-lbl">{new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ErrorTypeList({ data }) {
  const [expanded, setExpanded] = useState(null);
  const maxCount = Math.max(...data.map(d => d.count));
  return (
    <div>
      {data.map((item, i) => (
        <div key={i} className={`err-row ${item.severity}`} onClick={() => setExpanded(expanded === i ? null : i)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span className="err-name">{item.type || item.filename}</span>
                <span className={`sev-badge ${item.severity}`}>{item.severity}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="bar-track" style={{ flex: 1 }}>
                  <div className={`bar-fill ${item.severity}`} style={{ width: `${(item.count / maxCount) * 100}%` }} />
                </div>
                <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
                  <Icon name="clock" size={10} /> {new Date(item.lastSeen).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="err-count">{item.count}</div>
              <div className="err-count-lbl">errors</div>
            </div>
          </div>
          {expanded === i && (
            <div className="expand-zone">
              <div className="expand-grid">
                <div className="expand-stat"><div className="expand-val">{item.count}</div><div className="expand-lbl">Total occurrences</div></div>
                <div className="expand-stat"><div className="expand-val" style={{ color: "var(--green)" }}>↓ 15%</div><div className="expand-lbl">Weekly trend</div></div>
                <div className="expand-stat"><div className="expand-val" style={{ color: "var(--accent)" }}>2.3h</div><div className="expand-lbl">Avg resolution</div></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="action-btn primary"><Icon name="zap" size={12} /> Generate Fix</button>
                <button className="action-btn secondary">View similar</button>
                <button className="action-btn secondary">Mark resolved</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RecentErrorsFull({ errors }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div>
      {errors.map((err, i) => (
        <div key={err._id} className={`err-row ${err.severity}`} onClick={() => setExpanded(expanded === i ? null : i)}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{err.errorMessage}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="tag"><Icon name="file" size={10} /> {err.filename}</span>
                {err.type && <span className="tag">{err.type}</span>}
                {err.lineNumber && <span className="tag">L{err.lineNumber}</span>}
                <span className={`sev-badge ${err.severity}`}>{err.severity}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
                <Icon name="clock" size={10} /> {new Date(err.createdAt).toLocaleString()}
              </div>
            </div>
            <button
              className="action-btn primary"
              style={{ flexShrink: 0, marginTop: 2 }}
              onClick={e => e.stopPropagation()}
            >
              <Icon name="zap" size={12} /> Fix
            </button>
          </div>
          {expanded === i && (
            <div className="expand-zone">
              <div style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                {err.errorMessage}
              </div>
              {err.groupId && (
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--text3)" }}>
                  Group ID: <span style={{ color: "var(--accent)", fontFamily: "JetBrains Mono, monospace" }}>{err.groupId}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="action-btn secondary">View similar errors</button>
                <button className="action-btn secondary">Mark as resolved</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimeUpdates, setRealtimeUpdates] = useState([]);
  const REFRESH_INTERVAL = 30000;

  useEffect(() => {
    const link = document.createElement("link");
    link.href = FONT_URL;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    loadAnalytics();

    const handleNewError = (errorData) => {
      setRealtimeUpdates(prev => [...prev.slice(-4), { type: "error", data: errorData, timestamp: new Date() }]);
      if (autoRefresh) setTimeout(loadAnalytics, 1000);
    };
    const handleFixGenerated = (fixData) => {
      setRealtimeUpdates(prev => [...prev.slice(-4), { type: "fix", data: fixData, timestamp: new Date() }]);
      if (autoRefresh) setTimeout(loadAnalytics, 1000);
    };

    realtimeService.on("new_error", handleNewError);
    realtimeService.on("fix_generated", handleFixGenerated);

    let intervalId;
    if (autoRefresh) intervalId = setInterval(loadAnalytics, REFRESH_INTERVAL);

    return () => {
      realtimeService.off("new_error", handleNewError);
      realtimeService.off("fix_generated", handleFixGenerated);
      if (intervalId) clearInterval(intervalId);
    };
  }, [timeRange, autoRefresh]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getOverview(timeRange);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ animation: "spin 1s linear infinite", display: "inline-block", color: "var(--accent)", marginBottom: 16 }}>
              <Icon name="refresh" size={32} />
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "var(--text2)" }}>Loading analytics…</div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  if (!analytics) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "var(--red)", marginBottom: 12 }}><Icon name="alert" size={32} /></div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>Unable to load analytics data</div>
            <button className="action-btn primary" onClick={loadAnalytics}><Icon name="refresh" size={12} /> Retry</button>
          </div>
        </div>
      </>
    );
  }

  const data = analytics;

  return (
    <>
      <style>{CSS}</style>
      <div className="dash">
        {/* Header */}
        <div className="hdr">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span className="live-dot" />
              <span style={{ fontSize: 11, color: "var(--lime)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em" }}>LIVE</span>
            </div>
            <h1 className="hdr-title">Error Analytics</h1>
            <p className="hdr-sub">Real-time monitoring · Last refreshed just now</p>
          </div>
          <div className="hdr-actions">
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "6px 10px 6px 12px" }}>
              <Icon name="calendar" size={14} />
              <select
                className="pill-select"
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                style={{ background: "transparent", border: "none", padding: "2px 0" }}
              >
                <option value="1d">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
            <div
              className={`icon-btn ${autoRefresh ? "active" : ""}`}
              onClick={() => setAutoRefresh(v => !v)}
              title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
            >
              <div style={{ animation: autoRefresh ? "spin 3s linear infinite" : "none" }}>
                <Icon name="refresh" size={15} />
              </div>
            </div>
          </div>
        </div>

        {/* Realtime activity */}
        {realtimeUpdates.length > 0 && (
          <div style={{ background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.15)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span className="live-dot" />
              <span style={{ fontSize: 11, color: "var(--lime)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em" }}>LIVE ACTIVITY</span>
            </div>
            <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
              {realtimeUpdates.map((u, i) => (
                <div key={i} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{u.type === "error" ? "🔴" : "✅"}</span>
                  <span style={{ color: "var(--text2)" }}>{u.type === "error" ? "New error" : "Fix generated"}</span>
                  <span style={{ color: "var(--text3)", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>{u.data?.filename}</span>
                  <span style={{ color: "var(--text3)", fontSize: 11 }}>{new Date(u.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setRealtimeUpdates([])} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 13 }}>✕</button>
          </div>
        )}

        {/* Metrics */}
        <div className="metrics">
          <MetricCard title="Total Errors" value={(data.overview?.totalErrors ?? 0).toLocaleString()} iconName="alert" color="red" subtitle="All time recorded" trend="15%" trendDir="down" />
          <MetricCard title="Critical Errors" value={data.overview?.criticalErrors ?? 0} iconName="activity" color="red" subtitle="Needs attention now" trend="5%" trendDir="up" />
          <MetricCard title="Resolved" value={(data.overview?.resolvedErrors ?? 0).toLocaleString()} iconName="check" color="green" subtitle="Successfully fixed" trend="25%" trendDir="up" />
          <MetricCard title="Resolution Rate" value={`${data.overview?.resolutionRate ?? 0}%`} iconName="trending" color="blue" subtitle="Fix success rate" trend="12%" trendDir="up" />
        </div>

        {/* Charts Row */}
        <div className="grid2">
          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Error Trends</div>
                <div className="card-sub">Daily error volume over time</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <div className="icon-btn"><Icon name="more" size={14} /></div>
              </div>
            </div>
            <BarChart data={data.errorTrends ?? []} />
          </div>

          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Top Error Types</div>
                <div className="card-sub">Most frequent error categories</div>
              </div>
            </div>
            <ErrorTypeList data={data.topErrorTypes ?? []} />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid2">
          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Problematic Files</div>
                <div className="card-sub">Files with highest error rates</div>
              </div>
            </div>
            <ErrorTypeList data={data.topFiles ?? []} />
          </div>

          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">Recent Errors</div>
                <div className="card-sub">Latest detected issues</div>
              </div>
              <div className="icon-btn"><Icon name="refresh" size={14} /></div>
            </div>
            <RecentErrorsFull errors={data.recentErrors ?? []} />
          </div>
        </div>

        {/* Performance Summary */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-hdr">
            <div>
              <div className="card-title">System Performance</div>
              <div className="card-sub">Health and reliability metrics</div>
            </div>
          </div>
          <div className="perf-grid">
            {[
              { val: "98.2%", lbl: "Uptime", color: "var(--green)", status: "Excellent", dot: "var(--green)" },
              { val: "1.2s", lbl: "Avg Response", color: "var(--lime)", status: "Fast", dot: "var(--lime)" },
              { val: "45ms", lbl: "Error Detection", color: "var(--accent)", status: "Instant", dot: "var(--accent)" },
              { val: "92%", lbl: "Fix Success", color: "var(--orange)", status: "High", dot: "var(--orange)" },
            ].map((p, i) => (
              <div key={i} className="perf-card">
                <div className="perf-val" style={{ color: p.color }}>{p.val}</div>
                <div className="perf-lbl">{p.lbl}</div>
                <div className="perf-status">
                  <span className="status-dot" style={{ background: p.dot }} />
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}