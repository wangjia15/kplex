/**
 * Updates the five release metadata files together without installing dependencies, building,
 * committing, tagging or publishing. Validate the entire proposed state before writing any file.
 */
import {readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {releaseChannel, validateReleaseMetadata} from "./releaseMetadata.mjs";

/** Prepare a numeric release base, preserving dependency records and historical version minimums. */
export async function prepareRelease(version, root = process.cwd()) {
  if (typeof version !== "string" || releaseChannel(version, version).prerelease)
    throw new Error("Use a numeric release version, for example: npm run release:prepare -- 0.2.1");
  const files = ["manifest.json", "manifest-beta.json", "package.json", "package-lock.json", "versions.json"];
  const records = await Promise.all(files.map(/** Read all inputs before validation or writes. */ async file =>
    JSON.parse(await readFile(resolve(root, file), "utf8"))));
  const [manifest, betaManifest, packageJson, packageLock, versions] = records;
  releaseChannel(manifest.version, manifest.version);
  const current = manifest.version.split(".").map(Number), next = version.split(".").map(Number);
  const firstDifference = next.findIndex(/** Compare numeric components rather than lexical versions. */ (part, index) => part !== current[index]);
  if (firstDifference >= 0 && next[firstDifference] < current[firstDifference])
    throw new Error(`Cannot prepare ${version}: current release is ${manifest.version}`);
  if (Object.hasOwn(versions, version) && versions[version] !== manifest.minAppVersion)
    throw new Error(`versions.json already records a different minimum for ${version}`);
  for (const record of [manifest, betaManifest, packageJson, packageLock, packageLock.packages[""]]) record.version = version;
  versions[version] = manifest.minAppVersion;
  validateReleaseMetadata({manifest, betaManifest, packageJson, packageLock, versions});
  // Keep writes serial and do not rewrite unchanged files; re-running also repairs an interrupted bump.
  for (let index = 0; index < files.length; index++) {
    const path = resolve(root, files[index]), original = await readFile(path, "utf8");
    if (JSON.stringify(JSON.parse(original)) !== JSON.stringify(records[index]))
      await writeFile(path, `${JSON.stringify(records[index], null, 2)}\n`);
  }
}

/** Accept exactly one explicit version; the CLI never performs Git or publication actions. */
async function main(args) {
  if (args.length !== 1) throw new Error("Usage: npm run release:prepare -- 0.2.1");
  await prepareRelease(args[0]);
  console.log(`Release metadata prepared: ${args[0]}. Review and commit the changes before tagging; CI builds the release assets.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(/** Report a failed preparation without starting other release actions. */ error => {
    console.error(error instanceof Error ? error.message : "Release preparation failed");
    process.exitCode = 1;
  });
}
