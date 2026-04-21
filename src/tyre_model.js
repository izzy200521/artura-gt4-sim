export const CORNERS = ['FL', 'FR', 'RL', 'RR'];

// GT4 mid-engine load bias (Artura-style)
export const LOAD_COEFF = {
  FL: 0.92,
  FR: 1.10,
  RL: 1.08,
  RR: 0.90
};

export const TEMP_CRITICAL_OFFSET = 15;

// Thermal inertia (rear slightly more stable)
const THERMAL_INERTIA = {
  FL: 0.85,
  FR: 0.85,
  RL: 0.90,
  RR: 0.90
};

// -----------------------------
// REALISTIC DEGRADATION MODEL
// -----------------------------

function wearCurve(x) {
  // x = degradation progress (0–1)
  // Slow start → stable → accelerating wear at end
  return Math.pow(x, 1.35);
}

export function tempGripFactor(temp, tempLow, tempHigh) {
  if (temp >= tempLow && temp <= tempHigh) return 1.0;

  if (temp < tempLow) {
    const r = Math.max(0, (temp - 25) / (tempLow - 25));
    return 0.62 + 0.38 * Math.pow(r, 1.5);
  }

  const crit = tempHigh + TEMP_CRITICAL_OFFSET;
  const excess = Math.min(1, (temp - tempHigh) / (crit - tempHigh));
  return Math.max(0.50, 1 - 0.50 * Math.pow(excess, 1.4));
}

export function createTyreState(coldPsi) {
  const state = {};

  for (const c of CORNERS) {
    state[c] = {
      temp: 26,
      coreTemp: 24,
      pressure: coldPsi,

      // start slightly "green" (real GT tyres are not max grip instantly)
      grip: 0.70,

      degradation: 0,

      // rubber state phases
      lifePhase: 0 // 0 = new, 1 = optimal, 2 = falling off
    };
  }

  return state;
}

export function updateTyres(state, params) {
  const {
    trackTemp,
    airTemp,
    fuelMass,
    style,
    isWarmup,
    coldPsi,
    tempLow,
    tempHigh,
    degRate
  } = params;

  const result = {};
  const amb = trackTemp * 0.7 + airTemp * 0.3;

  for (const c of CORNERS) {
    const s = { ...state[c] };

    const load = LOAD_COEFF[c];
    const inertia = THERMAL_INERTIA[c];

    // Fuel load effect
    const fuelFactor = 1 + Math.max(0, fuelMass - 50) * 0.00055;

    // -----------------------------
    // THERMAL MODEL (your version, refined slightly)
    // -----------------------------
    const heatBase = isWarmup ? 4.0 : 6.8;
    const heat = heatBase * load * style * fuelFactor * inertia;

    const cool = 0.22 * Math.max(0, s.temp - amb);
    const roadCool = 0.03 * Math.max(0, s.temp - trackTemp);

    const noise = (Math.random() - 0.5) * 1.2;

    s.temp = Math.max(amb - 2, s.temp + heat - cool - roadCool + noise);

    s.coreTemp += (s.temp - s.coreTemp) * 0.22;

    // -----------------------------
    // PRESSURE MODEL
    // -----------------------------
    const deltaTemp = s.temp - 15;
    s.pressure = coldPsi + 0.052 * deltaTemp;

    // -----------------------------
    // WEAR MODEL (FIXED)
    // -----------------------------

    const inWindow = s.temp >= tempLow && s.temp <= tempHigh;
    const overTemp = s.temp > tempHigh + TEMP_CRITICAL_OFFSET;
    const underTemp = s.temp < tempLow;

    // Base wear scaling
    let wear = degRate * style;

    // Load effect (GT4: front tyres suffer more)
    wear *= (0.85 + load * 0.35);

    // Temperature effects (single influence, not double-penalty)
    if (inWindow) {
      wear *= 0.65;
      s.lifePhase = Math.min(1, s.lifePhase + 0.002);
    } else if (overTemp) {
      wear *= 1.6;
      s.lifePhase = Math.min(2, s.lifePhase + 0.005);
    } else if (underTemp) {
      wear *= 1.3;
    }

    // End-of-life acceleration (key realism improvement)
    const endLifeMultiplier = 1 + wearCurve(s.degradation) * 1.4;
    wear *= endLifeMultiplier;

    s.degradation = Math.min(1, s.degradation + wear);

    // -----------------------------
    // GRIP MODEL (REALISTIC SHAPE)
    // -----------------------------

    const tempFactor = tempGripFactor(s.temp, tempLow, tempHigh);

    // Rubber condition curve (non-linear)
    const rubberFactor = 1 - wearCurve(s.degradation) * 0.92;

    // slight "peak grip phase bonus"
    const phaseBonus =
      s.lifePhase < 0.6 ? 1.02 :
      s.lifePhase < 1.2 ? 1.00 :
      0.97;

    s.grip = Math.max(
      0,
      rubberFactor * tempFactor * phaseBonus
    );

    result[c] = s;
  }

  return result;
}
