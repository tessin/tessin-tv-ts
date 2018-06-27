import request from "./request";

import { parse, format } from "url";
import { exec } from "./utils";
import { platform } from "os";

function authorize(url) {
  const parsed = parse(url, true);

  // console.debug("authorize", "url", url);
  // console.debug("authorize", "parsed", parsed);
  // console.debug("authorize", "TESSIN_TV_SECRET", process.env.TESSIN_TV_SECRET);

  if (!parsed.hostname) {
    parsed.hostname = process.env.TESSIN_TV_HOST || "localhost";
  }

  if (!parsed.protocol) {
    if (parsed.hostname === "localhost") {
      parsed.protocol = "http";
      parsed.port = "7071";
    } else {
      parsed.protocol = "https";
    }
  }

  Object.assign(parsed.query, {
    code: process.env.TESSIN_TV_SECRET
  });

  delete parsed.search; // otherwise the original 'search' value is used

  const authorized = format(parsed);

  // console.debug("authorize", "authorized", authorized);

  return authorized;
}

const serialNumberPattern = /[Ss]erial\s*:\s*([0-9A-Fa-f]+)/;

export async function serialNumber(): Promise<string> {
  if (platform() === "win32") {
    return "0000000000000000";
  }
  const m = serialNumberPattern.exec(await exec("cat /proc/cpuinfo"));
  if (m) {
    return m[1].toLowerCase();
  }
  return "ffffffffffffffff";
}

export async function hello(): Promise<void> {
  var res = await request({
    method: "POST",
    url: authorize("/api/hello"),
    content: {
      version: process.env.npm_package_version,
      hostID: {
        hostname: await exec(
          platform() === "win32" ? "hostname" : "hostname -I"
        ),
        serialNumber: await serialNumber()
      }
    }
  });

  const result = res.content as {
    success: boolean;
    errorCode: string;
    errorMessage: string;
  };

  if (!result.success) {
    throw new Error(`${result.errorCode}: ${result.errorMessage}`);
  }
}
