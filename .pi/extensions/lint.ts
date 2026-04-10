/**
 * Lint Extension for Pi
 *
 * Runs ESLint and Prettier checks after write/edit tool executions.
 * Injects errors into conversation so agent can fix them.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const testLintScript = process.env.LINT_SCRIPT ?? "test:lint";
const testCompileScript = process.env.COMPILE_SCRIPT ?? "test:compile";
const formatScript = process.env.FORMAT_SCRIPT ?? "format";

async function runCheck(pi: ExtensionAPI, script: string) {
  const result = await pi.exec("npm", ["run", script]);
  return {
    passed: result.code === 0,
    output: result.stdout + result.stderr,
    script
  };
}

function formatOutput(results: { passed: boolean; output: string; script: string }[]) {
  return results
    .filter(r => !r.passed)
    .map(r => `❌ **${r.script}** failed:\n\n\`\`\`\n${r.output}\n\`\`\``)
    .join("\n\n");
}

export default function lintExtension(pi: ExtensionAPI) {
  pi.registerMessageRenderer("lint-errors", (message, _options, theme) => {
    const { Text } = require("@mariozechner/pi-tui");
    const lines: string[] = [];
    lines.push(theme.fg("error", "⚠️  Lint/Format Issues"));
    lines.push(theme.fg("error", "─".repeat(40)));
    const content = Array.isArray(message.content)
      ? message.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map(c => c.text)
          .join("")
      : message.content;
    lines.push(content);
    return new Text(lines.join("\n"), 0, 0);
  });

  pi.on("tool_execution_end", async (event, ctx) => {
    if (!["write", "edit"].includes(event.toolName)) return;

    const results = await Promise.all([
      runCheck(pi, testLintScript),
      runCheck(pi, formatScript),
      runCheck(pi, testCompileScript)
    ]);

    const failed = results.filter(r => !r.passed);
    if (failed.length === 0) return;

    const errors = formatOutput(failed);

    pi.sendMessage(
      {
        customType: "lint-errors",
        content: errors,
        display: true
      },
      { deliverAs: "steer", triggerTurn: true }
    );

    if (ctx.hasUI) {
      ctx.ui.notify(`Lint/format issues — see errors above`, "warning");
    }
  });
}
