import { spawnSync } from "node:child_process";
import { hasFlag, optionValue } from "../cli/options";
import { handleCompanionRequest } from "./api";
import { companionHtml } from "./view";

export interface CompanionServerInput {
  args: string[];
  cwd: string;
  entryPath: string;
}

interface BrowserInput {
  url: string;
}

const openBrowser = ({ url }: BrowserInput) =>
  process.platform === "darwin" && spawnSync("open", [url], { stdio: "ignore" });

export const startCompanionServer = async ({ args, cwd, entryPath }: CompanionServerInput) => {
  const hostname = "127.0.0.1";
  const port = Number(optionValue({ args, name: "port" }) ?? "3838");
  const server = Bun.serve({
    hostname,
    port,
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        return new Response(companionHtml(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      return handleCompanionRequest({ request, url, cwd, entryPath });
    },
  });
  const url = `http://${hostname}:${server.port}`;

  if (!hasFlag({ args, name: "no-open" })) {
    openBrowser({ url });
  }

  console.log(`MaxMEM companion running at ${url}`);
  await new Promise(() => {});
};
