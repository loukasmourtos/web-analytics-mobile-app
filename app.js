/* Pushoff – interactive mockup.
   Vanilla JS, no build step. Everything is hard-coded sample data: the "recommender"
   and "crowd forecast" are simple stand-ins so the mockup behaves like the real thing. */

const $app = document.getElementById('app');

// The mockup pretends it is Sunday, 5 PM.
const NOW = 17;
const TODAY = 'weekend';
const TOMORROW = 'weekday';
const dayType = d => (d === 'today' ? TODAY : TOMORROW);

const LEVELS = { beginner: 1, intermediate: 2, advanced: 3 };
const STYLE_LABEL = { street: 'Street', bowl: 'Bowl & pool', transition: 'Transition', cruise: 'Cruising' };
const GOAL_LABEL = { quiet: 'Skate in peace', social: 'Meet people', progress: 'Progress fast' };

const state = {
  screen: 'onboard',           // onboard | loading | app
  obStep: 0,                   // 0 welcome, 1 styles, 2 level, 3 goal
  tab: 'home',                 // home | map | sessions | profile
  detailId: null,
  filter: 'all',
  profile: { styles: ['street'], level: 'intermediate', goal: 'quiet' },
  tagWeight: {},               // learned from "not for me" feedback
  hidden: [],
  saved: ['olive'],
  sessions: [{ id: 1, parkId: 'harbor', day: 'tomorrow', hour: 18 }],
  sheet: null,
  mapSel: 'olive',
  forecastDay: 'today',
  selHour: null,
  toast: null,
  toastTimer: null,
  lastDismissed: null
};

/* ---------------- icons ---------------- */
const ICONS = {
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  heart: 'M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z',
  x: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
  pin: 'M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  check: 'M5 12.5l4.5 4.5L19 7',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5 7-5s7 1.5 7 5M17 4.5a3.5 3.5 0 0 1 0 6.5M19 15c2 .6 3 2 3 5',
  nav: 'M4 11l16-7-7 16-2-7z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5'
};
const ico = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24"><path d="${ICONS[n]}"/></svg>`;

/* ---------------- helpers ---------------- */
const fmtH = h => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const getPark = id => PARKS.find(p => p.id === id);
const crowdAt = (p, day, h) => p.crowd[dayType(day)][h - 6];
const lvl = v => (v < 35 ? { key: 'quiet', label: 'Quiet' } : v < 65 ? { key: 'mod', label: 'Moderate' } : { key: 'busy', label: 'Busy' });
const badge = v => { const l = lvl(v); return `<span class="badge ${l.key}"><i></i>${l.label} · ${v}%</span>`; };
const dayName = d => (d === 'today' ? 'Today' : 'Tomorrow');

/* Stand-in for the crowd-prediction model: lowest-average 2-hour window. */
function bestWindow(p, day, from) {
  const arr = p.crowd[dayType(day)];
  let best = null;
  for (let h = Math.max(from, 6); h <= 20; h++) {
    const avg = (arr[h - 6] + arr[h - 5]) / 2;
    if (!best || avg < best.avg) best = { start: h, end: h + 2, avg: Math.round(avg) };
  }
  return best;
}

/* Stand-in for the recommender: weighted match of park vs. the user's taste profile. */
function scoreOf(p) {
  const pr = state.profile;
  const styleHit = pr.styles.length
    ? p.styles.filter(s => pr.styles.includes(s)).length / Math.min(pr.styles.length, p.styles.length)
    : 0.5;
  const levelFit = 1 - Math.abs(p.difficulty - LEVELS[pr.level]) / 2;
  const next = [NOW, NOW + 1, NOW + 2].map(h => crowdAt(p, 'today', h));
  const c = next.reduce((a, b) => a + b, 0) / 3;
  const crowdFit = pr.goal === 'quiet' ? 1 - c / 100 : pr.goal === 'social' ? 1 - Math.abs(c - 50) / 50 : 1 - c / 130;
  const distFit = Math.max(0, 1 - p.dist / 8);
  const fb = p.features.reduce((a, t) => a + (state.tagWeight[t] || 0), 0);
  const raw = 36 * styleHit + 26 * levelFit + 20 * crowdFit + 10 * distFit + 8 + Math.max(-20, Math.min(20, fb * 4));
  return Math.max(35, Math.min(99, Math.round(raw)));
}

function reasons(p) {
  const r = [];
  const pr = state.profile;
  const hit = p.styles.filter(s => pr.styles.includes(s));
  if (hit.length) r.push(`Fits your ${STYLE_LABEL[hit[0]].toLowerCase()} style`);
  if (p.difficulty === LEVELS[pr.level]) r.push(`Matches your ${pr.level} level`);
  else if (p.difficulty < LEVELS[pr.level]) r.push('Easier than your level: good warm-up');
  else r.push('A step up: good for progressing');
  const w = bestWindow(p, 'today', NOW);
  if (w && w.avg < 35) r.push(`Quiet ${fmtH(w.start)}–${fmtH(w.end)} today`);
  if (p.dist < 2) r.push(`Only ${p.dist} km away`);
  return r.slice(0, 3);
}

const rankedAll = () => PARKS.filter(p => !state.hidden.includes(p.id)).map(p => ({ p, score: scoreOf(p) })).sort((a, b) => b.score - a.score);
function ranked() {
  let list = rankedAll();
  if (state.filter === 'quiet') list = list.filter(x => crowdAt(x.p, 'today', NOW) < 35);
  if (state.filter === 'lit') list = list.filter(x => x.p.lit);
  if (state.filter === 'near') list = list.filter(x => x.p.dist < 3);
  return list;
}

function showToast(msg, undo = false) {
  state.toast = { msg, undo };
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { state.toast = null; render(); }, 3400);
}

/* ---------------- illustrations ---------------- */
function art(kind, hue) {
  const [c1, c2] = hue;
  const id = `g${kind}${c1.slice(1)}`;
  const shapes = {
    bowl: '<path d="M-10 120 Q200 290 410 120 L410 210 L-10 210Z" fill="rgba(22,19,15,.22)"/><path d="M-10 120 Q200 290 410 120" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="5"/>',
    street: '<g fill="rgba(22,19,15,.2)"><rect x="40" y="150" width="320" height="60"/><rect x="70" y="130" width="90" height="20"/><rect x="70" y="110" width="60" height="20"/><rect x="70" y="90" width="30" height="20"/></g><path d="M190 140 L330 140 M200 140v20 M320 140v20" stroke="rgba(255,255,255,.75)" stroke-width="5" fill="none" stroke-linecap="round"/>',
    transition: '<path d="M-10 60 Q70 150 110 160 L110 210 L-10 210Z" fill="rgba(22,19,15,.22)"/><path d="M410 60 Q330 150 290 160 L290 210 L410 210Z" fill="rgba(22,19,15,.22)"/><rect x="-10" y="160" width="420" height="50" fill="rgba(22,19,15,.18)"/>',
    cruise: '<path d="M-10 150 Q100 110 200 150 T410 140 L410 210 L-10 210Z" fill="rgba(22,19,15,.2)"/>'
  };
  return `<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="400" height="200" fill="url(#${id})"/><circle cx="320" cy="48" r="26" fill="rgba(255,255,255,.55)"/>${shapes[kind] || shapes.street}</svg>`;
}
const parkArt = p => art(p.styles[0], p.hue);

const statusBar = () => `<div class="status"><span>5:02</span><span class="sb-r"><i class="sig"><b></b><b></b><b></b><b></b></i><i class="batt"><b></b></i></span></div>`;

/* ---------------- onboarding ---------------- */
const OB = {
  1: {
    title: 'What do you skate?', sub: 'Pick all that apply. This trains your recommendations.', multi: true, action: 'pickStyle',
    opts: [['street', 'Street', 'Ledges, stairs, rails'], ['bowl', 'Bowl & pool', 'Deep concrete and flow lines'], ['transition', 'Transition', 'Mini ramps and quarter pipes'], ['cruise', 'Cruising', 'Smooth flat ground and carving']],
    isOn: v => state.profile.styles.includes(v)
  },
  2: {
    title: "What's your level?", sub: 'Be honest. It stops us sending you to parks that are too easy or too sketchy.', action: 'setLevel',
    opts: [['beginner', 'Beginner', 'Learning to push, ollie and drop in'], ['intermediate', 'Intermediate', 'Kickflips, rolling bowls, small gaps'], ['advanced', 'Advanced', 'Big gaps, handrails, vert']],
    isOn: v => state.profile.level === v
  },
  3: {
    title: 'What do you want from a session?', sub: 'We use this to decide when a park is "good" for you.', action: 'setGoal',
    opts: [['quiet', 'Skate in peace', 'Empty park, room to work on tricks'], ['social', 'Meet people', 'Some crowd, good energy'], ['progress', 'Progress fast', 'Right terrain, not too packed']],
    isOn: v => state.profile.goal === v
  }
};

function onboard() {
  const s = state.obStep;
  if (s === 0) {
    return `<section class="screen welcome">
      <div class="welcome-art">${art('bowl', ['#FFD28A', '#FF8A5B'])}</div>
      <div class="welcome-copy"><h1>Pushoff</h1><p>The right skatepark for your style, at the hour it's empty.</p></div>
      <button class="btn primary" data-action="start">Get started</button>
    </section>`;
  }
  const o = OB[s];
  const canGo = !(s === 1 && state.profile.styles.length === 0);
  return `<section class="screen ob">
    <div class="ob-top">
      <button class="round" style="background:#fff" data-action="obBack">${ico('back')}</button>
      <div class="progress">${[1, 2, 3].map(i => `<i class="${i <= s ? 'on' : ''}"></i>`).join('')}</div>
    </div>
    <h1>${o.title}</h1><p class="sub">${o.sub}</p>
    <div class="ob-opts">${o.opts.map(([v, t, d]) => `<button class="opt ${o.isOn(v) ? 'on' : ''}" data-action="${o.action}" data-val="${v}"><div><strong>${t}</strong><span class="d">${d}</span></div><div class="check">${ico('check')}</div></button>`).join('')}</div>
    <div class="ob-foot"><button class="btn primary" data-action="obNext" ${canGo ? '' : 'disabled'}>${s === 3 ? 'Build my feed' : 'Continue'}</button></div>
  </section>`;
}

function loading() {
  const steps = ['Reading park features', 'Forecasting crowds for today', 'Ranking parks for you'];
  return `<section class="screen loading">
    <div class="spin"></div><h2>Tuning your feed</h2>
    ${steps.map((t, i) => `<div class="ls" style="animation-delay:${0.4 + i * 0.7}s">${ico('check')}${t}</div>`).join('')}
  </section>`;
}

/* ---------------- home ---------------- */
function parkCard({ p, score }) {
  const now = crowdAt(p, 'today', NOW);
  return `<div class="card" data-action="open" data-id="${p.id}">
    <button class="round small dismiss" data-action="dismiss" data-id="${p.id}" aria-label="Not for me">${ico('x')}</button>
    <div class="card-hero">${parkArt(p)}</div>
    <div class="card-body">
      <div class="row"><h3>${p.name}</h3><span class="match">${score}% match</span></div>
      <div class="muted sm">${p.area} · ${p.dist} km${p.lit ? ' · Lit at night' : ''}</div>
      <div class="chips">${reasons(p).map(r => `<span class="chip soft">${r}</span>`).join('')}</div>
      <div class="row"><span class="muted sm">Right now</span>${badge(now)}</div>
    </div>
  </div>`;
}

function home() {
  const all = rankedAll();
  const list = ranked();
  const top = all[0];
  let hero = '';
  if (top) {
    const w = bestWindow(top.p, 'today', NOW);
    const when = w ? `Today ${fmtH(w.start)}–${fmtH(w.end)} · about ${w.avg}% busy` : 'Check tomorrow morning';
    hero = `<button class="nowcard" data-action="open" data-id="${top.p.id}">
      <div><span class="kicker">Best time to roll</span><strong>${top.p.name}</strong><span class="t">${when}</span></div>${ico('chevron')}
    </button>`;
  }
  const filters = [['all', 'All'], ['quiet', 'Quiet now'], ['lit', 'Lit at night'], ['near', 'Under 3 km']];
  return `<p class="kicker">Sunday afternoon</p><h1>For you</h1>${hero}
    <div class="chips scrollx" style="margin-bottom:16px">${filters.map(([k, t]) => `<button class="chip ${state.filter === k ? 'on' : ''}" data-action="filter" data-val="${k}">${t}</button>`).join('')}</div>
    ${list.length ? list.map(parkCard).join('') : '<div class="empty">No parks match this filter right now.</div>'}`;
}

/* ---------------- map ---------------- */
function mapScreen() {
  const sel = state.mapSel ? getPark(state.mapSel) : null;
  const pins = PARKS.map(p => {
    const v = crowdAt(p, 'today', NOW);
    const l = lvl(v);
    return `<button class="pin ${l.key} ${state.mapSel === p.id ? 'sel' : ''}" style="left:${p.map.x}%;top:${p.map.y}%" data-action="mapSel" data-id="${p.id}">
      ${state.mapSel === p.id ? `<span class="lbl">${p.name}</span>` : ''}<span class="dot">${v}%</span></button>`;
  }).join('');
  let card = '';
  if (sel) {
    const v = crowdAt(sel, 'today', NOW);
    card = `<div class="map-card">
      <div class="row" style="justify-content:flex-start;gap:12px;cursor:pointer" data-action="open" data-id="${sel.id}">
        <div class="thumb">${parkArt(sel)}</div>
        <div style="flex:1"><h3>${sel.name}</h3><div class="muted sm">${sel.area} · ${sel.dist} km</div></div>
        <span class="match">${scoreOf(sel)}%</span>
      </div>
      <div class="row">${badge(v)}<button class="chip on" data-action="open" data-id="${sel.id}">See forecast ${ico('chevron', 'sm')}</button></div>
    </div>`;
  }
  return `<div class="map">
    <svg class="map-bg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect width="100" height="100" fill="#EDE8DA"/>
      <path d="M60 100 C68 84 88 86 100 62 L100 100Z" fill="#BFDDE8"/>
      <path d="M0 84 C18 90 28 100 40 100 L0 100Z" fill="#BFDDE8"/>
      <g fill="#D6E5C2"><rect x="30" y="6" width="22" height="14" rx="2"/><rect x="62" y="52" width="18" height="12" rx="2"/><rect x="4" y="44" width="16" height="14" rx="2"/></g>
      <g stroke="#fff" stroke-width="5" fill="none"><path d="M0 36 L100 40"/><path d="M0 62 L100 55"/><path d="M28 0 L34 100"/><path d="M62 0 L56 100"/></g>
      <g stroke="#fff" stroke-width="3" fill="none"><path d="M0 14 L100 12"/><path d="M85 0 L80 100"/><path d="M10 0 L16 100"/><path d="M0 80 L100 76"/></g>
    </svg>
    <div class="me"></div>${pins}
    <div class="map-top">
      <div class="search">${ico('search')}Search parks, areas</div>
      <div class="legend"><span class="badge quiet"><i></i>Quiet</span><span class="badge mod"><i></i>Moderate</span><span class="badge busy"><i></i>Busy</span></div>
    </div>${card}
  </div>`;
}

/* ---------------- sessions ---------------- */
function sessionsScreen() {
  const list = state.sessions.slice().sort((a, b) => (a.day === 'today' ? 0 : 1) - (b.day === 'today' ? 0 : 1) || a.hour - b.hour);
  const cards = list.map(s => {
    const p = getPark(s.parkId);
    const v = crowdAt(p, s.day, s.hour);
    const best = bestWindow(p, s.day, s.day === 'today' ? NOW + 1 : 6);
    const tip = best && best.avg < v - 12 ? `Tip: ${fmtH(best.start)} looks ${best.avg}% busy, quieter than your slot.` : 'Forecast still looks good for your slot.';
    return `<div class="sess">
      <div class="row"><span class="kicker">${dayName(s.day)}</span><button class="round small" data-action="removeSession" data-id="${s.id}" style="background:#F1ECDF">${ico('x')}</button></div>
      <div class="when">${fmtH(s.hour)} · ${p.name}</div>
      <div class="row">${badge(v)}<span class="muted sm">${p.area}</span></div>
      <div class="muted sm">${tip}</div>
      <div class="row" style="gap:8px"><button class="btn ghost" style="height:44px;font-size:14px" data-action="toast" data-val="Directions would open in Maps (mockup)">${ico('nav', 'sm')}Directions</button><button class="btn ghost" style="height:44px;font-size:14px" data-action="toast" data-val="Invite link copied (mockup)">${ico('users', 'sm')}Invite crew</button></div>
    </div>`;
  }).join('');
  const saved = state.saved.map(id => getPark(id)).map(p => `<button class="mini" data-action="open" data-id="${p.id}"><div class="thumb">${parkArt(p)}</div><div style="flex:1"><strong>${p.name}</strong><div class="muted sm">${p.area} · ${p.dist} km</div></div>${badge(crowdAt(p, 'today', NOW))}</button>`).join('');
  return `<p class="kicker">Planned</p><h1>Your sessions</h1>
    <div style="margin-top:16px">${cards || '<div class="empty">No sessions yet. Open a park and tap "Plan a session".</div>'}</div>
    <div class="sec">Saved parks</div>${saved || '<div class="muted sm">Tap the heart on a park to save it.</div>'}`;
}

/* ---------------- profile ---------------- */
function profileScreen() {
  const pr = state.profile;
  const styleChips = Object.keys(STYLE_LABEL).map(k => `<button class="chip ${pr.styles.includes(k) ? 'on' : ''}" data-action="pickStyle" data-val="${k}">${STYLE_LABEL[k]}</button>`).join('');
  const seg = (items, cur, action) => `<div class="seg">${items.map(([v, t]) => `<button class="${cur === v ? 'on' : ''}" data-action="${action}" data-val="${v}">${t}</button>`).join('')}</div>`;
  return `<div class="row" style="justify-content:flex-start;gap:14px;margin-bottom:20px"><div class="avatar">S</div><div><h2>Skater</h2><div class="muted sm">Joined this week</div></div></div>
    <div class="panel">
      <h3>Your taste profile</h3>
      <div class="field"><label>Styles</label><div class="chips">${styleChips}</div></div>
      <div class="field"><label>Level</label>${seg([['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']], pr.level, 'setLevel')}</div>
      <div class="field" style="margin-bottom:0"><label>Session goal</label>${seg(Object.entries(GOAL_LABEL), pr.goal, 'setGoal')}</div>
      <p class="fine">Change anything here and your For You feed re-ranks instantly.</p>
    </div>
    <div class="panel"><h3>How Pushoff picks parks</h3><div class="how">
      <div><b>Taste model</b>Matches park features to your styles and level, and learns from the parks you hide.</div>
      <div><b>Crowd forecast</b>Predicts how busy each park is by the hour from day of week, past check-ins and weather.</div>
    </div></div>
    <div class="panel"><h3>Feedback</h3>
      <p class="sm muted" style="margin-bottom:12px">${state.hidden.length} hidden park${state.hidden.length === 1 ? '' : 's'}</p>
      <div class="row" style="gap:8px"><button class="btn ghost" style="height:44px;font-size:14px" data-action="restoreHidden">Restore hidden</button><button class="btn ghost" style="height:44px;font-size:14px" data-action="reset">Redo onboarding</button></div>
    </div>`;
}

function tabbar() {
  const t = [['home', 'star', 'For you'], ['map', 'map', 'Map'], ['sessions', 'cal', 'Sessions'], ['profile', 'user', 'Profile']];
  return `<nav class="tabbar">${t.map(([k, i, l]) => `<button class="tab ${state.tab === k ? 'on' : ''}" data-action="tab" data-val="${k}">${ico(i)}${l}</button>`).join('')}</nav>`;
}

function appShell() {
  const body = { home, map: mapScreen, sessions: sessionsScreen, profile: profileScreen }[state.tab]();
  return `<section class="screen"><div class="scroll ${state.tab === 'map' ? 'map-scroll' : ''}">${body}</div>${tabbar()}</section>`;
}

/* ---------------- detail ---------------- */
function detail(p) {
  const score = scoreOf(p);
  const day = state.forecastDay;
  const arr = p.crowd[dayType(day)];
  const best = bestWindow(p, day, day === 'today' ? NOW : 6);
  const sel = state.selHour ?? (day === 'today' ? NOW : best.start);
  const v = arr[sel - 6];
  const saved = state.saved.includes(p.id);
  const bars = HOURS.map((h, i) => {
    const val = arr[i];
    const past = day === 'today' && h < NOW;
    const inBest = best && h >= best.start && h < best.end;
    return `<button class="bar ${lvl(val).key} ${past ? 'past' : ''} ${h === sel ? 'sel' : ''} ${inBest ? 'best' : ''}" data-action="selHour" data-val="${h}" style="--h:${val}"><span class="fill"></span><em>${i % 3 === 0 ? (h % 12 || 12) + (h >= 12 ? 'p' : 'a') : ''}</em></button>`;
  }).join('');
  return `<div class="detail">
    <div class="topbar">
      <button class="round" data-action="closeDetail" aria-label="Back">${ico('back')}</button>
      <button class="round" data-action="save" data-id="${p.id}" aria-label="Save" style="${saved ? 'color:var(--accent)' : ''}"><svg class="ico" viewBox="0 0 24 24" style="${saved ? 'fill:currentColor' : ''}"><path d="${ICONS.heart}"/></svg></button>
    </div>
    <div class="detail-scroll">
      <div class="hero">${parkArt(p)}</div>
      <div class="detail-body">
        <div><h1 style="font-size:30px">${p.name}</h1>
          <div class="muted sm" style="margin-top:6px">${p.area} · ${p.dist} km · ${p.hours}</div></div>
        <div class="panel"><div class="row" style="gap:14px;align-items:flex-start">
          <div class="ring" style="--p:${score}"><b>${score}%</b></div>
          <div style="flex:1"><h3 style="margin-bottom:6px">Why it's a match</h3><div class="why">${reasons(p).map(r => `<div>${ico('check')}${r}</div>`).join('')}</div></div>
        </div></div>
        <div class="panel">
          <h3>Crowd forecast</h3>
          <div class="seg"><button class="${day === 'today' ? 'on' : ''}" data-action="forecastDay" data-val="today">Today (Sun)</button><button class="${day === 'tomorrow' ? 'on' : ''}" data-action="forecastDay" data-val="tomorrow">Tomorrow (Mon)</button></div>
          <div class="chart">${bars}</div>
          <div class="readout"><span>${fmtH(sel)}</span>${badge(v)}</div>
          ${best ? `<div class="best-note">${ico('clock', 'sm')}Best window: ${fmtH(best.start)}–${fmtH(best.end)} · about ${best.avg}% busy</div>` : ''}
          <p class="fine">Mockup: forecast is generated from sample data.</p>
        </div>
        <div class="panel"><h3>What's here</h3><div class="chips">${p.features.map(f => `<span class="chip soft">${f}</span>`).join('')}</div></div>
        <div class="panel"><h3>Local tip</h3><p class="sm">${p.tip}</p></div>
      </div>
    </div>
    <div class="cta"><button class="btn ghost" data-action="toast" data-val="Directions would open in Maps (mockup)">${ico('nav', 'sm')}Go</button><button class="btn accent" data-action="plan" data-id="${p.id}">Plan a session</button></div>
  </div>`;
}

/* ---------------- sheets ---------------- */
function sheet() {
  const sh = state.sheet;
  if (!sh) return '';
  const p = getPark(sh.parkId);
  let body = '';
  if (sh.type === 'plan') {
    const hrs = sh.day === 'today' ? range(NOW + 1, 21) : range(7, 21);
    const best = bestWindow(p, sh.day, sh.day === 'today' ? NOW + 1 : 7);
    const v = crowdAt(p, sh.day, sh.hour);
    body = `<h2>Plan a session</h2><div class="muted sm" style="margin-top:-8px">${p.name}</div>
      <div class="seg"><button class="${sh.day === 'today' ? 'on' : ''}" data-action="planDay" data-val="today">Today</button><button class="${sh.day === 'tomorrow' ? 'on' : ''}" data-action="planDay" data-val="tomorrow">Tomorrow</button></div>
      <div class="slots">${hrs.map(h => { const x = crowdAt(p, sh.day, h); return `<button class="slot ${lvl(x).key} ${h === sh.hour ? 'on' : ''}" data-action="planHour" data-val="${h}"><span>${fmtH(h)}</span><small>${x}% busy</small>${best && h === best.start ? '<em>Best</em>' : ''}</button>`; }).join('')}</div>
      <div class="row"><span class="muted sm">Predicted at ${fmtH(sh.hour)}</span>${badge(v)}</div>
      <button class="btn primary" data-action="planConfirm">Add ${fmtH(sh.hour)} ${sh.day === 'today' ? 'today' : 'tomorrow'}</button>`;
  } else {
    const reasonsList = [['crowd', 'Usually too crowded'], ['style', 'Wrong style for me'], ['far', 'Too far away'], ['level', 'Too hard or too easy']];
    body = `<h2>Why isn't ${p.name} for you?</h2><div class="muted sm" style="margin-top:-8px">We'll show fewer parks like it.</div>
      ${reasonsList.map(([k, t]) => `<button class="opt" data-action="dismissReason" data-val="${k}"><strong style="font-size:16px">${t}</strong>${ico('chevron')}</button>`).join('')}`;
  }
  return `<div class="backdrop" data-action="closeSheet"></div><div class="sheet"><div class="grab"></div>${body}</div>`;
}

const toastView = () => (state.toast ? `<div class="toast"><span>${state.toast.msg}</span>${state.toast.undo ? '<button data-action="undo">Undo</button>' : ''}</div>` : '');

/* ---------------- render + events ---------------- */
function render() {
  const s1 = document.querySelector('.scroll');
  const s2 = document.querySelector('.detail-scroll');
  const pos = { main: s1 ? s1.scrollTop : 0, detail: s2 ? s2.scrollTop : 0 };
  const key = `${state.screen}|${state.tab}|${state.obStep}`;
  const dkey = state.detailId || '';
  const sameMain = $app.dataset.key === key;
  const sameDetail = $app.dataset.dkey === dkey;

  let html = statusBar();
  if (state.screen === 'onboard') html += onboard();
  else if (state.screen === 'loading') html += loading();
  else html += appShell() + (state.detailId ? detail(getPark(state.detailId)) : '') + sheet();
  html += toastView();
  $app.innerHTML = html;

  $app.dataset.key = key;
  $app.dataset.dkey = dkey;
  if (sameMain) { const n = document.querySelector('.scroll'); if (n) n.scrollTop = pos.main; }
  if (sameDetail) { const n = document.querySelector('.detail-scroll'); if (n) n.scrollTop = pos.detail; }
}

const handlers = {
  start() { state.obStep = 1; },
  obBack() { state.obStep = Math.max(0, state.obStep - 1); },
  obNext() {
    if (state.obStep < 3) { state.obStep++; return; }
    state.screen = 'loading';
    setTimeout(() => { state.screen = 'app'; state.tab = 'home'; render(); }, 2600);
  },
  pickStyle(_, v) {
    const s = state.profile.styles;
    state.profile.styles = s.includes(v) ? s.filter(x => x !== v) : [...s, v];
  },
  setLevel(_, v) { state.profile.level = v; },
  setGoal(_, v) { state.profile.goal = v; },
  tab(_, v) { state.tab = v; state.detailId = null; state.sheet = null; },
  open(id) { state.detailId = id; state.forecastDay = 'today'; state.selHour = null; },
  closeDetail() { state.detailId = null; },
  filter(_, v) { state.filter = v; },
  dismiss(id) { state.sheet = { type: 'dismiss', parkId: id }; },
  dismissReason(_, v) {
    const p = getPark(state.sheet.parkId);
    state.lastDismissed = { id: p.id, prev: { ...state.tagWeight } };
    const amt = v === 'style' ? -1.5 : -0.75;
    p.features.forEach(t => { state.tagWeight[t] = (state.tagWeight[t] || 0) + amt; });
    state.hidden.push(p.id);
    state.sheet = null;
    showToast('Got it. Showing fewer parks like this.', true);
  },
  undo() {
    const d = state.lastDismissed;
    if (!d) return;
    state.hidden = state.hidden.filter(x => x !== d.id);
    state.tagWeight = d.prev;
    state.lastDismissed = null;
    state.toast = null;
  },
  save(id) { state.saved = state.saved.includes(id) ? state.saved.filter(x => x !== id) : [...state.saved, id]; },
  mapSel(id) { state.mapSel = id; },
  forecastDay(_, v) { state.forecastDay = v; state.selHour = null; },
  selHour(_, v) { state.selHour = +v; },
  plan(id) {
    const w = bestWindow(getPark(id), 'today', NOW + 1);
    state.sheet = { type: 'plan', parkId: id, day: 'today', hour: w ? w.start : 21 };
  },
  planDay(_, v) {
    const p = getPark(state.sheet.parkId);
    const w = bestWindow(p, v, v === 'today' ? NOW + 1 : 7);
    state.sheet.day = v;
    state.sheet.hour = w ? w.start : (v === 'today' ? 21 : 8);
  },
  planHour(_, v) { state.sheet.hour = +v; },
  planConfirm() {
    const { parkId, day, hour } = state.sheet;
    state.sessions.push({ id: Date.now(), parkId, day, hour });
    state.sheet = null; state.detailId = null; state.tab = 'sessions';
    showToast("Session added. We'll re-check the forecast before you go.");
  },
  removeSession(id) { state.sessions = state.sessions.filter(s => String(s.id) !== String(id)); },
  closeSheet() { state.sheet = null; },
  toast(_, v) { showToast(v); },
  restoreHidden() { state.hidden = []; state.tagWeight = {}; showToast('Hidden parks restored'); },
  reset() {
    state.profile = { styles: ['street'], level: 'intermediate', goal: 'quiet' };
    state.tagWeight = {}; state.hidden = [];
    state.screen = 'onboard'; state.obStep = 0; state.detailId = null; state.sheet = null;
  }
};

$app.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = handlers[el.dataset.action];
  if (!fn) return;
  fn(el.dataset.id, el.dataset.val);
  render();
});

render();
