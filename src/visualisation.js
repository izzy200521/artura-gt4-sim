import { PAUL_RICARD_SEGMENTS } from './track_model.js';

const CC = { FL: '#e84040', FR: '#f5a623', RL: '#4a90d9', RR: '#7ed321' };
const CORNERS = ['FL', 'FR', 'RL', 'RR'];
const charts = {};
let _lastData = [];
let _lastFormatLapTime = null;

function fmtLap(s) {
  if (_lastFormatLapTime) return _lastFormatLapTime(s);
  const m = Math.floor(s / 60), sec = s - m * 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(3)}`;
}

// Open a chart in a new full screen detail page
function openDetail(chartId) {
  const data = _lastData;
  if (!data || data.length === 0) return;

  const laps = data.map(d => d.lap);
  let datasets, title, options, statsData;

  if (chartId === 'cT') {
    title = 'Tyre temperatures (°C)';
    datasets = CORNERS.map(c => ({
      label: c,
      data: data.map(d => d[`${c}_temp`]),
      borderColor: CC[c], borderWidth: 2, fill: false, tension: .35,
    }));
    const allTemps = CORNERS.flatMap(c => data.map(d => d[`${c}_temp`]));
    statsData = [
      { label: 'Peak temp', value: Math.max(...allTemps).toFixed(1), unit: '°C' },
      { label: 'Min temp', value: Math.min(...allTemps).toFixed(1), unit: '°C' },
      { label: 'RL peak', value: Math.max(...data.map(d => d.RL_temp)).toFixed(1), unit: '°C' },
      { label: 'FL peak', value: Math.max(...data.map(d => d.FL_temp)).toFixed(1), unit: '°C' },
    ];
    options = { yMin: 20, yMax: 130 };
  }

  else if (chartId === 'cP') {
    title = 'Tyre pressures (PSI)';
    datasets = CORNERS.map(c => ({
      label: c,
      data: data.map(d => d[`${c}_pressure`]),
      borderColor: CC[c], borderWidth: 2, fill: false, tension: .35,
    }));
    const allPres = CORNERS.flatMap(c => data.map(d => d[`${c}_pressure`]));
    statsData = [
      { label: 'Peak PSI', value: Math.max(...allPres).toFixed(2), unit: 'PSI' },
      { label: 'Min PSI', value: Math.min(...allPres).toFixed(2), unit: 'PSI' },
      { label: 'RL final', value: data[data.length-1].RL_pressure.toFixed(2), unit: 'PSI' },
      { label: 'FL final', value: data[data.length-1].FL_pressure.toFixed(2), unit: 'PSI' },
    ];
    options = { yMin: 18, yMax: 34 };
  }

  else if (chartId === 'cG') {
    title = 'Grip level';
    datasets = CORNERS.map(c => ({
      label: c,
      data: data.map(d => d[`${c}_grip`]),
      borderColor: CC[c], borderWidth: 2, fill: false, tension: .35,
    }));
    statsData = [
      { label: 'RL final grip', value: (data[data.length-1].RL_grip * 100).toFixed(1), unit: '%' },
      { label: 'FL final grip', value: (data[data.length-1].FL_grip * 100).toFixed(1), unit: '%' },
      { label: 'RR final grip', value: (data[data.length-1].RR_grip * 100).toFixed(1), unit: '%' },
      { label: 'FR final grip', value: (data[data.length-1].FR_grip * 100).toFixed(1), unit: '%' },
    ];
    options = { yMin: 0.4, yMax: 1.05 };
  }

  else if (chartId === 'cD') {
    title = 'Tyre degradation';
    datasets = CORNERS.map(c => ({
      label: c,
      data: data.map(d => d[`${c}_deg`]),
      borderColor: CC[c], backgroundColor: CC[c] + '18',
      borderWidth: 2, fill: true, tension: .35,
    }));
    statsData = [
      { label: 'RL total deg', value: (data[data.length-1].RL_deg * 100).toFixed(2), unit: '%' },
      { label: 'FL total deg', value: (data[data.length-1].FL_deg * 100).toFixed(2), unit: '%' },
      { label: 'RR total deg', value: (data[data.length-1].RR_deg * 100).toFixed(2), unit: '%' },
      { label: 'FR total deg', value: (data[data.length-1].FR_deg * 100).toFixed(2), unit: '%' },
    ];
    options = { yMin: 0 };
  }

  else if (chartId === 'cL') {
    title = 'Lap times';
    const roll = data.map((d, i) => {
      const sl = data.slice(Math.max(0, i - 2), i + 1);
      return +(sl.reduce((s, x) => s + x.lapTime, 0) / sl.length).toFixed(3);
    });
    datasets = [
      { label: 'Lap time', data: data.map(d => d.lapTime), borderColor: '#007acc', borderWidth: 2, fill: false, tension: .2 },
      { label: '3-lap avg', data: roll, borderColor: '#ff3c5f', borderWidth: 2, fill: false, tension: .4, borderDash: [4, 3] },
    ];
    const raceLaps = data.filter(d => !d.isWU);
    const best = Math.min(...raceLaps.map(d => d.lapTime));
    const avg = raceLaps.reduce((s, d) => s + d.lapTime, 0) / raceLaps.length;
    const worst = Math.max(...raceLaps.map(d => d.lapTime));
    statsData = [
      { label: 'Best lap', value: fmtLap(best), unit: '' },
      { label: 'Average lap', value: fmtLap(avg), unit: '' },
      { label: 'Worst lap', value: fmtLap(worst), unit: '' },
      { label: 'Delta best/worst', value: (worst - best).toFixed(3), unit: 's' },
    ];
    options = {
      yTickCallback: `
        const m = Math.floor(value / 60), s = value - m * 60;
        return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
      `
    };
  }

  else if (chartId === 'cF') {
    title = 'Fuel & mass';
    datasets = [
      { label: 'Fuel (L)', data: data.map(d => d.fuel), borderColor: '#f5a623', borderWidth: 2, fill: false, tension: .35, yAxisID: 'y' },
      { label: 'Mass (kg)', data: data.map(d => d.totalMass), borderColor: '#4a90d9', borderWidth: 2, fill: false, tension: .35, borderDash: [5, 3], yAxisID: 'y2' },
    ];
    const fuelUsed = data[0].fuel - data[data.length-1].fuel;
    statsData = [
      { label: 'Fuel used', value: fuelUsed.toFixed(1), unit: 'L' },
      { label: 'Fuel remaining', value: data[data.length-1].fuel.toFixed(1), unit: 'L' },
      { label: 'Final mass', value: Math.round(data[data.length-1].totalMass), unit: 'kg' },
      { label: 'Avg per lap', value: (fuelUsed / data.length).toFixed(2), unit: 'L/lap' },
    ];
    options = { y2: true, y2Color: '#4a90d9' };
  }

  sessionStorage.setItem('chartDetail', JSON.stringify({ title, datasets, labels: laps, options, statsData }));
  window.open('chart-detail.html', '_blank');
}

export function renderDashboard(data, formatLapTime) {
  _lastData = data;
  _lastFormatLapTime = formatLapTime;

  const rc = data.filter(d => !d.isWU);
  const best = rc.reduce((b, d) => d.lapTime < b.lapTime ? d : b, rc[0]);
  const avg = rc.reduce((s, d) => s + d.lapTime, 0) / rc.length;
  const last = data[data.length - 1];
  const mg = CORNERS.reduce((s, c) => s + last[`${c}_grip`], 0) / 4;

  function chartPanel(id, dotColor, titleText, legendHtml, extraStyle) {
    return `
    <div class="cp" onclick="window._openDetail('${id}')" style="cursor:pointer;${extraStyle || ''}">
      <div class="ct">
        <span class="dot" style="background:${dotColor}"></span>${titleText}
        <span style="margin-left:auto;font-size:9px;color:#3c3c3c">tap to expand</span>
      </div>
      <div class="leg-row">${legendHtml}</div>
      <div style="position:relative;height:150px">
        <canvas id="${id}" role="img" aria-label="${titleText}"></canvas>
      </div>
    </div>`;
  }

  const cornerLegend = CORNERS.map(c =>
    `<span class="leg"><span class="leg-sq" style="background:${CC[c]}"></span>${c}</span>`
  ).join('');

  document.getElementById('content').innerHTML = `
  <div class="metrics-row">
    <div class="mc"><div class="ml">Best lap</div><div class="mv" style="font-size:15px">${formatLapTime(best.lapTime)}</div><div class="ms">Lap ${best.lap}</div></div>
    <div class="mc"><div class="ml">Average lap</div><div class="mv" style="font-size:15px">${formatLapTime(avg)}</div><div class="ms">Race laps only</div></div>
    <div class="mc"><div class="ml">Fuel remaining</div><div class="mv">${last.fuel.toFixed(1)}<span class="mu">L</span></div><div class="ms">${(last.fuel / data[0].fuel * 100).toFixed(1)}% left</div></div>
    <div class="mc"><div class="ml">Final mass</div><div class="mv">${Math.round(last.totalMass)}<span class="mu">kg</span></div><div class="ms">F ${last.frontLoad.toFixed(0)} / R ${last.rearLoad.toFixed(0)}</div></div>
    <div class="mc"><div class="ml">Mean grip</div><div class="mv">${(mg * 100).toFixed(1)}<span class="mu">%</span></div><div class="ms">End of stint</div></div>
  </div>
  <div class="cg">
    ${chartPanel('cT', '#ce9178', 'Tyre temperatures (°C)', cornerLegend)}
    ${chartPanel('cP', '#9cdcfe', 'Tyre pressures (PSI)', cornerLegend)}
    ${chartPanel('cG', '#7ed321', 'Grip level', cornerLegend)}
    ${chartPanel('cD', '#e84040', 'Tyre degradation', cornerLegend)}
    ${chartPanel('cL', '#007acc', 'Lap times',
      `<span class="leg"><span class="leg-sq" style="background:#007acc"></span>Lap time</span>
       <span class="leg"><span class="leg-sq" style="background:#ff3c5f"></span>3-lap avg</span>`
    )}
    ${chartPanel('cF', '#f5a623', 'Fuel & mass',
      `<span class="leg"><span class="leg-sq" style="background:#f5a623"></span>Fuel (L)</span>
       <span class="leg"><span class="leg-sq" style="background:#4a90d9"></span>Mass (kg)</span>`
    )}
  </div>
  <div class="heat-panel">
    <div class="ct" style="margin-bottom:7px"><span class="dot" style="background:#f5a623"></span>Circuit Paul Ricard — tyre stress heat map</div>
    <div style="display:flex;gap:5px;margin-bottom:8px;align-items:center;">
      ${CORNERS.map((c, i) => `<button class="csb${i === 2 ? ' active' : ''}" onclick="drawHeat(window._simData,'${c}',this)">${c}</button>`).join('')}
      <span style="font-size:10px;color:#4a4a4a;margin-left:8px">blue = low stress &nbsp;|&nbsp; red = high stress</span>
    </div>
    <div style="position:relative;background:#1a1a1a;border-radius:3px;overflow:hidden;height:320px">
      <canvas id="heatC" width="960" height="320" style="width:100%;height:100%"></canvas>
    </div>
    <div style="margin-top:8px;font-size:10px;color:#3c3c3c">
      For telemetry overlay open <a href="telemetry.html" style="color:#569cd6">telemetry.html</a>
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

  window._openDetail = openDetail;
  buildCharts(data, formatLapTime);
  drawHeat(data, 'RL', document.querySelector('.csb.active'));
}

function buildCharts(data, formatLapTime) {
  const laps = data.map(d => d.lap);
  const base = {
    responsive: true, maintainAspectRatio: false,
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
  const roll = data.map((d, i) => { const sl = data.slice(Math.max(0, i - 2), i + 1); return +(sl.reduce((s, x) => s + x.lapTime, 0) / sl.length).toFixed(3); });
  mk('cL', [
    { label: 'Lap time', data: data.map(d => d.lapTime), borderColor: '#007acc', borderWidth: 1.5, fill: false, tension: .2, pointRadius: 1.5 },
    { label: '3-lap avg', data: roll, borderColor: '#ff3c5f', borderWidth: 2, fill: false, tension: .4, pointRadius: 0, borderDash: [4, 3] }
  ], { scales: { ...scls, y: { ...scls.y, ticks: { ...scls.y.ticks, callback: v => { const m = Math.floor(v / 60), s = v - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(0)}`; } } } } });
  if (charts.cF) charts.cF.destroy();
  charts.cF = new Chart(document.getElementById('cF'), {
    type: 'line',
    data: { labels: laps, datasets: [
      { label: 'Fuel (L)', data: data.map(d => d.fuel), borderColor: '#f5a623', borderWidth: 1.5, fill: false, tension: .35, pointRadius: 1.2, yAxisID: 'y' },
      { label: 'Mass (kg)', data: data.map(d => d.totalMass), borderColor: '#4a90d9', borderWidth: 1.5, fill: false, tension: .35, pointRadius: 1.2, borderDash: [5, 3], yAxisID: 'y2' }
    ]},
    options: { ...base, scales: {
      y: { ...scls.y, ticks: { ...scls.y.ticks, color: '#f5a623' }, position: 'left' },
      y2: { grid: { display: false }, ticks: { color: '#4a90d9', font: { size: 9 } }, border: { color: '#3c3c3c' }, position: 'right' },
      x: scls.x
    }}
  });
}

export const TRACK_PATH = [
  { name: 'S/F straight',    si: 0,  pts: [[0.62,0.45],[0.52,0.45],[0.40,0.45],[0.30,0.45]] },
  { name: 'Verrerie',        si: 1,  pts: [[0.30,0.45],[0.26,0.42],[0.22,0.38],[0.20,0.33],[0.22,0.28],[0.26,0.25]] },
  { name: 'Chicane',         si: 2,  pts: [[0.26,0.25],[0.23,0.22],[0.20,0.20],[0.17,0.22],[0.15,0.26]] },
  { name: 'Ste-Baume',       si: 3,  pts: [[0.15,0.26],[0.12,0.30],[0.10,0.36],[0.11,0.43],[0.14,0.48]] },
  { name: "L'Ecole",         si: 4,  pts: [[0.14,0.48],[0.14,0.54],[0.16,0.58],[0.20,0.60]] },
  { name: 'Mistral',         si: 5,  pts: [[0.20,0.60],[0.35,0.62],[0.50,0.63],[0.65,0.63],[0.78,0.62]] },
  { name: 'Mistral chicane', si: 6,  pts: [[0.50,0.63],[0.51,0.67],[0.54,0.69],[0.57,0.67],[0.57,0.63]] },
  { name: 'Signes',          si: 7,  pts: [[0.78,0.62],[0.84,0.60],[0.88,0.55],[0.88,0.50],[0.86,0.45]] },
  { name: 'Teardrop T11',    si: 8,  pts: [[0.86,0.45],[0.88,0.40],[0.90,0.34],[0.92,0.28],[0.90,0.22],[0.86,0.18]] },
  { name: 'Teardrop T12',    si: 8,  pts: [[0.86,0.18],[0.82,0.16],[0.78,0.18],[0.76,0.24],[0.78,0.30],[0.82,0.34],[0.84,0.40]] },
  { name: 'Le Village',      si: 9,  pts: [[0.84,0.40],[0.80,0.42],[0.74,0.42],[0.68,0.40]] },
  { name: 'Virage Tour',     si: 10, pts: [[0.68,0.40],[0.64,0.38],[0.60,0.35],[0.58,0.30],[0.60,0.26]] },
  { name: 'Virage du Pont',  si: 11, pts: [[0.60,0.26],[0.63,0.30],[0.66,0.35],[0.66,0.40],[0.64,0.45],[0.62,0.45]] },
];

const SEG_LOADS = [
  [0.10,0.10,0.15,0.15],[0.80,0.65,0.85,0.70],[0.75,0.80,0.70,0.75],
  [0.80,0.65,0.85,0.70],[0.65,0.50,0.70,0.55],[0.10,0.10,0.15,0.15],
  [0.75,0.80,0.70,0.75],[0.65,0.90,0.60,0.85],[0.90,0.60,0.95,0.65],
  [0.55,0.80,0.50,0.75],[0.80,0.50,0.85,0.55],[0.65,0.80,0.60,0.75],
];

const CORNER_LABELS = [
  [0.44,0.41,'T1-T2'],[0.24,0.22,'T3'],[0.10,0.38,'T4-T6'],
  [0.17,0.64,'T7'],[0.53,0.71,'T8-T9'],[0.88,0.64,'T10 Signes'],
  [0.93,0.33,'T11'],[0.76,0.13,'T12'],[0.76,0.44,'T13'],
  [0.60,0.30,'T14-T15'],[0.44,0.53,'Mistral →'],
];

export function heatColor(n) {
  const stops = [[74,144,217],[100,190,100],[245,166,35],[232,64,64]];
  const t = n*(stops.length-1), i=Math.floor(t), f=t-i;
  const a=stops[Math.min(i,stops.length-2)], b=stops[Math.min(i+1,stops.length-1)];
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*f)},${Math.round(a[1]+(b[1]-a[1])*f)},${Math.round(a[2]+(b[2]-a[2])*f)})`;
}

export function drawTrackBase(cx, W, H, tx, ty) {
  function strokeAll(color, width, dash) {
    cx.beginPath(); let first = true;
    for (const seg of TRACK_PATH) {
      for (const pt of seg.pts) {
        if (first) { cx.moveTo(tx(pt[0]), ty(pt[1])); first = false; }
        else cx.lineTo(tx(pt[0]), ty(pt[1]));
      }
    }
    cx.strokeStyle = color; cx.lineWidth = width;
    cx.lineJoin = 'round'; cx.lineCap = 'round';
    if (dash) cx.setLineDash(dash); else cx.setLineDash([]);
    cx.stroke(); cx.setLineDash([]);
  }
  strokeAll('#111', 26); strokeAll('#3a3a3a', 18); strokeAll('#555', 20, [2,16]);
}

export function drawCornerLabels(cx, tx, ty) {
  cx.font = '9px Consolas, monospace'; cx.textAlign = 'center';
  CORNER_LABELS.forEach(([x, y, text]) => { cx.fillStyle = '#666'; cx.fillText(text, tx(x), ty(y)); });
}

export function drawSFLine(cx, tx, ty) {
  const sfx = tx(0.62), sfy = ty(0.45);
  cx.save(); cx.translate(sfx, sfy); cx.rotate(-Math.PI/2);
  cx.beginPath(); cx.moveTo(-12,0); cx.lineTo(12,0);
  cx.strokeStyle = '#ffffff88'; cx.lineWidth = 3;
  cx.setLineDash([3,3]); cx.stroke(); cx.setLineDash([]);
  cx.restore();
  cx.fillStyle = '#ffffff66'; cx.font = '9px Consolas'; cx.textAlign = 'left';
  cx.fillText('S/F', tx(0.63), ty(0.43));
}

export function drawColorBar(cx, W, H, PAD, minLabel, maxLabel) {
  const barX=W-18, barY=PAD, barH=H-PAD*2;
  const grad = cx.createLinearGradient(barX, barY, barX, barY+barH);
  grad.addColorStop(0, 'rgb(232,64,64)');
  grad.addColorStop(0.5, 'rgb(245,166,35)');
  grad.addColorStop(1, 'rgb(74,144,217)');
  cx.fillStyle = grad; cx.fillRect(barX, barY, 8, barH);
  cx.fillStyle = '#9d9d9d'; cx.font = '9px Consolas'; cx.textAlign = 'left';
  cx.fillText(maxLabel, barX-2, barY+9); cx.fillText(minLabel, barX-2, barY+barH);
}

window.drawHeat = function (data, corner, btn) {
  document.querySelectorAll('.csb').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const ci = ['FL','FR','RL','RR'].indexOf(corner);
  const avgT = data.reduce((s,d) => s+d[`${corner}_temp`],0) / data.length;
  const tf = Math.min(1, Math.max(0, (avgT-20)/100));
  const stress = SEG_LOADS.map(s => s[ci]*tf);
  const mn = Math.min(...stress), mx = Math.max(...stress);
  const nm = stress.map(v => (v-mn)/(mx-mn+0.001));
  const cv = document.getElementById('heatC');
  const cx = cv.getContext('2d');
  const W=cv.width, H=cv.height, PAD=40;
  cx.clearRect(0,0,W,H); cx.fillStyle='#1a1a1a'; cx.fillRect(0,0,W,H);
  const tx = x => PAD+x*(W-PAD*2);
  const ty = y => H-PAD-y*(H-PAD*2);
  drawTrackBase(cx,W,H,tx,ty);
  TRACK_PATH.forEach((seg,i) => {
    if (seg.pts.length < 2) return;
    cx.beginPath(); cx.moveTo(tx(seg.pts[0][0]), ty(seg.pts[0][1]));
    for (let p=1; p<seg.pts.length; p++) cx.lineTo(tx(seg.pts[p][0]), ty(seg.pts[p][1]));
    cx.strokeStyle = heatColor(nm[seg.si]);
    cx.lineWidth=8; cx.lineCap='round'; cx.lineJoin='round'; cx.stroke();
  });
  drawCornerLabels(cx,tx,ty);
  drawSFLine(cx,tx,ty);
  drawColorBar(cx,W,H,PAD,'0%','100%');
  cx.fillStyle='#569cd6'; cx.font='10px Consolas'; cx.textAlign='center';
  cx.fillText(`${corner} tyre  —  avg ${avgT.toFixed(1)} °C  —  Circuit Paul Ricard`, W/2, H-6);
};
