import App from "./App";

let tick,
  tickID,
  n = 0,
  t0 = process.hrtime();

const TARGET_TICK_RATE = 2000; // milliseconds

const app = new App();

tick = async function() {
  const d = process.hrtime(t0);
  try {
    // console.debug("tick.", n++, d);
    await app.tick();
  } catch (err) {
    console.error("error:", err);
  } finally {
    const ms =
      TARGET_TICK_RATE - (Math.floor(0.000001 * d[1]) % TARGET_TICK_RATE);
    // console.debug("timeout", ms);
    tickID = setTimeout(tick, ms);
  }
};

tickID = setTimeout(tick, 0);
