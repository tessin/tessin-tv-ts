import { stat } from "fs";
import { parse } from "url";

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

import {
  hello,
  HelloResponse,
  HelloJobResponse,
  hostname,
  serialNumber
} from "./commands";
import { resolve, basename } from "path";

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

interface PuppeteerCommand {
  type: "puppeteer";
  inst: any[][];
}

type Command = PuppeteerCommand;

class CommandEvent implements Event {
  type: string = "command";
  command: Command;

  constructor(command: Command) {
    this.command = command;
  }
}

class PageEvent implements Event {
  type: string = "page";
  eventName: string;
  err?: Error;

  constructor(eventName: string) {
    this.eventName = eventName;
  }
}

export default class App extends StateMachine<App> {
  browser: Browser;
  browserPage: Page;

  stop: boolean;
  tickTimer: NodeJS.Timer;
  helloTick: number;
  // name of device
  name: string;
  gotoUrl: string;
  jobs: Map<string, Job>;
  hostname: string;
  serialNumber: string;

  constructor() {
    super(TopState);

    this.jobs = new Map<string, Job>();
  }
}

function setStatusText(textContent) {
  const el = document.getElementById("status-text");
  if (el) {
    el.textContent = textContent;
  }
}

export async function TopState(hsm: App, e: Event): Promise<State<App>> {
  console.debug("event", e.constructor.name);
  if (e instanceof EnterEvent) {
    if (!hsm.hostname) {
      hsm.hostname = await hostname();
    }

    if (!hsm.serialNumber) {
      hsm.serialNumber = await serialNumber();
    }

    if (!hsm.browser) {
      let executablePath;

      // will resolve as stat error or null
      const statErrTask = new Promise(resolve =>
        stat("/usr/bin/chromium-browser", resolve)
      );

      if ((await statErrTask) == null) {
        executablePath = "/usr/bin/chromium-browser";
      }

      hsm.browser = await launch({
        executablePath,
        headless: false,
        slowMo: 250,
        args: [
          "--no-default-browser-check",
          "--no-first-run",
          "--disable-infobars", // hide "Chrome is being controlled by  ..."
          // "--incognito", // incognito mode is not support by puppeteer
          process.env.NODE_ENV !== "development" ? "--kiosk" : null
        ].filter(x => x)
      });
      hsm.browser.on(
        "disconnected",
        () => dispatch(hsm, new DisconnectedEvent()) // todo: schedule don't dispatch (as dispatch is promise...)?
      );
    }

    if (!hsm.browserPage) {
      hsm.browserPage = await hsm.browser.newPage();

      hsm.browserPage.on("error", err => {
        const e = new PageEvent("error");
        e.err = err;
        post(hsm, e);
      });

      // native Raspberry Pi resolution
      await hsm.browserPage.setViewport({ width: 1920, height: 1080 });

      post(
        hsm,
        new CommandEvent({
          type: "puppeteer",
          inst: [["goto", "tessin-tv:///splash.html"]]
        })
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
    if (!hsm.helloTick) {
      // this is only done once!

      const result = await hello(hsm.hostname, hsm.serialNumber);

      hsm.name = result.name;
      hsm.gotoUrl = result.gotoUrl;

      const oldJobs = hsm.jobs;
      const newJobs = new Map<string, HelloJobResponse>();

      for (const job of result.jobs || []) {
        newJobs.set(job.name, job);
      }

      console.debug(
        "hello",
        `${newJobs.size} ${newJobs.size === 1 ? "job" : "jobs"}`
      );

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

      await transition(hsm, Hello);

      hsm.helloTick = e.n;

      return null; // handled
    }
  }
  if (e instanceof CommandEvent) {
    switch (e.command.type) {
      case "puppeteer": {
        const page = hsm.browserPage;
        for (const [f, ...args] of e.command.inst) {
          if (f === "goto") {
            // resolve tessin-tv:// scheme
            const parsed = parse(args[0]);
            if (parsed.protocol === "tessin-tv:") {
              let resolved =
                resolve(__dirname, "../static", basename(parsed.pathname)) +
                (parsed.search || "");
              if (require("os").platform() === "linux") {
                resolved = "file://" + resolved;
              }
              console.debug("goto", args[0], "=>", resolved);
              args[0] = resolved;
            }
          }
          await page[f].apply(page, args);
          if (f === "goto") {
            try {
              await page.evaluate(
                setStatusText,
                JSON.stringify({
                  name: hsm.name,
                  hostname: hsm.hostname,
                  serialNumber: hsm.serialNumber,
                  version: process.env.npm_package_version
                })
              );
            } catch (err) {
              console.error("cannot set status text", err.message);
            }
          }
        }
        return null; // handled
      }
    }
  }
  console.debug("unhandled event", e.constructor.name);
  return null; // unhandled (top state)
}

export async function Hello(hsm: App, e: Event): Promise<State<App>> {
  return TopState;
}
