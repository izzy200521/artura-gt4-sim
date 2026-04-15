export const PAUL_RICARD_SEGMENTS = [
  ['T1 La Sainte-Baume',   0.85, 0.70, 0.90, 0.75, 0.06],
  ['Mistral Straight',     0.10, 0.10, 0.15, 0.15, 0.22],
  ['Signes',               0.65, 0.90, 0.60, 0.85, 0.05],
  ['T3-T4 Virage du Pont', 0.80, 0.65, 0.85, 0.70, 0.08],
  ['Back Infield Chicane', 0.75, 0.80, 0.70, 0.75, 0.09],
  ['T9 Beausset',          0.90, 0.60, 0.95, 0.65, 0.07],
  ['T10-T11 Complex',      0.70, 0.85, 0.65, 0.80, 0.10],
  ['Pit Straight',         0.15, 0.15, 0.20, 0.20, 0.14],
  ['T15 Final Hairpin',    0.80, 0.75, 0.85, 0.80, 0.09],
  ['Exit Complex',         0.55, 0.70, 0.50, 0.65, 0.10],
];

export function createTrackState(trackTempInit, airTempInit) {
  return {
    trackTemp: trackTempInit,
    airTemp: airTempInit,
    gripEvolution: 1.0,
    weather: 'dry',
  };
}

export function evolveTrack(state, lap, totalLaps, weatherEventLap) {
  const s = { ...state };
  if (weatherEventLap > 0 && lap === weatherEventLap) {
    s.weather = 'damp';
    s.gripEvolution *= 0.82;
    s.trackTemp -= 5;
  }
  if (lap > totalLaps / 2) {
    s.trackTemp -= 0.15;
    s.airTemp -= 0.08;
  }
  s.gripEvolution = lap <= 10
    ? Math.min(1.0, 1 + 0.003 * lap)
    : Math.min(1.04, s.gripEvolution + 0.0005);
  return s;
}

export function trackGripMultiplier(trackState) {
  const weatherFactor = trackState.weather === 'damp' ? 0.82
    : trackState.weather === 'wet' ? 0.72 : 1.0;
  return trackState.gripEvolution * weatherFactor;
}

export function estimateLapTime(params) {
  const {
    avgGrip, trackGrip, massDelta, style,
    isWarmup, isSafetycar, lapNumber, baseLapTime
  } = params;

  if (isWarmup) return baseLapTime * 1.20;

  let lt = baseLapTime
    + Math.max(0, 1 - avgGrip) * 30
    + (1 - trackGrip) * 8
    + massDelta
    - (style - 1) * 0.8
    - Math.min(0.5, lapNumber * 0.05);

  if (isSafetycar) lt *= 1.35;
  return lt;
}

export function formatLapTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(3)}`;
}
