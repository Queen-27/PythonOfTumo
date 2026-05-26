const OUTCOMES = [
  { id:'treasure', label:'Treasure', icon:'💰', effect:'+20 Gold', hpDelta:0, goldDelta:20, tag:'good' },
  { id:'enemy',    label:'Enemy',    icon:'⚔️', effect:'-15 HP',   hpDelta:-15, goldDelta:0, tag:'danger' },
  { id:'trap',     label:'Trap',     icon:'☠️', effect:'-25 HP',   hpDelta:-25, goldDelta:0, tag:'danger' },
  { id:'ability',  label:'Special Ability', icon:'✨', effect:'+10 HP, +5 Gold', hpDelta:10, goldDelta:5, tag:'special' },
  { id:'rareitem', label:'Rare Item',icon:'👑', effect:'+40 Gold, +5 HP', hpDelta:5, goldDelta:40, tag:'good' },
]

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

let state = { hp:100, gold:0, round:1, phase:'choose', doors:[], log:[], chosen:null, result:null, alive:true, won:false };

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
  // Win condition: reach 1000 gold
  if(state.gold >= 1000) {
    state.won = true;
    state.phase = 'won';
    state.log.unshift(`🏆 Reached ${state.gold} Gold — You win!`);
    if(state.log.length > 6) state.log.pop();
    render();
    return;
  }
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
  state = { hp:100, gold:0, round:1, phase:'choose', doors:[], log:[], chosen:null, result:null, alive:true, won:false };
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
  if(state.won) {
    root.innerHTML = `
      <div class="gameover">
        <h2>🏆 You Win!</h2>
        <p>You've amassed enough fortune to escape the hallway.</p>
        <span class="score-big">💰 ${state.gold} Gold</span>
        <p style="font-size:13px;margin-bottom:6px;">Cleared <strong style="color:var(--gold-light)">${state.round}</strong> rounds</p>
        <button class="btn-next" onclick="restart()">↩ Play Again</button>
      </div>`;
    return;
  }
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
    <a class="diogram-link" href="./diogram.html">Go to Diorama</a>
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

function randProbs(n) {
  let r = Array.from({length:n}, ()=> Math.random()+0.3);
  let sum = r.reduce((a,b)=>a+b,0);
  r = r.map(x=>x/sum);
  let t=0, out=[];
  for(let i=0;i<n-1;i++){ let p=Math.round(r[i]*100); t+=p; out.push(p); }
  out.push(100-t);
  return out;
}

function weightedPick(probs) {
  let roll=Math.random()*100, cum=0;
  for(let i=0;i<probs.length;i++){ cum+=probs[i]; if(roll<cum) return i; }
  return probs.length-1;
}

function genDoor() {
  let picks = OUTCOMES.slice().sort(()=>Math.random()-0.5).slice(0, 3+Math.floor(Math.random()*2));
  let probs = randProbs(picks.length);
  return { outcomes:picks, probs };
}

function oneRun(startHp, firstRoundDoors) {
  let hp=startHp, gold=0, round=1;
  while(hp>0 && round<=200) {
    let numDoors = round === 1 ? firstRoundDoors : 2 + Math.min(round-1,2);
    let doorIdx = Math.floor(Math.random()*numDoors);
    let door = genDoor();
    let oi = weightedPick(door.probs);
    let o = door.outcomes[oi];
    hp = Math.max(0, Math.min(startHp, hp + o.hpDelta));
    gold += o.goldDelta;
    if(hp <= 0) break;
    round++;
  }
  return { rounds: round, gold, survived: round>200 };
}

function computeAnalyticalEV() {
  const N=50000;
  let totHp=0, totGold=0, counts={};
  OUTCOMES.forEach(o=>counts[o.id]=0);
  for(let i=0;i<N;i++){
    let door = genDoor();
    let oi = weightedPick(door.probs);
    let o = door.outcomes[oi];
    totHp += o.hpDelta;
    totGold += o.goldDelta;
    counts[o.id]++;
  }
  return { evHp: totHp/N, evGold: totGold/N, counts, N };
}

let charts = {};
function destroyChart(id){ if(charts[id]){ charts[id].destroy(); delete charts[id]; } }

function runSim() {
  const startHp = +document.getElementById('startHp').value;
  const firstRoundDoors = +document.getElementById('numDoors').value;
  const RUNS = 10000;

  const results = [];
  for(let i=0;i<RUNS;i++) results.push(oneRun(startHp, firstRoundDoors));

  const roundsList = results.map(r=>r.rounds);
  const goldList   = results.map(r=>r.gold);
  const survived   = results.filter(r=>r.survived).length;
  const avgRounds  = roundsList.reduce((a,b)=>a+b,0)/RUNS;
  const avgGold    = goldList.reduce((a,b)=>a+b,0)/RUNS;
  const maxRounds  = Math.max(...roundsList);
  const maxGold    = Math.max(...goldList);

  document.getElementById('metric-cards').innerHTML = [
    ['Avg rounds survived', avgRounds.toFixed(1)],
    ['Avg gold earned', Math.round(avgGold)+'g'],
    ['Max rounds', maxRounds],
    ['Max gold', maxGold+'g'],
    ['Survived 200', ((survived/RUNS)*100).toFixed(1)+'%'],
  ].map(([l,v])=>`
    <div style="background:var(--color-background-secondary); border-radius:var(--border-radius-md); padding:1rem; text-align:center;">
      <div style="font-size:12px; color:var(--color-text-secondary); margin-bottom:6px;">${l}</div>
      <div style="font-size:22px; font-weight:500;">${v}</div>
    </div>`).join('');

  const ev = computeAnalyticalEV();

  const COLORS = {
    treasure:'#3B6D11', enemy:'#A32D2D', trap:'#851F1F',
    ability:'#534AB7', rareitem:'#185FA5'
  };
  const outLabels = OUTCOMES.map(o=>o.label);
  const outCounts = OUTCOMES.map(o=>ev.counts[o.id]);
  const outColors = OUTCOMES.map(o=>COLORS[o.id]);

  destroyChart('outChart');
  charts['outChart'] = new Chart(document.getElementById('outChart'), {
    type:'bar',
    data:{ labels:outLabels, datasets:[{
      label:'Picks', data:outCounts, backgroundColor:outColors,
      borderWidth:0
    }]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ ticks:{font:{size:11}, autoSkip:false, maxRotation:30} },
        y:{ ticks:{font:{size:11}}, grid:{color:'rgba(128,128,128,0.1)'} }
      }
    }
  });

  function histogram(arr, bins) {
    let mn=Math.min(...arr), mx=Math.max(...arr);
    let w=(mx-mn)/bins;
    let edges=Array.from({length:bins},(_,i)=>mn+i*w);
    let counts=new Array(bins).fill(0);
    arr.forEach(v=>{ let b=Math.min(bins-1, Math.floor((v-mn)/w)); counts[b]++; });
    return { edges, counts, w };
  }

  const gh = histogram(goldList, 20);
  destroyChart('goldChart');
  charts['goldChart'] = new Chart(document.getElementById('goldChart'), {
    type:'bar',
    data:{ labels:gh.edges.map(e=>Math.round(e)), datasets:[{
      label:'Runs', data:gh.counts, backgroundColor:'#3266ad', borderWidth:0
    }]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ ticks:{font:{size:10}, maxTicksLimit:8, autoSkip:true}, title:{display:true, text:'Gold', font:{size:11}} },
        y:{ ticks:{font:{size:11}}, grid:{color:'rgba(128,128,128,0.1)'} }
      }
    }
  });

  const rh = histogram(roundsList, Math.min(maxRounds, 30));
  destroyChart('roundChart');
  charts['roundChart'] = new Chart(document.getElementById('roundChart'), {
    type:'bar',
    data:{ labels:rh.edges.map(e=>Math.round(e)), datasets:[{
      label:'Runs', data:rh.counts, backgroundColor:'#534AB7', borderWidth:0
    }]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ ticks:{font:{size:10}, maxTicksLimit:8, autoSkip:true}, title:{display:true, text:'Rounds', font:{size:11}} },
        y:{ ticks:{font:{size:11}}, grid:{color:'rgba(128,128,128,0.1)'} }
      }
    }
  });

  destroyChart('evChart');
  charts['evChart'] = new Chart(document.getElementById('evChart'), {
    type:'bar',
    data:{ labels:OUTCOMES.map(o=>o.label), datasets:[
      { label:'HP EV', data:OUTCOMES.map(o=>o.hpDelta), backgroundColor:'#3ca870', borderWidth:0 },
      { label:'Gold EV', data:OUTCOMES.map(o=>o.goldDelta), backgroundColor:'#c9a84c', borderWidth:0 }
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ ticks:{font:{size:10}, autoSkip:false, maxRotation:30} },
        y:{ ticks:{font:{size:11}}, grid:{color:'rgba(128,128,128,0.1)'} }
      }
    }
  });

  const hpEV = OUTCOMES.reduce((sum,o)=>{
    let share = ev.counts[o.id]/ev.N;
    return sum + o.hpDelta * share;
  },0);
  const goldEV = OUTCOMES.reduce((sum,o)=>{
    let share = ev.counts[o.id]/ev.N;
    return sum + o.goldDelta * share;
  },0);

  document.getElementById('ev-table').innerHTML = `
    <div style="font-size:12px; color:var(--color-text-secondary); margin-bottom:10px;">Expected value per door pick (analytical, 50k samples)</div>
    <div style="display:flex; gap:24px; flex-wrap:wrap; margin-bottom:12px;">
      <span style="font-size:13px;">HP per pick: <strong style="color:${hpEV>=0?'#3ca870':'#c04040'}">${hpEV>=0?'+':''}${hpEV.toFixed(2)}</strong></span>
      <span style="font-size:13px;">Gold per pick: <strong style="color:#c9a84c">+${goldEV.toFixed(2)}g</strong></span>
    </div>
    <table style="width:100%; font-size:12px; border-collapse:collapse;">
      <tr style="color:var(--color-text-secondary); border-bottom:0.5px solid var(--color-border-tertiary);">
        <td style="padding:4px 8px 4px 0;">Outcome</td>
        <td style="padding:4px 8px; text-align:right;">HP delta</td>
        <td style="padding:4px 8px; text-align:right;">Gold delta</td>
        <td style="padding:4px 8px; text-align:right;">Pick share</td>
        <td style="padding:4px 8px; text-align:right;">HP contrib.</td>
        <td style="padding:4px 8px; text-align:right;">Gold contrib.</td>
      </tr>
      ${OUTCOMES.map(o=>{
        let share = ev.counts[o.id]/ev.N;
        let hpC = o.hpDelta * share;
        let gC  = o.goldDelta * share;
        return `<tr style="border-bottom:0.5px solid var(--color-border-tertiary);">
          <td style="padding:4px 8px 4px 0;">${o.label}</td>
          <td style="padding:4px 8px; text-align:right; color:${o.hpDelta<0?'#c04040':o.hpDelta>0?'#3ca870':'var(--color-text-secondary)'};">${o.hpDelta>=0?'+':''}${o.hpDelta}</td>
          <td style="padding:4px 8px; text-align:right; color:${o.goldDelta>0?'#c9a84c':'var(--color-text-secondary)'};">${o.goldDelta>=0?'+':''}${o.goldDelta}</td>
          <td style="padding:4px 8px; text-align:right;">${(share*100).toFixed(1)}%</td>
          <td style="padding:4px 8px; text-align:right; color:${hpC<0?'#c04040':hpC>0?'#3ca870':'var(--color-text-secondary)'};">${hpC>=0?'+':''}${hpC.toFixed(2)}</td>
          <td style="padding:4px 8px; text-align:right; color:${gC>0?'#c9a84c':'var(--color-text-secondary)'};">${gC>=0?'+':''}${gC.toFixed(2)}g</td>
        </tr>`;
      }).join('')}
      <tr style="font-weight:500;">
        <td style="padding:6px 8px 4px 0;">Total EV</td>
        <td></td><td></td><td></td>
        <td style="padding:6px 8px; text-align:right; color:${hpEV>=0?'#3ca870':'#c04040'};">${hpEV>=0?'+':''}${hpEV.toFixed(2)}</td>
        <td style="padding:6px 8px; text-align:right; color:#c9a84c;">+${goldEV.toFixed(2)}g</td>
      </tr>
    </table>
    <div style="margin-top:10px; font-size:11px; color:var(--color-text-secondary);">
      Legend: <span style="display:inline-flex; align-items:center; gap:4px; margin-right:12px;"><span style="width:10px;height:10px;background:#3ca870;border-radius:2px;"></span> HP</span>
      <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:10px;height:10px;background:#c9a84c;border-radius:2px;"></span> Gold</span>
    </div>
  `;
}

const startHpEl = document.getElementById('startHp');
const numDoorsEl = document.getElementById('numDoors');
if(startHpEl){ startHpEl.oninput = function(){ const out = document.getElementById('startHpOut'); if(out) out.textContent = this.value; }; }
if(numDoorsEl){ numDoorsEl.oninput = function(){ const out = document.getElementById('numDoorsOut'); if(out) out.textContent = this.value; }; }

// If simulation controls are present, run the sim UI. Otherwise initialize the playable game.
if(startHpEl && numDoorsEl){
  runSim();
} else {
  // Initialize game view (doors, stars, etc.) for `game.html` page
  initRound();
  render();
  // draw background stars if canvas exists
  try { setupStars(); window.addEventListener('resize', setupStars); } catch(e) { /* ignore if canvas missing */ }
}

setupStars();
initRound();
render();


