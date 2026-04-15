# McLaren Artura GT4 — Race Engineering Simulation

A browser-based lap-by-lap race engineering simulator for the McLaren Artura GT4 at Circuit Paul Ricard. No build tools or dependencies required beyond Chart.js which is loaded from CDN.

## Live demo

https://izzy200521.github.io/artura-gt4-sim

## Features

- Tyre temperature, pressure, grip and degradation per corner (FL/FR/RL/RR)
- Fuel consumption and vehicle mass evolution
- Safety car and weather event simulation
- Circuit Paul Ricard tyre stress heat map
- Fully configurable via typed number inputs
- Lap-by-lap data table

## Usage

Open `index.html` directly in a browser or serve with:

```bash
npx serve .
```

Then open http://localhost:3000

## Physics model

| Parameter | Value |
|-----------|-------|
| Base lap time | 127.5 s |
| Fuel consumption | 3.5 L/lap nominal |
| Optimal tyre window | 80–105 °C |
| Cold tyre pressure | 19.5 PSI |
| Target hot pressure | 28–30 PSI |
| Pressure coefficient | 0.05 PSI/°C |
| Base mass | 1,380 kg |
| Fuel density | 0.735 kg/L |

## File structure

src/tyre_model.js      Thermal model, pressure, grip, degradation
src/fuel_model.js      Fuel burn, mass, axle load distribution
src/track_model.js     Paul Ricard segments, lap time estimator
src/simulation.js      Main loop, integrates all models
src/visualisation.js   Chart.js charts and canvas heat map
styles/main.css        VS Code dark theme UI
index.html             Entry point

## License

MIT
