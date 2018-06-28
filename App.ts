import { Browser, Page, launch } from "puppeteer";
import { CronJob } from "cron";

import {
  StateMachine,
  State,
  Event,
  EnterEvent,
  LeaveEvent,
  dispatch,
  transition,
  post
} from "./HSM";

import { hello, HelloResponse } from "./commands";

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

interface Job {
  etag: string;
  job: CronJob;
}

class JobEvent implements Event {
  type: string = "job";
  name: string;
  command: any;

  constructor(name: string, command: any) {
    this.name = name;
    this.command = command;
  }
}

export default class App extends StateMachine<App> {
  browser: Browser;
  stop: boolean;
  tickTimer: NodeJS.Timer;
  // name of device
  name: string;
  jobs: Map<string, Job>;

  constructor() {
    super();

    this.jobs = new Map<string, Job>();

    transition(this, TopState);
  }
}

export async function TopState(hsm: App, e: Event): Promise<State<App>> {
  console.debug("event", e.constructor.name);
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
    console.debug("tick", e.n);
    if (e.n % 2 == 0) {
      const result = await hello();

      this.name = result.name;

      // stop all jobs for simplicity sake
      // todo: use etags to invalidate jobs

      for (const [k, v] of hsm.jobs) {
        v.job.stop();
      }

      hsm.jobs.clear();

      if (result.jobs) {
        for (const job of result.jobs) {
          const jobName = job.name;
          const jobCommand = job.command;
          const cronJob = new CronJob({
            cronTime: job.cronExpression,
            onTick: () => post(hsm, new JobEvent(jobName, jobCommand)),
            timeZone: job.timeZone
          });
          hsm.jobs.set(job.name, cronJob);
          cronJob.start();
        }
      }
    }
  }
  console.debug("unhandled event", e.constructor.name);
  return null; // unhandled (top state)
}
