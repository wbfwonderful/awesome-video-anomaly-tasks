#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8000;
const LIVE_RELOAD_PATH = "/__live-reload";
const IGNORED_DIRS = new Set([".git", "node_modules"]);
const RELOAD_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".md",
  ".png",
  ".svg",
  ".webp",
  ".yaml",
  ".yml",
]);

const LIVE_RELOAD_CLIENT = `<script>
(() => {
  const source = new EventSource("/__live-reload");
  source.addEventListener("reload", () => window.location.reload());
})();
</script>`;

export function injectLiveReload(html) {
  const bodyClosePattern = /<\/body>/i;
  if (bodyClosePattern.test(html)) {
    return html.replace(bodyClosePattern, `${LIVE_RELOAD_CLIENT}</body>`);
  }

  return `${html}${LIVE_RELOAD_CLIENT}`;
}

export function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8",
    ".webp": "image/webp",
    ".yaml": "text/yaml; charset=utf-8",
    ".yml": "text/yaml; charset=utf-8",
  };

  return types[ext] || "application/octet-stream";
}

export function resolveStaticPath(requestUrl, rootDir) {
  let pathname;
  try {
    const rawPathname = String(requestUrl).split(/[?#]/)[0] || "/";
    const decodedRawPathname = decodeURIComponent(rawPathname);
    if (decodedRawPathname.split("/").includes("..")) {
      return null;
    }
    pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  } catch {
    return null;
  }

  const relativePath = pathname.endsWith("/")
    ? `${pathname.slice(1)}index.html`
    : pathname.slice(1);
  const normalizedPath = path.normalize(relativePath);
  const candidate = path.resolve(rootDir, normalizedPath);
  const rootWithSeparator = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`;

  if (candidate !== rootDir && !candidate.startsWith(rootWithSeparator)) {
    return null;
  }

  return candidate;
}

export function createDevServer({ rootDir = process.cwd() } = {}) {
  const clients = new Set();
  const server = http.createServer(async (request, response) => {
    if (request.url?.startsWith(LIVE_RELOAD_PATH)) {
      handleLiveReloadClient(request, response, clients);
      return;
    }

    await serveStaticFile(request, response, rootDir);
  });

  return {
    server,
    broadcastReload(changedPath = "") {
      const payload = `event: reload\ndata: ${JSON.stringify({ path: changedPath })}\n\n`;
      for (const client of clients) {
        client.write(payload);
      }
    },
  };
}

export async function startDevServer({
  rootDir = process.cwd(),
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
} = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const devServer = createDevServer({ rootDir: resolvedRoot });
  const stopWatching = watchProject(resolvedRoot, devServer.broadcastReload);
  const actualPort = await listenOnAvailablePort(devServer.server, { host, port });

  devServer.server.on("close", stopWatching);
  console.log(`Local preview: http://${host}:${actualPort}/`);
  console.log("Live reload enabled. Press Ctrl-C to stop.");

  return {
    ...devServer,
    host,
    port: actualPort,
    rootDir: resolvedRoot,
    close() {
      stopWatching();
      devServer.server.close();
    },
  };
}

async function serveStaticFile(request, response, rootDir) {
  const resolvedPath = resolveStaticPath(request.url || "/", rootDir);
  if (!resolvedPath) {
    sendText(response, 403, "Forbidden");
    return;
  }

  let filePath = resolvedPath;
  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch {
    sendText(response, 404, "Not found");
    return;
  }

  try {
    const content = await fs.promises.readFile(filePath);
    const contentType = getContentType(filePath);
    response.setHeader("Content-Type", contentType);
    response.setHeader("Cache-Control", "no-store");

    if (contentType.startsWith("text/html")) {
      response.end(injectLiveReload(content.toString("utf8")));
      return;
    }

    response.end(content);
  } catch {
    sendText(response, 500, "Internal server error");
  }
}

function handleLiveReloadClient(request, response, clients) {
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream",
  });
  response.write("retry: 1000\n\n");
  clients.add(response);

  request.on("close", () => {
    clients.delete(response);
  });
}

function sendText(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.end(body);
}

function watchProject(rootDir, onChange) {
  const watchers = new Map();
  let debounceTimer = null;

  const scheduleReload = (filePath) => {
    if (!shouldTriggerReload(filePath)) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => onChange(path.relative(rootDir, filePath)), 80);
  };

  const watchDir = (dirPath) => {
    if (watchers.has(dirPath) || shouldIgnoreDir(dirPath)) return;

    let watcher;
    try {
      watcher = fs.watch(dirPath, (_eventType, filename) => {
        if (!filename) {
          scheduleReload(dirPath);
          return;
        }

        const changedPath = path.join(dirPath, filename.toString());
        fs.promises.stat(changedPath)
          .then((stats) => {
            if (stats.isDirectory()) {
              watchDir(changedPath);
              return;
            }
            scheduleReload(changedPath);
          })
          .catch(() => scheduleReload(changedPath));
      });
    } catch {
      return;
    }

    watchers.set(dirPath, watcher);
  };

  const scanDirs = (dirPath) => {
    if (shouldIgnoreDir(dirPath)) return;
    watchDir(dirPath);

    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        scanDirs(path.join(dirPath, entry.name));
      }
    }
  };

  scanDirs(rootDir);

  return () => {
    clearTimeout(debounceTimer);
    for (const watcher of watchers.values()) {
      watcher.close();
    }
    watchers.clear();
  };
}

function shouldIgnoreDir(dirPath) {
  return IGNORED_DIRS.has(path.basename(dirPath));
}

function shouldTriggerReload(filePath) {
  return RELOAD_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function listenOnAvailablePort(server, { host, port }) {
  return new Promise((resolve, reject) => {
    const tryPort = (candidatePort) => {
      const onError = (error) => {
        server.off("listening", onListening);
        if (error.code === "EADDRINUSE" && candidatePort < port + 20) {
          tryPort(candidatePort + 1);
          return;
        }
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve(candidatePort);
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(candidatePort, host);
    };

    tryPort(port);
  });
}

function parseArgs(argv) {
  const args = { host: DEFAULT_HOST, port: DEFAULT_PORT, rootDir: process.cwd() };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--host") {
      args.host = argv[index + 1] || args.host;
      index += 1;
    } else if (arg === "--port") {
      args.port = Number(argv[index + 1]) || args.port;
      index += 1;
    } else if (arg === "--root") {
      args.rootDir = argv[index + 1] || args.rootDir;
      index += 1;
    }
  }

  return args;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startDevServer(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
