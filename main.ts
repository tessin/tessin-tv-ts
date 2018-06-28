import App, { TickEvent, TopState } from "./App";

import { runToCompletion, post, transition } from "./HSM";

const TARGET_TICK_RATE = 1500; // milliseconds

async function main() {
  const hsm = new App();
  const t0 = process.hrtime();
  for (let n = 0; ; n++) {
    const d = process.hrtime(t0);
    // console.debug("tick", d);
    post(hsm, new TickEvent(n));
    try {
      await runToCompletion(hsm);
    } catch (err) {
      console.error("error", err);
    }
    const timeout =
      TARGET_TICK_RATE - (Math.floor(0.000001 * d[1]) % TARGET_TICK_RATE);
    await new Promise(
      resolve => (hsm.tickTimer = setTimeout(resolve, timeout))
    );
  }
}

process.env.npm_package_version = require("../package.json").version;

main();
