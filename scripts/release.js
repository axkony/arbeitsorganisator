// One-command release. Bumps the version in package.json + tauri.conf.json,
// commits, tags v<version>, and pushes — which triggers the GitHub Actions
// build that signs and publishes the release (and generates latest.json).
//
//   pnpm release 0.4.1
//
// The version must be higher than what's installed, or the updater won't offer
// it. Small fix -> bump the last digit (0.4.0 -> 0.4.1); feature -> the middle.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: pnpm release <version>   (e.g. pnpm release 0.4.1)");
  process.exit(1);
}
const tag = `v${version}`;

// Refuse to reuse a tag, so you can't accidentally re-release a version.
try {
  execSync(`git rev-parse --verify --quiet ${tag}`, { stdio: "ignore" });
  console.error(`Tag ${tag} already exists — pick a higher version.`);
  process.exit(1);
} catch {
  /* tag doesn't exist yet — good */
}

// Bump the version field in both files, preserving all other formatting.
for (const file of ["package.json", "src-tauri/tauri.conf.json"]) {
  const text = readFileSync(file, "utf8");
  if (!/"version":\s*"[^"]*"/.test(text)) {
    console.error(`No "version" field found in ${file}`);
    process.exit(1);
  }
  writeFileSync(
    file,
    text.replace(/"version":\s*"[^"]*"/, `"version": "${version}"`),
  );
  console.log(`  set ${file} -> ${version}`);
}

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

// Commit whatever's pending (your change + the version bump). If nothing
// changed, just tag the current commit.
if (execSync("git status --porcelain").toString().trim()) {
  run("git add -A");
  run(`git commit -m "Release ${tag}"`);
} else {
  console.log("  no pending changes — tagging the current commit");
}

run(`git tag ${tag}`);
run("git push origin HEAD");
run(`git push origin ${tag}`);

console.log(`\n✅ ${tag} pushed. CI is now building & publishing the release:`);
console.log("   https://github.com/axkony/arbeitsorganisator/actions");
