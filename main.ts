import App, { TickEvent, TopState } from "./App";

import { dispatch } from "./HSM";

const TARGET_TICK_RATE = 1500; // milliseconds

async function main() {
  const hsm = new App();
  const t0 = process.hrtime();
  for (let n = 0; ; n++) {
    const d = process.hrtime(t0);
    try {
      await dispatch(hsm, new TickEvent(n));
    } catch (err) {
      console.error("error:", err);
    }
    const timeout =
      TARGET_TICK_RATE - (Math.floor(0.000001 * d[1]) % TARGET_TICK_RATE);
    await new Promise(
      resolve => (hsm.tickTimer = setTimeout(resolve, timeout))
    );
  }
}

main();
