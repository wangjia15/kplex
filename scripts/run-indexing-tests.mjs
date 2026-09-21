import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["tests/indexing.test.mjs"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
