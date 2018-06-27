# `cron` testing

I'd rather have the `cron` npm package run the schedule defined on the server. That have the raspberries poll the command queue, all the time. The command queue is useful but it's not particularly efficient. `ssh` can be used for the most part if an action need to be intermediate. A command to issue a one off cron job might be useful, like run this task at this specific time.
