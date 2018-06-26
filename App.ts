import { Browser, Page, launch } from "puppeteer";

import { StateMachine, Event, EnterEvent, LeaveEvent } from "./HSM";
import { clearTimeout } from "timers";

export class TickEvent implements Event {
  type: string = "tick";
}

export class DisconnectedEvent implements Event {
  type: string = "disconnected";
}

export default class App {
  browser: Browser;
  stop: boolean;
  tickTimer: NodeJS.Timer;
}

export async function TopState(hsm: StateMachine<App>, e: Event, context: App) {
  if (e instanceof EnterEvent) {
    if (!context.browser) {
      context.browser = await launch({ headless: false });
      context.browser.on("disconnected", () =>
        hsm.dispatch(new DisconnectedEvent())
      );
    }
    return null; // handled
  }
  if (e instanceof DisconnectedEvent) {
    console.debug("disconnected!");
    clearTimeout(context.tickTimer);
    return null; // handled
  }
  console.debug("unhandled event", e.constructor.name);
  return null; // unhandled (top state)
}
