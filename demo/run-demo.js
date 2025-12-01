#!/usr/bin/env node
/* eslint-disable no-console */

const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");

const steps = [
  {
    title: "Forge: Rebalance Scenario",
    command: "forge",
    args: ["test", "--match-test", "testRebalanceTriggersOrders"],
    cwd: root
  },
  {
    title: "Forge: Payroll Scenario",
    command: "forge",
    args: ["test", "--match-test", "testPayrollExecutionDisbursesFunds"],
    cwd: root
  },
  {
    title: "Dashboard Build",
    command: "npm",
    args: ["run", "build", "--prefix", "dashboard"],
    cwd: root
  }
];

const divider = () => console.log("─".repeat(60));

const runStep = (step) => {
  divider();
  console.log(`▶ ${step.title}`);
  divider();

  const result = spawnSync(step.command, step.args, {
    cwd: step.cwd,
    stdio: "inherit",
    env: process.env
  });

  if (result.status !== 0) {
    console.error(`✖ Step failed: ${step.title}`);
    process.exit(result.status ?? 1);
  }

  console.log(`✔ Completed: ${step.title}\n`);
};

const main = () => {
  console.log("VaultGuard demo harness\n");
  steps.forEach(runStep);
  divider();
  console.log("All demo checks completed successfully.");
  console.log("Next: npm run dev --prefix dashboard");
  divider();
};

main();

