import App, { TickEvent, TopState } from "./App";
import { StateMachine } from "./HSM";

const TARGET_TICK_RATE = 1500; // milliseconds

async function main() {
  const hsm = new StateMachine<App>(new App());
  await hsm.transition(TopState);
  for (const t0 = process.hrtime(); ; ) {
    const d = process.hrtime(t0);
    try {
      await hsm.dispatch(new TickEvent());
    } catch (err) {
      console.error("error:", err);
    }
    const timeout =
      TARGET_TICK_RATE - (Math.floor(0.000001 * d[1]) % TARGET_TICK_RATE);
    await new Promise(
      resolve => (hsm.context.tickTimer = setTimeout(resolve, timeout))
    );
  }
}

main();
