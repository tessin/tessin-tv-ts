import { Browser, Page, launch } from "puppeteer";

import { StateMachine, State, Event } from "./HSM";

class TickEvent implements Event {
  type: string = "tick";
}

class InitialState extends State {
  _browser: Browser;
  _page: Page;

  async enter() {
    this._browser = await launch({ headless: false });
  }

  async handle(e: Event) {
    switch (e.type) {
      case "tick": {
        return new PageState(await this._browser.newPage());
      }
    }
    return await super.handle(e);
  }

  // leave() {
  //   // return this._browser.close();
  // }
}

class PageState extends State {
  _page: Page;
  constructor(page: Page) {
    super();
    this._page = page;
  }

  handle(e: Event) {
    return super.handle(e);
  }
}

export default class App {
  _hsm: StateMachine;

  constructor() {
    this._hsm = new StateMachine();
  }

  init() {
    return this._hsm.transition(new InitialState());
  }

  tick() {
    return this._hsm.dispatch(new TickEvent());
  }
}
