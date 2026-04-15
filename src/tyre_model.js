export const CORNERS = ['FL', 'FR', 'RL', 'RR'];

export const LOAD_COEFF = { FL: 0.90, FR: 1.05, RL: 1.10, RR: 0.95 };

export const TEMP_CRITICAL_OFFSET = 15;

export function tempGripFactor(temp, tempLow, tempHigh) {
  if (temp >= tempLow && temp <= tempHigh) return 1.0;
  if (temp < tempLow) {
    return 0.65 + 0.35 * Math.max(0, (temp - 30) / (tempLow - 30));
  }
  const critTemp = tempHigh + TEMP_CRITICAL_OFFSET;
  const excess = (temp - tempHigh) / (critTemp - tempHigh);
  return Math.max(0.50, 1 - 0.50 * Math.pow(excess, 1.5));
}

export function createTyreState(coldPsi) {
  const state = {};
  for (const c of CORNERS) {
    state[c] = { temp: 28, pressure: coldPsi, grip: 1.0, degradation: 0.0 };
  }
  return state;
}

export function updateTyres(state, params) {
  const {
    trackTemp, airTemp, fuelMass, style,
    isWarmup, coldPsi, tempLow, tempHigh, degRate
  } = params;

  const result = {};

  for (const c of CORNERS) {
    const s = { ...state[c] };
    const lc = LOAD_COEFF[c];
    const ff = 1 + Math.max(0, fuelMass - 51.45) * 0.0008;
    const heat = isWarmup ? 6 * 0.4 * lc * style * ff : 6 * lc * style * ff;
    const amb = (trackTemp + airTemp) / 2;
    const cool = 0.18 * Math.max(0, s.temp - amb);
    const noise = (Math.random() - 0.5) * 2;

    s.temp = Math.max(amb, s.temp + heat - cool + noise);
    s.pressure = Math.max(coldPsi, coldPsi + 0.050 * (s.temp - 15));

    const inWindow = s.temp >= tempLow && s.temp <= tempHigh;
    const overTemp = s.temp > tempHigh + TEMP_CRITICAL_OFFSET;
    let dg = inWindow
      ? degRate * 0.67
      : overTemp
        ? degRate + 0.0035 * ((s.temp - (tempHigh + TEMP_CRITICAL_OFFSET)) / 10)
        : degRate * (1 + Math.max(0.5, 1 - s.temp / tempLow));

    dg *= style;
    s.degradation = Math.min(1, s.degradation + dg);
    s.grip = Math.max(0, (1 - s.degradation) * tempGripFactor(s.temp, tempLow, tempHigh));

    result[c] = s;
  }
  return result;
}
