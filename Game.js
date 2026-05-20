const OUTCOMES = [
  { id:'treasure', label:'Treasure', icon:'💰', effect:'+20 Gold', hpDelta:0, goldDelta:20, tag:'good' },
  { id:'enemy',    label:'Enemy',    icon:'⚔️', effect:'-15 HP',   hpDelta:-15, goldDelta:0, tag:'danger' },
  { id:'trap',     label:'Trap',     icon:'☠️', effect:'-25 HP',   hpDelta:-25, goldDelta:0, tag:'danger' },
  { id:'ability',  label:'Special Ability', icon:'✨', effect:'+10 HP, +5 Gold', hpDelta:10, goldDelta:5, tag:'special' },
  { id:'rareitem', label:'Rare Item',icon:'👑', effect:'+40 Gold, +5 HP', hpDelta:5, goldDelta:40, tag:'good' },
];

function randProbs(n) {
  let r = Array.from({length:n}, ()=> Math.random()+0.3);
  let sum = r.reduce((a,b)=>a+b,0);
  r = r.map(x=>x/sum);
  let t = 0; let out = [];
  for(let i=0;i<n-1;i++){ let p=Math.round(r[i]*100); t+=p; out.push(p); }
  out.push(100-t);
  return out;
}

function weightedPick(probs) {
  let roll = Math.random()*100, cum=0;
  for(let i=0;i<probs.length;i++){ cum+=probs[i]; if(roll<cum) return i; }
  return probs.length-1;
}

function genDoors(numDoors) {
  return Array.from({length:numDoors},(_,i)=>{
    let picks = OUTCOMES.slice().sort(()=>Math.random()-0.5).slice(0,3+Math.floor(Math.random()*2));
    let probs = randProbs(picks.length);
    return { id:i, outcomes:picks, probs };
  });
}

let state = { hp:100, gold:0, round:1, phase:'choose', doors:[], log:[], chosen:null, result:null, alive:true };

function initRound() {
  let n = 2 + Math.min(state.round-1, 2);
  state.doors = genDoors(n);
  state.phase = 'choose';
  state.chosen = null;
  state.result = null;
}

function pickDoor(idx) {
  if(state.phase !== 'choose') return;
  let door = state.doors[idx];
  let oi = weightedPick(door.probs);
  let outcome = door.outcomes[oi];
  state.hp = Math.max(0, Math.min(100, state.hp + outcome.hpDelta));
  state.gold += outcome.goldDelta;
  state.chosen = idx;
  state.result = outcome;
  state.phase = 'reveal';
  let msg = `Round ${state.round}: Door ${idx+1} — ${outcome.icon} ${outcome.label} (${outcome.effect})`;
  state.log.unshift(msg);
  if(state.log.length > 4) state.log.pop();
  if(state.hp <= 0) { state.alive = false; }
  render();
  if(state.alive) {
    setTimeout(()=>{ state.phase='next'; render(); }, 900);
  }
}

function nextRound() {
  state.round++;
  initRound();
  render();
}

function restart() {
  state = { hp:100, gold:0, round:1, phase:'choose', doors:[], log:[], chosen:null, result:null, alive:true };
  initRound();
  render();
}

function hpColor(hp) {
  if(hp>55) return 'var(--hp-good)';
  if(hp>25) return 'var(--hp-mid)';
  return 'var(--hp-bad)';
}

function render() {
  const root = document.getElementById('main-content');
  if(!state.alive) {
    root.innerHTML = `
      <div class="gameover">
        <h2>⚰️ You Fell</h2>
        <p>The hallway has claimed another wanderer.</p>
        <span class="score-big">💰 ${state.gold} Gold</span>
        <p style="font-size:13px;margin-bottom:6px;">Survived <strong style="color:var(--gold-light)">${state.round}</strong> rounds</p>
        <button class="btn-next" onclick="restart()">↩ Try Again</button>
      </div>`;
    return;
  }

  let doorsHTML = state.doors.map((door,i)=>{
    let isChosen = state.chosen === i;
    let disabled = state.phase !== 'choose' ? 'disabled' : '';
    let probRows = door.outcomes.map((o,j)=>`
      <div class="prob-row"><span class="emoji">${o.icon} ${o.label}</span><span class="pct">${door.probs[j]}%</span></div>
    `).join('');
    let overlay = '';
    if(isChosen && state.result) {
      let cls = state.result.tag === 'danger' ? '' : 'good';
      overlay = `<div class="result-overlay show">
        <div class="result-icon">${state.result.icon}</div>
        <div class="result-name">${state.result.label}</div>
        <div class="result-effect ${cls}">${state.result.effect}</div>
      </div>`;
    }
    return `
      <div class="door ${disabled}" onclick="pickDoor(${i})" tabindex="0" aria-label="Door ${i+1}">
        <div class="door-arch"></div>
        <div class="door-knob"></div>
        <div class="door-num">Door ${i+1}</div>
        <div class="prob-list">${probRows}</div>
        <div class="door-hint">Choose wisely…</div>
        ${overlay}
      </div>`;
  }).join('');

  let sceneMsg = state.phase === 'choose'
    ? 'A dimly lit hallway stretches before you. Which door calls to you?'
    : state.phase === 'reveal'
    ? `You opened Door ${state.chosen+1}...`
    : 'The dust settles. Ready for the next room?';

  let logHTML = state.log.slice(0,3).map(l=>`<div class="log-entry">${l}</div>`).join('') || '<div class="log-entry" style="font-style:italic">No events yet…</div>';

  let nextBtn = state.phase === 'next'
    ? `<button class="btn-next" onclick="nextRound()">Advance → Round ${state.round+1}</button>`
    : `<button class="btn-next" disabled>Choose a door…</button>`;

  root.innerHTML = `
    <h1 class="title">Lucky Doors</h1>
    <p class="subtitle">A hallway of fate and fortune</p>
    <div class="hud">
      <div class="hud-item">
        <span class="hud-label">Round</span>
        <span class="hud-val">${state.round}</span>
      </div>
      <div class="hud-item hp-bar-wrap">
        <span class="hud-label">HP — ${state.hp}</span>
        <div class="hp-bar-bg"><div class="hp-bar-fill" style="width:${state.hp}%;background:${hpColor(state.hp)}"></div></div>
      </div>
      <div class="hud-item">
        <span class="hud-label">Gold</span>
        <span class="hud-val">💰 ${state.gold}</span>
      </div>
    </div>
    <div class="round-label">— Round ${state.round} —</div>
    <p class="scene-text">${sceneMsg}</p>
    <div class="doors-row">${doorsHTML}</div>
    <div class="log-area">${logHTML}</div>
    ${nextBtn}
  `;
}

function setupStars() {
  const c = document.getElementById('stars');
  const root = document.getElementById('game-root');
  c.width = root.offsetWidth; c.height = root.offsetHeight;
  const ctx = c.getContext('2d');
  for(let i=0;i<60;i++){
    ctx.beginPath();
    ctx.arc(Math.random()*c.width, Math.random()*c.height, Math.random()*1.2, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,245,200,${Math.random()*0.35+0.05})`;
    ctx.fill();
  }
}

setupStars();
initRound();
render();