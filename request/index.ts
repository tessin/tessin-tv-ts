const { parse } = require("url");

type HttpHeaders = { [x: string]: string };

type HttpContent = object | string;

interface HttpRequestMessage {
  method: string;
  url: string;
  headers?: HttpHeaders;
  content?: HttpContent;
  // todo: rest params
}

interface HttpResponseMessage {
  statusCode: number;
  statusMessage: string;
  headers: HttpHeaders;
  content: HttpContent;
  // todo: rest params
}

class Content {
  headers: HttpHeaders;
  content: Buffer;

  constructor(headers: HttpHeaders, content: HttpContent) {
    if (typeof content === "object") {
      this.headers = Object.assign(
        { ["Content-Type"]: "application/json" },
        headers
      );
      this.content = new Buffer(JSON.stringify(content), "utf8");
    } else if (typeof content === "string") {
      this.headers = headers;
      this.content = new Buffer(content, "utf8");
    } else {
      this.headers = headers;
      this.content = null;
    }
  }
}

const jsonPattern = /^application\/json;?/;
function isJson(headers: HttpHeaders) {
  return jsonPattern.test(headers["content-type"]);
}

export function requestAsync(
  options: HttpRequestMessage
): Promise<HttpResponseMessage> {
  const { method, url, headers, content, ...rest } = options;

  const { protocol, hostname, port, path } = parse(url);

  let request;

  switch (protocol) {
    case "http:": {
      request = require("http").request;
      break;
    }
    case "https:": {
      request = require("https").request;
      break;
    }
    default: {
      throw new RangeError(`unsupported protocol '${protocol}'`);
    }
  }

  const content2 = new Content(headers || {}, content);

  const headers2 = Object.assign(
    {
      ["Accept"]: "application/json"
    },
    content2.headers,
    content2.content
      ? {
          ["Content-Length"]: content2.content.length
        }
      : null
  );

  return new Promise((resolve, reject) => {
    const options2 = {
      hostname,
      port,
      method,
      path,
      headers: headers2,
      ...rest
    };
    // console.error("request", options);
    const req = request(options2, res => {
      res.setEncoding("utf8");

      let content3 = "";

      res.on("data", chunk => {
        content3 += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          content: isJson(res.headers) ? JSON.parse(content3) : content3
        });
      });
    });

    req.on("socket", socket => {
      socket.on("timeout", () => {
        req.abort();
      });
    });

    req.on("error", err => reject(err));

    if (content2.content) {
      req.write(content2.content);
    }

    req.end();
  });
}

function variance(x: number) {
  var y = Math.random();
  var z = x + (y * (x - 2 * x)) / 2;
  return z;
}

function delay(seconds: number) {
  return new Promise(resolve => {
    setTimeout(resolve, 1000 * seconds);
  });
}

const retry_policy = [1, 3, 9, 27, 81, 243]; // 3^1, 3^2, 3^n...

export default async function requestWithRetryAsync(
  req: HttpRequestMessage
): Promise<HttpResponseMessage> {
  let res;
  for (let i = 0; i < retry_policy.length; i++) {
    // console.error("request with retry", i);
    if (0 < i) {
      await delay(variance(retry_policy[i]));
    }
    try {
      res = await requestAsync(req);
      if (res.statusCode === 503) {
        continue;
      }
      break;
    } catch (err) {
      // console.error("request with retry", err.code);
      if (err.code === "ECONNRESET" && i + 1 < retry_policy.length) {
        continue;
      }
      throw err;
    }
  }
  return res;
}
