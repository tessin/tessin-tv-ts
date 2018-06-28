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

import { hello, HelloResponse, HelloJobResponse } from "./commands";

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
  gotoUrl: string;
  jobs: Map<string, Job>;
  page: Page;

  constructor() {
    super(TopState);

    this.jobs = new Map<string, Job>();
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

    // stop all jobs
    for (const [k, v] of hsm.jobs) {
      v.job.stop();
    }

    clearTimeout(hsm.tickTimer);
    return null; // handled
  }
  if (e instanceof TickEvent) {
    if (e.n == 0) {
      // this is only done once!

      const result = await hello();

      console.log("jobs", result.jobs);

      hsm.name = result.name;
      hsm.gotoUrl = result.gotoUrl;

      const oldJobs = hsm.jobs;
      const newJobs = new Map<string, HelloJobResponse>();

      for (const job of result.jobs || []) {
        newJobs.set(job.name, job);
      }

      const stopped = new Set<string>();

      for (const [k, v] of oldJobs) {
        if (newJobs.has(k)) {
          const newJob = newJobs.get(k);
          // has this job changed?
          if (newJob.etag !== v.etag) {
            v.job.stop();
            stopped.add(k);
          }
        } else {
          v.job.stop();
          stopped.add(k);
        }
      }

      for (const k of stopped) {
        oldJobs.delete(k);
      }

      for (const [k, v] of newJobs) {
        if (!oldJobs.has(k)) {
          const jobName = v.name;
          const jobCommand = v.command;
          const cronJob = new CronJob({
            cronTime: v.cronExpression,
            onTick: () => post(hsm, new JobEvent(jobName, jobCommand)),
            timeZone: v.timeZone
          });
          oldJobs.set(v.name, { etag: v.etag, job: cronJob });
          cronJob.start();
        }
      }

      hsm.page = await hsm.browser.newPage();

      if (hsm.gotoUrl) {
        await hsm.page.goto(hsm.gotoUrl);
      }

      await transition(hsm, Hello);

      return null; // handled
    }
  }
  console.debug("unhandled event", e.constructor.name);
  return null; // unhandled (top state)
}

export async function Hello(hsm: App, e: Event): Promise<State<App>> {
  return TopState;
}
