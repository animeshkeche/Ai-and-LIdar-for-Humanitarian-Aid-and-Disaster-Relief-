/**
 * Production-only Express server entry for the Electron desktop build.
 * Does NOT import Vite — serves pre-built static files from dist/public/.
 */
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupWebSocket } from "./realtime";

// esbuild bundles as CJS for Electron; __dirname is available via Node.js CJS globals
declare const __dirname: string;

function log(msg: string) {
  const t = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [server] ${msg}`);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
    }
  });
  next();
});

(async () => {
  const httpServer = await registerRoutes(app);
  setupWebSocket(httpServer);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
  });

  // Serve the pre-built React SPA
  // In Electron production: __dirname = dist/ so public/ is a sibling
  const candidates = [
    path.join(__dirname, "public"),              // dist/public/ (bundled)
    path.join(__dirname, "..", "dist", "public"), // fallback
    path.join(process.resourcesPath ?? "", "app", "dist", "public"), // packaged
  ];

  const distPath = candidates.find((p) => fs.existsSync(p));

  if (distPath) {
    app.use(express.static(distPath));
    app.use("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    log(`Serving static files from: ${distPath}`);
  } else {
    log("WARNING: Could not find static build directory. Run 'npm run build' first.");
  }

  const port = parseInt(process.env.PORT ?? "5000", 10);
  httpServer.listen({ port, host: "127.0.0.1" }, () => {
    log(`AI-LiDAR Desktop Server ready on port ${port}`);
    // Signal Electron main that server is up
    if (process.send) process.send({ type: "ready", port });
    process.stdout.write(`READY:${port}\n`);
  });
})();
