export const PAUL_RICARD_SEGMENTS = [
  // [name, FL_load, FR_load, RL_load, RR_load, duration_fraction]
  ['Pit straight',         0.15, 0.15, 0.20, 0.20, 0.12],
  ['Verrerie esses',       0.80, 0.65, 0.85, 0.70, 0.06],
  ['La Chicane',           0.75, 0.80, 0.70, 0.75, 0.05],
  ['Ste-Baume',            0.80, 0.65, 0.85, 0.70, 0.06],
  ["L'Ecole",              0.65, 0.50, 0.70, 0.55, 0.04],
  ['Mistral straight',     0.10, 0.10, 0.15, 0.15, 0.20],
  ['Mistral chicane',      0.75, 0.80, 0.70, 0.75, 0.04],
  ['Signes',               0.65, 0.90, 0.60, 0.85, 0.06],
  ['Le Beausset',          0.90, 0.60, 0.95, 0.65, 0.10],
  ['S de Bendor',          0.70, 0.85, 0.65, 0.80, 0.08],
  ["L'Epingle",            0.85, 0.70, 0.90, 0.75, 0.09],
  ['Virage du Village',    0.50, 0.80, 0.45, 0.75, 0.05],
  ['Virage de Tour',       0.80, 0.50, 0.85, 0.55, 0.05],
];

export function createTrackState(trackTempInit, airTempInit) {
  return {
    trackTemp: trackTempInit,
    airTemp: airTempInit,
    gripEvolution: 0.97,  // starts slightly green, builds over laps
    weather: 'dry',
  };
}

export function evolveTrack(state, lap, totalLaps, weatherEventLap) {
  const s = { ...state };
  if (weatherEventLap > 0 && lap === weatherEventLap) {
    s.weather = 'damp';
    s.gripEvolution *= 0.80;
    s.trackTemp -= 6;
    s.airTemp -= 3;
  }
  // Gradual temperature drop in second half of stint
  if (lap > totalLaps / 2) {
    s.trackTemp -= 0.12;
    s.airTemp   -= 0.07;
  }
  // Rubber build-up: grip improves over first 15 laps then plateaus
  if (lap <= 15) {
    s.gripEvolution = Math.min(1.03, s.gripEvolution + 0.004);
  } else {
    s.gripEvolution = Math.min(1.04, s.gripEvolution + 0.0003);
  }
  return s;
}

export function trackGripMultiplier(trackState) {
  const weatherFactor = trackState.weather === 'damp' ? 0.80
    : trackState.weather === 'wet' ? 0.68 : 1.0;
  return trackState.gripEvolution * weatherFactor;
}

export function estimateLapTime(params) {
  const {
    avgGrip, trackGrip, massDelta, style,
    isWarmup, isSafetycar, lapNumber, baseLapTime
  } = params;

  if (isWarmup) return baseLapTime * 1.18;

  // Grip shortfall — each 1% grip loss costs ~0.28s at Paul Ricard
  const gripPenalty = Math.max(0, 1 - avgGrip) * 28.0;

  // Track condition delta
  const trackPenalty = (1 - trackGrip) * 7.5;

  // Driving style effect — aggressive is faster but nonlinear
  const styleDelta = -(style - 1.0) * 0.9;

  // Driver rhythm builds over first 8 laps
  const rhythmBonus = lapNumber <= 8
    ? -(lapNumber / 8) * 0.6
    : -0.6;

  // Tyre warm-up bonus — first 3 race laps still building heat
  const warmupPenalty = lapNumber <= 3 ? (3 - lapNumber) * 0.4 : 0;

  let lt = baseLapTime
    + gripPenalty
    + trackPenalty
    + massDelta
    + styleDelta
    + rhythmBonus
    + warmupPenalty;

  if (isSafetycar) lt *= 1.38;

  // Small lap-to-lap variation (traffic, minor mistakes)
  lt += (Math.random() - 0.5) * 0.3;

  return Math.max(baseLapTime * 0.98, lt);
}

export function formatLapTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(3)}`;
}
