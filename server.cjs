const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const initialPort = Number(process.env.PORT || 4173);
const root = __dirname;

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".ics", "text/calendar; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
]);

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const decodedPath = decodeURIComponent(requestUrl.pathname);
  const relativePath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.normalize(path.join(root, relativePath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes.get(extension) || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  });
});

const startServer = (port) => {
  server.listen(port, () => {
    console.log(`WC 2026 Schedule running at http://localhost:${port}`);
  });
};

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    const nextPort = server.address()?.port ? Number(server.address().port) + 1 : currentPort + 1;
    console.warn(`Port ${currentPort} is busy, trying ${nextPort}...`);
    currentPort = nextPort;
    startServer(currentPort);
    return;
  }

  throw error;
});

let currentPort = initialPort;
startServer(currentPort);