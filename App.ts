import { Browser, Page, launch } from "puppeteer";

import {
  StateMachine,
  State,
  Event,
  EnterEvent,
  LeaveEvent,
  dispatch,
  transition
} from "./HSM";

export class TickEvent implements Event {
  type: string = "tick";
  n: number;

  constructor(n: number) {
    this.n = n;
  }
}

export class DisconnectedEvent implements Event {
  type: string = "disconnected";
}

export default class App extends StateMachine<App> {
  browser: Browser;
  stop: boolean;
  tickTimer: NodeJS.Timer;

  constructor() {
    super();

    transition(this, TopState);
  }
}

export async function TopState(hsm: App, e: Event): Promise<State<App>> {
  if (e instanceof EnterEvent) {
    if (!hsm.browser) {
      hsm.browser = await launch({ headless: false });
      hsm.browser.on(
        "disconnected",
        () => dispatch(hsm, new DisconnectedEvent()) // todo: schedule don't dispatch (as dispatch is promise...)?
      );
    }
    return null; // handled
  }
  if (e instanceof DisconnectedEvent) {
    console.debug("disconnected!");
    clearTimeout(hsm.tickTimer);
    return null; // handled
  }
  if (e instanceof TickEvent) {
    // every other tick
    if (e.n % 2 == 0) {
      // do hello
    }
  }
  console.debug("unhandled event", e.constructor.name);
  return null; // unhandled (top state)
}
