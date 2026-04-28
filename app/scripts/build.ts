import { tmpdir } from "node:os";
import { join } from "node:path";

const result = await Bun.build({
  entrypoints: ["./app/bin/maxmem"],
  outdir: join(tmpdir(), `maxmem-build-${Date.now()}`),
  target: "bun",
});

if (!result.success) {
  throw new Error("Build failed");
}
