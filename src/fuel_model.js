export const FUEL_DENSITY = 0.735;
export const BASE_MASS_KG = 1280;
export const REFERENCE_MASS_KG = 1260;
export const FRONT_DIST_BASE = 0.44;

export function createFuelState(fuelStart) {
  return { fuel: fuelStart };
}

export function consumeFuel(state, params) {
  const { fuelRate, style, isSafetycar, isWarmup } = params;
  const noise = (Math.random() - 0.5) * 0.24;
  let burn = isSafetycar
    ? fuelRate * 0.6
    : isWarmup
      ? fuelRate * 0.5
      : fuelRate * style + noise;

  burn = Math.max(0, burn);
  const fuel = Math.max(0, state.fuel - burn);
  return { fuel, burned: burn };
}

export function massMetrics(fuel, tankCapacity = 120) {
  const fuelMass = fuel * FUEL_DENSITY;
  const totalMass = BASE_MASS_KG + fuelMass;
  const fuelFrac = fuel / tankCapacity;
  const frontDist = FRONT_DIST_BASE + 0.008 * fuelFrac;
  const frontLoad = totalMass * frontDist;
  const rearLoad = totalMass - frontLoad;
  const massDelta = (totalMass - REFERENCE_MASS_KG) * 0.035;
  return { fuelMass, totalMass, frontLoad, rearLoad, massDelta };
}
