import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const shouldBuild = args.includes("--build");
const targetArg = args.find((a) => !a.startsWith("-"))?.trim();

const remoteHost = process.env.DEPLOY_HOST || "florist-vps";
const remoteDir = targetArg ? `~/${targetArg}` : "~/booking-system";

const candidateEnvFiles = targetArg
  ? [`.env.prod.${targetArg}`, `.env.${targetArg}.prod`]
  : [".env.prod"];

const localEnvFile = candidateEnvFiles.find((file) => existsSync(file));

if (!localEnvFile) {
  console.error(
    `Error: Could not find env file (${candidateEnvFiles.join(" or ")}).`
  );
  process.exit(1);
}

const remoteEnvPath = `${remoteHost}:${remoteDir}/.env.prod`;
const composeFlags = shouldBuild
  ? "--env-file .env.prod up -d --build --force-recreate"
  : "--env-file .env.prod up -d --force-recreate";

console.log(`Uploading ${localEnvFile} -> ${remoteEnvPath}...`);
execFileSync("scp", [localEnvFile, remoteEnvPath], { stdio: "inherit" });

console.log(`Recreating container in ${remoteDir}...`);
execFileSync(
  "ssh",
  [remoteHost, `cd ${remoteDir} && docker compose ${composeFlags}`],
  { stdio: "inherit" }
);

console.log("Done!");
