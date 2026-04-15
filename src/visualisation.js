import { PAUL_RICARD_SEGMENTS } from './track_model.js';

const CC = { FL: '#e84040', FR: '#f5a623', RL: '#4a90d9', RR: '#7ed321' };
const CORNERS = ['FL', 'FR', 'RL', 'RR'];
const charts = {};

export function renderDashboard(data, formatLapTime) {
  const rc = data.filter(d => !d.isWU);
  const best = rc.reduce((b, d) => d.lapTime < b.lapTime ? d : b, rc[0]);
  const avg = rc.reduce((s, d) => s + d.lapTime, 0) / rc.length;
  const last = data[data.length - 1];
  const mg = CORNERS.reduce((s, c) => s + last[`${c}_grip`], 0) / 4;

  document.getElementById('content').innerHTML = `
  <div class="metrics-row">
    <div class="mc"><div class="ml">Best lap</div><div class="mv" style="font-size:15px">${formatLapTime(best.lapTime)}</div><div class="ms">Lap ${best.lap}</div></div>
    <div class="mc"><div class="ml">Average lap</div><div class="mv" style="font-size:15px">${formatLapTime(avg)}</div><div class="ms">Race laps only</div></div>
    <div class="mc"><div class="ml">Fuel remaining</div><div class="mv">${last.fuel.toFixed(1)}<span class="mu">L</span></div><div class="ms">${(last.fuel / data[0].fuel * 100).toFixed(1)}% left</div></div>
    <div class="mc"><div class="ml">Final mass</div><div class="mv">${Math.round(last.totalMass)}<span class="mu">kg</span></div><div class="ms">F ${last.frontLoad.toFixed(0)} / R ${last.rearLoad.toFixed(0)}</div></div>
    <div class="mc"><div class="ml">Mean grip</div><div class="mv">${(mg * 100).toFixed(1)}<span class="mu">%</span></div><div class="ms">End of stint</div></div>
  </div>
  <div class="cg">
    <div class="cp"><div class="ct"><span class="dot" style="background:#ce9178"></span>Tyre temperatures (°C)</div><div class="leg-row">${CORNERS.map(c => `<span class="leg"><span class="leg-sq" style="background:${CC[c]}"></span>${c}</span>`).join('')}</div><div style="position:relative;height:150px"><canvas id="cT" role="img" aria-label="Tyre temperature per corner"></canvas></div></div>
    <div class="cp"><div class="ct"><span class="dot" style="background:#9cdcfe"></span>Tyre pressures (PSI)</div><div class="leg-row">${CORNERS.map(c => `<span class="leg"><span class="leg-sq" style="background:${CC[c]}"></span>${c}</span>`).join('')}</div><div style="position:relative;height:150px"><canvas id="cP" role="img" aria-label="Tyre pressure per corner"></canvas></div></div>
    <div class="cp"><div class="ct"><span class="dot" style="background:#7ed321"></span>Grip level</div><div class="leg-row">${CORNERS.map(c => `<span class="leg"><span class="leg-sq" style="background:${CC[c]}"></span>${c}</span>`).join('')}</div><div style="position:relative;height:150px"><canvas id="cG" role="img" aria-label="Tyre grip per corner"></canvas></div></div>
    <div class="cp"><div class="ct"><span class="dot" style="background:#e84040"></span>Tyre degradation</div><div class="leg-row">${CORNERS.map(c => `<span class="leg"><span class="leg-sq" style="background:${CC[c]}"></span>${c}</span>`).join('')}</div><div style="position:relative;height:150px"><canvas id="cD" role="img" aria-label="Tyre degradation per corner"></canvas></div></div>
    <div class="cp"><div class="ct"><span class="dot" style="background:#007acc"></span>Lap times</div><div class="leg-row"><span class="leg"><span class="leg-sq" style="background:#007acc"></span>Lap time</span><span class="leg"><span class="leg-sq" style="background:#ff3c5f"></span>3-lap avg</span></div><div style="position:relative;height:150px"><canvas id="cL" role="img" aria-label="Lap times over stint"></canvas></div></div>
    <div class="cp"><div class="ct"><span class="dot" style="background:#f5a623"></span>Fuel & mass</div><div class="leg-row"><span class="leg"><span class="leg-sq" style="background:#f5a623"></span>Fuel (L)</span><span class="leg"><span class="leg-sq" style="background:#4a90d9"></span>Mass (kg)</span></div><div style="position:relative;height:150px"><canvas id="cF" role="img" aria-label="Fuel and mass over stint"></canvas></div></div>
  </div>
  <div class="heat-panel">
    <div class="ct" style="margin-bottom:7px"><span class="dot" style="background:#f5a623"></span>Circuit Paul Ricard — tyre stress heat map</div>
    <div style="display:flex;gap:5px;margin-bottom:8px;align-items:center;">
      ${CORNERS.map((c, i) => `<button class="csb${i === 2 ? ' active' : ''}" onclick="drawHeat(window._simData,'${c}',this)">${c}</button>`).join('')}
      <span style="font-size:10px;color:#4a4a4a;margin-left:8px">blue = low stress &nbsp;|&nbsp; red = high stress</span>
    </div>
    <div style="position:relative;background:#1e1e1e;border-radius:3px;overflow:hidden;height:300px">
      <canvas id="heatC" width="900" height="300" style="width:100%;height:100%"></canvas>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px">
      ${PAUL_RICARD_SEGMENTS.map((s,i) => `<span style="font-size:9px;color:#4a4a4a"><span id="segDot${i}" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#4a4a4a;margin-right:3px;vertical-align:middle"></span>${s[0]}</span>`).join('')}
    </div>
  </div>
  <div class="tbl-wrap">
    <div class="tbl-title">Lap-by-lap data</div>
    <div style="overflow-x:auto;max-height:280px;overflow-y:auto">
    <table>
      <thead><tr><th>Lap</th><th>Time</th><th>FL°C</th><th>FR°C</th><th>RL°C</th><th>RR°C</th><th>FL PSI</th><th>RL PSI</th><th>FL grip</th><th>RL grip</th><th>FL deg</th><th>RL deg</th><th>Fuel L</th><th>Mass kg</th></tr></thead>
      <tbody>${data.map(d => `<tr><td>L${d.lap}${d.isWU ? '<span class="badge wu">WU</span>' : d.isSC ? '<span class="badge sc">SC</span>' : ''}</td><td>${formatLapTime(d.lapTime)}</td><td>${d.FL_temp.toFixed(1)}</td><td>${d.FR_temp.toFixed(1)}</td><td>${d.RL_temp.toFixed(1)}</td><td>${d.RR_temp.toFixed(1)}</td><td>${d.FL_pressure.toFixed(2)}</td><td>${d.RL_pressure.toFixed(2)}</td><td>${(d.FL_grip * 100).toFixed(1)}%</td><td>${(d.RL_grip * 100).toFixed(1)}%</td><td>${(d.FL_deg * 100).toFixed(2)}%</td><td>${(d.RL_deg * 100).toFixed(2)}%</td><td>${d.fuel.toFixed(1)}</td><td>${Math.round(d.totalMass)}</td></tr>`).join('')}</tbody>
    </table></div>
  </div>`;

  buildCharts(data, formatLapTime);
  drawHeat(data, 'RL', document.querySelector('.csb.active'));
}

function buildCharts(data, formatLapTime) {
  const laps = data.map(d => d.lap);
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    elements: { point: { radius: 1.5 } },
    animation: { duration: 300 }
  };
  const scls = {
    y: { grid: { color: '#2a2a2a' }, ticks: { color: '#6a9955', font: { size: 9 } }, border: { color: '#3c3c3c' } },
    x: { grid: { color: '#2a2a2a' }, ticks: { color: '#6a9955', font: { size: 9 } }, border: { color: '#3c3c3c' } }
  };

  function mk(id, datasets, extra) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id), {
      type: 'line',
      data: { labels: laps, datasets },
      options: { ...base, ...extra, scales: { ...scls, ...(extra?.scales || {}) } }
    });
  }

  mk('cT', CORNERS.map(c => ({ label: c, data: data.map(d => d[`${c}_temp`]), borderColor: CC[c], borderWidth: 1.5, fill: false, tension: .35, pointRadius: 1.2 })), {});
  mk('cP', CORNERS.map(c => ({ label: c, data: data.map(d => d[`${c}_pressure`]), borderColor: CC[c], borderWidth: 1.5, fill: false, tension: .35, pointRadius: 1.2 })), { scales: { ...scls, y: { ...scls.y, min: 18, max: 34 } } });
  mk('cG', CORNERS.map(c => ({ label: c, data: data.map(d => d[`${c}_grip`]), borderColor: CC[c], borderWidth: 1.5, fill: false, tension: .35, pointRadius: 1.2 })), { scales: { ...scls, y: { ...scls.y, min: 0.4, max: 1.05 } } });
  mk('cD', CORNERS.map(c => ({ label: c, data: data.map(d => d[`${c}_deg`]), borderColor: CC[c], backgroundColor: CC[c] + '18', borderWidth: 1.5, fill: true, tension: .35, pointRadius: 1.2 })), {});

  const roll = data.map((d, i) => {
    const sl = data.slice(Math.max(0, i - 2), i + 1);
    return +(sl.reduce((s, x) => s + x.lapTime, 0) / sl.length).toFixed(3);
  });
  mk('cL', [
    { label: 'Lap', data: data.map(d => d.lapTime), borderColor: '#007acc', borderWidth: 1.5, fill: false, tension: .2, pointRadius: 1.5 },
    { label: '3avg', data: roll, borderColor: '#ff3c5f', borderWidth: 2, fill: false, tension: .4, pointRadius: 0, borderDash: [4, 3] }
  ], { scales: { ...scls, y: { ...scls.y, ticks: { ...scls.y.ticks, callback: v => { const m = Math.floor(v / 60), s = v - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(0)}`; } } } } });

  if (charts.cF) charts.cF.destroy();
  charts.cF = new Chart(document.getElementById('cF'), {
    type: 'line',
    data: {
      labels: laps, datasets: [
        { label: 'Fuel', data: data.map(d => d.fuel), borderColor: '#f5a623', borderWidth: 1.5, fill: false, tension: .35, pointRadius: 1.2, yAxisID: 'y' },
        { label: 'Mass', data: data.map(d => d.totalMass), borderColor: '#4a90d9', borderWidth: 1.5, fill: false, tension: .35, pointRadius: 1.2, borderDash: [5, 3], yAxisID: 'y2' }
      ]
    },
    options: {
      ...base, scales: {
        y: { ...scls.y, ticks: { ...scls.y.ticks, color: '#f5a623' }, position: 'left' },
        y2: { grid: { display: false }, ticks: { color: '#4a90d9', font: { size: 9 } }, border: { color: '#3c3c3c' }, position: 'right' },
        x: scls.x
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Paul Ricard accurate circuit path
// Coordinates are normalised 0-1 matching the real circuit shape:
// Long horizontal rectangle. Pit straight runs left→right along the bottom.
// Mistral straight runs right→left along the top.
// Counterclockwise direction (as driven).
// ---------------------------------------------------------------------------

// Each segment: [name, path_points[], corner_index_FL_FR_RL_RR]
// Path points are [x, y] normalised 0-1, y=0 bottom, y=1 top
const TRACK_SEGMENTS = [
  // 0: Pit straight — long horizontal bottom left to right
  { name: 'Pit straight', pts: [[0.08,0.08],[0.35,0.08],[0.55,0.08]], type: 'straight' },
  // 1: Esses de la Verrerie — fast left-right at end of straight (bottom right)
  { name: 'Verrerie esses', pts: [[0.55,0.08],[0.62,0.10],[0.67,0.14],[0.65,0.20],[0.60,0.24]], type: 'corner' },
  // 2: La Chicane / Hotel — slow right-left chicane
  { name: 'La Chicane', pts: [[0.60,0.24],[0.63,0.28],[0.68,0.30],[0.72,0.28],[0.74,0.24]], type: 'corner' },
  // 3: Comp & Sainte-Baume — two technical righthanders
  { name: 'Ste-Baume', pts: [[0.74,0.24],[0.78,0.22],[0.82,0.25],[0.84,0.31],[0.82,0.37]], type: 'corner' },
  // 4: L'Ecole — gentle left onto Mistral
  { name: "L'Ecole", pts: [[0.82,0.37],[0.80,0.42],[0.76,0.46],[0.70,0.48]], type: 'corner' },
  // 5: Mistral straight — long top horizontal right to left
  { name: 'Mistral straight', pts: [[0.70,0.48],[0.50,0.50],[0.30,0.50],[0.14,0.49]], type: 'straight' },
  // 6: Mistral chicane — mid-straight chicane (1C configuration)
  { name: 'Mistral chicane', pts: [[0.50,0.50],[0.50,0.54],[0.46,0.56],[0.42,0.54],[0.42,0.50]], type: 'corner' },
  // 7: Signes — fast sweeping right at end of Mistral
  { name: 'Signes', pts: [[0.14,0.49],[0.10,0.46],[0.08,0.40],[0.10,0.34],[0.15,0.30]], type: 'corner' },
  // 8: Double Droite du Beausset — long sweeping double right
  { name: 'Le Beausset', pts: [[0.15,0.30],[0.20,0.25],[0.27,0.22],[0.32,0.24],[0.34,0.29],[0.32,0.34],[0.27,0.36]], type: 'corner' },
  // 9: S de Bendor — quick left-right S
  { name: 'S de Bendor', pts: [[0.27,0.36],[0.24,0.32],[0.20,0.28],[0.16,0.26]], type: 'corner' },
  // 10: L'Epingle — tight left hairpin
  { name: "L'Epingle", pts: [[0.16,0.26],[0.12,0.22],[0.08,0.18],[0.07,0.14],[0.09,0.10],[0.13,0.08]], type: 'corner' },
];

// Segment load indices matching PAUL_RICARD_SEGMENTS order in track_model.js
// [FL, FR, RL, RR] lateral load 0-1
const SEG_LOADS = [
  [0.15,0.15,0.20,0.20],  // 0 Pit straight
  [0.80,0.65,0.85,0.70],  // 1 Verrerie esses
  [0.75,0.80,0.70,0.75],  // 2 La Chicane
  [0.80,0.65,0.85,0.70],  // 3 Ste-Baume
  [0.65,0.50,0.70,0.55],  // 4 L'Ecole
  [0.10,0.10,0.15,0.15],  // 5 Mistral straight
  [0.75,0.80,0.70,0.75],  // 6 Mistral chicane
  [0.65,0.90,0.60,0.85],  // 7 Signes
  [0.90,0.60,0.95,0.65],  // 8 Le Beausset
  [0.70,0.85,0.65,0.80],  // 9 S de Bendor
  [0.85,0.70,0.90,0.75],  // 10 L'Epingle
];

window.drawHeat = function (data, corner, btn) {
  document.querySelectorAll('.csb').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const ci = ['FL', 'FR', 'RL', 'RR'].indexOf(corner);
  const avgT = data.reduce((s, d) => s + d[`${corner}_temp`], 0) / data.length;
  const tf = Math.min(1, Math.max(0, (avgT - 20) / 100));

  // Compute stress per segment
  const stress = SEG_LOADS.map(s => s[ci] * tf);
  const mn = Math.min(...stress), mx = Math.max(...stress);
  const nm = stress.map(v => (v - mn) / (mx - mn + 0.001));

  const cv = document.getElementById('heatC');
  const cx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  cx.clearRect(0, 0, W, H);

  // Background
  cx.fillStyle = '#1a1a1a';
  cx.fillRect(0, 0, W, H);

  // Draw asphalt base (slightly lighter background for circuit area)
  cx.strokeStyle = '#2a2a2a';
  cx.lineWidth = 18;
  cx.lineJoin = 'round';
  cx.lineCap = 'round';

  function tx(x) { return 30 + x * (W - 60); }
  function ty(y) { return H - 20 - y * (H - 40); }

  function heatColor(n) {
    const stops = [
      [74, 144, 217],
      [100, 190, 100],
      [245, 166, 35],
      [232, 64, 64]
    ];
    const t = n * (stops.length - 1);
    const i = Math.floor(t);
    const f = t - i;
    const a = stops[Math.min(i, stops.length - 2)];
    const b = stops[Math.min(i + 1, stops.length - 1)];
    return `rgb(${Math.round(a[0]+(b[0]-a[0])*f)},${Math.round(a[1]+(b[1]-a[1])*f)},${Math.round(a[2]+(b[2]-a[2])*f)})`;
  }

  // First pass: draw thick dark base track outline
  cx.beginPath();
  let first = true;
  for (const seg of TRACK_SEGMENTS) {
    for (const pt of seg.pts) {
      if (first) { cx.moveTo(tx(pt[0]), ty(pt[1])); first = false; }
      else cx.lineTo(tx(pt[0]), ty(pt[1]));
    }
  }
  cx.strokeStyle = '#2d2d2d';
  cx.lineWidth = 22;
  cx.stroke();

  // Second pass: draw white track surface
  cx.beginPath();
  first = true;
  for (const seg of TRACK_SEGMENTS) {
    for (const pt of seg.pts) {
      if (first) { cx.moveTo(tx(pt[0]), ty(pt[1])); first = false; }
      else cx.lineTo(tx(pt[0]), ty(pt[1]));
    }
  }
  cx.strokeStyle = '#383838';
  cx.lineWidth = 16;
  cx.stroke();

  // Third pass: draw heat colour per segment
  TRACK_SEGMENTS.forEach((seg, i) => {
    if (seg.pts.length < 2) return;
    cx.beginPath();
    cx.moveTo(tx(seg.pts[0][0]), ty(seg.pts[0][1]));
    for (let p = 1; p < seg.pts.length; p++) {
      cx.lineTo(tx(seg.pts[p][0]), ty(seg.pts[p][1]));
    }
    cx.strokeStyle = heatColor(nm[i]);
    cx.lineWidth = 8;
    cx.lineCap = 'round';
    cx.lineJoin = 'round';
    cx.stroke();

    // Update legend dot colour
    const dot = document.getElementById(`segDot${i}`);
    if (dot) dot.style.background = heatColor(nm[i]);
  });

  // Corner labels
  const labels = [
    { text: 'S/F', x: 0.30, y: 0.04 },
    { text: 'Verrerie', x: 0.63, y: 0.27 },
    { text: 'Chicane', x: 0.72, y: 0.20 },
    { text: 'Ste-Baume', x: 0.82, y: 0.40 },
    { text: 'Mistral ▶', x: 0.50, y: 0.56 },
    { text: 'Signes', x: 0.06, y: 0.43 },
    { text: 'Beausset', x: 0.30, y: 0.20 },
    { text: "Epingle", x: 0.06, y: 0.06 },
  ];
  cx.font = '10px Consolas, monospace';
  cx.textAlign = 'center';
  labels.forEach(l => {
    cx.fillStyle = '#555555';
    cx.fillText(l.text, tx(l.x), ty(l.y));
  });

  // Start/finish line
  const sfx = tx(0.08);
  const sfy = ty(0.08);
  cx.beginPath();
  cx.moveTo(sfx, sfy - 12);
  cx.lineTo(sfx, sfy + 12);
  cx.strokeStyle = '#ffffff44';
  cx.lineWidth = 2;
  cx.setLineDash([3, 3]);
  cx.stroke();
  cx.setLineDash([]);

  // Colour bar legend
  const barX = W - 22, barY = 20, barH = H - 45;
  const grad = cx.createLinearGradient(barX, barY, barX, barY + barH);
  grad.addColorStop(0, 'rgb(232,64,64)');
  grad.addColorStop(0.5, 'rgb(245,166,35)');
  grad.addColorStop(1, 'rgb(74,144,217)');
  cx.fillStyle = grad;
  cx.fillRect(barX, barY, 8, barH);
  cx.fillStyle = '#9d9d9d';
  cx.font = '9px Consolas';
  cx.textAlign = 'left';
  cx.fillText('Hi', barX - 1, barY + 9);
  cx.fillText('Lo', barX - 1, barY + barH);

  // Info label
  cx.fillStyle = '#569cd6';
  cx.font = '10px Consolas';
  cx.textAlign = 'center';
  cx.fillText(`${corner} tyre  —  avg ${avgT.toFixed(1)} °C  —  Circuit Paul Ricard (GT4 layout)`, W / 2, H - 4);
};
