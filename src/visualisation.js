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
    <div style="display:flex;gap:5px;margin-bottom:8px">${CORNERS.map((c, i) => `<button class="csb${i === 2 ? ' active' : ''}" onclick="drawHeat(window._simData,'${c}',this)">${c}</button>`).join('')}</div>
    <div style="position:relative;background:#1a1a1a;border-radius:3px;overflow:hidden;height:220px"><canvas id="heatC" width="760" height="220" style="width:100%;height:100%"></canvas></div>
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

window.drawHeat = function (data, corner, btn) {
  document.querySelectorAll('.csb').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const ci = ['FL', 'FR', 'RL', 'RR'].indexOf(corner) + 1;
  const avgT = data.reduce((s, d) => s + d[`${corner}_temp`], 0) / data.length;
  const tf = Math.min(1, Math.max(0, (avgT - 20) / 100));
  const st = PAUL_RICARD_SEGMENTS.map(s => s[ci] * tf);
  const mn = Math.min(...st), mx = Math.max(...st);
  const nm = st.map(v => (v - mn) / (mx - mn + 0.001));

  const cv = document.getElementById('heatC');
  const cx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  cx.clearRect(0, 0, W, H);
  cx.fillStyle = '#1a1a1a';
  cx.fillRect(0, 0, W, H);

  function hc(n) {
    const s = [[74, 144, 217], [80, 200, 80], [245, 166, 35], [232, 64, 64]];
    const t = n * (s.length - 1), i = Math.floor(t), f = t - i;
    const a = s[Math.min(i, 2)], b = s[Math.min(i + 1, 3)];
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
  }

  const pts = [
    [[.04, .22], [.13, .80]], [[.13, .80], [.44, .85]], [[.44, .85], [.57, .74]],
    [[.57, .74], [.68, .59]], [[.68, .59], [.80, .45]], [[.80, .45], [.87, .29]],
    [[.87, .29], [.78, .17]], [[.78, .17], [.48, .11]], [[.48, .11], [.23, .19]],
    [[.23, .19], [.04, .22]]
  ];

  pts.forEach(([a, b], i) => {
    const x1 = a[0] * W, y1 = (1 - a[1]) * H, x2 = b[0] * W, y2 = (1 - b[1]) * H;
    cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2);
    cx.strokeStyle = hc(nm[i]);
    cx.lineWidth = 6 + nm[i] * 10;
    cx.lineCap = 'round'; cx.stroke();
    cx.fillStyle = '#88888888';
    cx.font = '9px Consolas,monospace';
    cx.textAlign = 'center';
    cx.fillText(PAUL_RICARD_SEGMENTS[i][0], (x1 + x2) / 2, (y1 + y2) / 2 - 7);
  });

  const grd = cx.createLinearGradient(W - 24, 0, W - 24, H);
  grd.addColorStop(0, 'rgb(232,64,64)');
  grd.addColorStop(.5, 'rgb(245,166,35)');
  grd.addColorStop(1, 'rgb(74,144,217)');
  cx.fillStyle = grd; cx.fillRect(W - 18, 8, 8, H - 16);
  cx.fillStyle = '#9d9d9d'; cx.font = '9px Consolas';
  cx.textAlign = 'left';
  cx.fillText('Hi', W - 16, 13);
  cx.fillText('Lo', W - 14, H - 4);
  cx.fillStyle = '#569cd6'; cx.font = '10px Consolas';
  cx.textAlign = 'center';
  cx.fillText(`${corner} — avg ${avgT.toFixed(1)}°C`, W / 2, H - 5);
};
