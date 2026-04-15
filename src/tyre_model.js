export const CORNERS = ['FL', 'FR', 'RL', 'RR'];

// Load coefficients per corner — GT4 mid-engine bias
// RL is most loaded: traction + lateral load on Paul Ricard's many right handers
export const LOAD_COEFF = { FL: 0.88, FR: 1.08, RL: 1.12, RR: 0.92 };

export const TEMP_CRITICAL_OFFSET = 15;

// Tyre thermal inertia — how quickly each corner responds to load changes
// Rear tyres have more mass/contact patch so heat up slightly faster
const THERMAL_INERTIA = { FL: 0.82, FR: 0.82, RL: 0.88, RR: 0.88 };

export function tempGripFactor(temp, tempLow, tempHigh) {
  if (temp >= tempLow && temp <= tempHigh) return 1.0;
  if (temp < tempLow) {
    // Cold tyre — grip builds slowly from 30°C
    const ratio = Math.max(0, (temp - 25) / (tempLow - 25));
    return 0.60 + 0.40 * Math.pow(ratio, 1.4);
  }
  // Over temp — thermal degradation cliff
  const critTemp = tempHigh + TEMP_CRITICAL_OFFSET;
  const excess = Math.min(1, (temp - tempHigh) / (critTemp - tempHigh));
  return Math.max(0.48, 1 - 0.52 * Math.pow(excess, 1.3));
}

export function createTyreState(coldPsi) {
  const state = {};
  for (const c of CORNERS) {
    state[c] = {
      temp: 26,           // starting close to ambient
      pressure: coldPsi,
      grip: 0.72,         // cold tyre grip penalty at start
      degradation: 0.0,
      coreTemp: 24,       // tyre core temperature (slower to change)
    };
  }
  return state;
}

export function updateTyres(state, params) {
  const {
    trackTemp, airTemp, fuelMass, style,
    isWarmup, coldPsi, tempLow, tempHigh, degRate
  } = params;

  const result = {};
  const amb = (trackTemp * 0.65 + airTemp * 0.35); // track temp dominates surface heating

  for (const c of CORNERS) {
    const s = { ...state[c] };
    const lc = LOAD_COEFF[c];
    const ti = THERMAL_INERTIA[c];

    // Fuel mass effect on vertical load
    const ff = 1.0 + Math.max(0, fuelMass - 50) * 0.0006;

    // Heat generation from tyre work
    const heatBase = isWarmup ? 4.5 : 7.2;
    const heat = heatBase * lc * style * ff * ti;

    // Convective cooling — proportional to temp delta above ambient
    const cool = 0.20 * Math.max(0, s.temp - amb);

    // Conductive cooling to road surface (minor)
    const roadCool = 0.04 * Math.max(0, s.temp - trackTemp);

    // Lap-to-lap variation
    const noise = (Math.random() - 0.5) * 1.6;

    s.temp = Math.max(amb - 2, s.temp + heat - cool - roadCool + noise);

    // Core temp lags surface by ~8°C
    s.coreTemp = s.coreTemp + (s.temp - s.coreTemp) * 0.25;

    // Pressure from temperature (Ideal Gas Law approximation)
    // Cold fill at 15°C. 0.052 PSI per °C above fill temp
    const deltaTemp = s.temp - 15;
    s.pressure = Math.max(coldPsi, coldPsi + 0.052 * deltaTemp);

    // Degradation model
    const inWindow = s.temp >= tempLow && s.temp <= tempHigh;
    const overTemp = s.temp > tempHigh + TEMP_CRITICAL_OFFSET;
    const underTemp = s.temp < tempLow;

    let dg;
    if (inWindow) {
      // Optimal window — minimum wear
      dg = degRate * 0.65 * style;
    } else if (overTemp) {
      // Thermal cliff — rubber graining and blistering
      const excess = (s.temp - (tempHigh + TEMP_CRITICAL_OFFSET)) / 10;
      dg = (degRate + 0.004 * excess) * style;
    } else if (underTemp) {
      // Cold tyre — sliding before heat build-up
      const coldFactor = 1.8 - (s.temp / tempLow) * 0.8;
      dg = degRate * coldFactor * style;
    } else {
      dg = degRate * style;
    }

    s.degradation = Math.min(1, s.degradation + dg);

    // Grip: combination of rubber condition and temperature window
    const tempFactor = tempGripFactor(s.temp, tempLow, tempHigh);
    s.grip = Math.max(0, (1 - s.degradation * 0.95) * tempFactor);

    result[c] = s;
  }
  return result;
}
