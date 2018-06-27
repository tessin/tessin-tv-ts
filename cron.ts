import { CronJob } from "cron";

const job1 = new CronJob("* * * * * *", () => {
  console.log("(1) hello cron!");
});

job1.start();

const job5 = new CronJob("*/5 * * * * *", () => {
  console.log("(5) hello cron!");
});

job5.start();
