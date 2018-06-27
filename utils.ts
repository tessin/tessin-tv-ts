import * as child_process from "child_process";

export function exec(
  command: string,
  options?: child_process.ExecOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    child_process.exec(command, options, (err, stdout, stderr) => {
      process.stderr.write(stderr);
      if (err) {
        reject(err);
      } else {
        resolve(stdout.toString().trim());
      }
    });
  });
}
