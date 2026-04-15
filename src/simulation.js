import { CORNERS, createTyreState, updateTyres } from './tyre_model.js';
import { createFuelState, consumeFuel, massMetrics } from './fuel_model.js';
import { createTrackState, evolveTrack, trackGripMultiplier, estimateLapTime, formatLapTime } from './track_model.js';
import { renderDashboard } from './visualisation.js';

const DEFAULTS = {
  totalLaps: 28, fuelStart: 90, wuLaps: 2,
  trackTemp: 38, airTemp: 24, humidity: 45,
  coldPsi: 19.5, tempLow: 80, tempHigh: 105,
  scLap: 0, scDur: 3, wxLap: 0,
  baseLap: 127.5, fuelRate: 3.5, degRate: 0.0012
};

function gv(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function validate() {
  const el = document.getElementById('validationMsg');
  const tl = gv('totalLaps'), fs = gv('fuelStart');
  const tlo = gv('tempLow'), thi = gv('tempHigh');
  let msg = '';
  if (tl < 5 || tl > 60) msg = 'Laps must be 5–60.';
  else if (fs < 5 || fs > 120) msg = 'Fuel must be 5–120 L.';
  else if (tlo >= thi) msg = 'Temp low must be less than temp high.';
  if (msg) {
    el.textContent = msg;
    el.style.display = 'block';
    return false;
  }
  el.style.display = 'none';
  return true;
}

window.resetInputs = function () {
  Object.entries(DEFAULTS).forEach(([k, v]) => {
    const el = document.getElementById(k);
    if (el) el.value = v;
  });
  document.getElementById('customStyle').value = '';
  document.getElementById('drivingStyle').value = '1.0';
};

window.runSim = function () {
  if (!validate()) return;

  document.getElementById('runBtn').disabled = true;
  document.getElementById('progressWrap').style.display = 'block';

  const totalLaps = Math.round(gv('totalLaps'));
  const fuelStart = gv('fuelStart');
  const wuLaps = Math.round(gv('wuLaps'));
  const trackTempInit = gv('trackTemp');
  const airTempInit = gv('airTemp');
  const coldPsi = gv('coldPsi');
  const tempLow = gv('tempLow');
  const tempHigh = gv('tempHigh');
  const scLap = Math.round(gv('scLap'));
  const scDur = Math.round(gv('scDur'));
  const wxLap = Math.round(gv('wxLap'));
  const baseLapTime = gv('baseLap');
  const fuelRate = gv('fuelRate');
  const degRate = gv('degRate');
  const customStyleVal = document.getElementById('customStyle').value;
  const style = customStyleVal !== '' ? parseFloat(customStyleVal) : gv('drivingStyle');

  let tyres = createTyreState(coldPsi);
  let fuelState = createFuelState(fuelStart);
  let trackState = createTrackState(trackTempInit, airTempInit);

  const data = [];

  for (let lap = 1; lap <= totalLaps; lap++) {
    const isWU = lap <= wuLaps;
    const isSC = scLap > 0 && lap >= scLap && lap < scLap + scDur;

    trackState = evolveTrack(trackState, lap, totalLaps, wxLap);

    const { fuel } = consumeFuel(fuelState, { fuelRate, style, isSafetycar: isSC, isWarmup: isWU });
    fuelState = { fuel };
    const { fuelMass, totalMass, frontLoad, rearLoad, massDelta } = massMetrics(fuel);

    tyres = updateTyres(tyres, {
      trackTemp: trackState.trackTemp,
      airTemp: trackState.airTemp,
      fuelMass, style, isWarmup: isWU,
      coldPsi, tempLow, tempHigh, degRate
    });

    const avgGrip = CORNERS.reduce((sum, c) => sum + tyres[c].grip, 0) / 4;
    const tGrip = trackGripMultiplier(trackState);

    const lapTime = estimateLapTime({
      avgGrip, trackGrip: tGrip, massDelta, style,
      isWarmup: isWU, isSafetycar: isSC,
      lapNumber: lap, baseLapTime
    });

    const row = {
      lap,
      lapTime: +lapTime.toFixed(3),
      isWU, isSC,
      weather: trackState.weather,
      ...Object.fromEntries(CORNERS.flatMap(c => [
        [`${c}_temp`,     +tyres[c].temp.toFixed(1)],
        [`${c}_pressure`, +tyres[c].pressure.toFixed(2)],
        [`${c}_grip`,     +tyres[c].grip.toFixed(4)],
        [`${c}_deg`,      +tyres[c].degradation.toFixed(4)],
      ])),
      fuel: +fuel.toFixed(2),
      totalMass: +totalMass.toFixed(1),
      frontLoad: +frontLoad.toFixed(1),
      rearLoad: +rearLoad.toFixed(1),
      trackTemp: +trackState.trackTemp.toFixed(1),
      gripEvo: +trackState.gripEvolution.toFixed(4),
    };

    data.push(row);

    const pct = Math.round((lap / totalLaps) * 100);
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressLabel').textContent = `Lap ${lap} / ${totalLaps}`;
  }

  window._simData = data;

  setTimeout(() => {
    renderDashboard(data, formatLapTime);
    document.getElementById('runBtn').disabled = false;
    document.getElementById('progressWrap').style.display = 'none';
  }, 40);
};
