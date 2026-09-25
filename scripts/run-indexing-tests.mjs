import { spawnSync } from "node:child_process";

for (const suite of ["tests/indexing.test.mjs", "tests/paper.test.mjs", "tests/paper-controller.test.mjs"]) {
  const result = spawnSync(process.execPath, [suite], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
