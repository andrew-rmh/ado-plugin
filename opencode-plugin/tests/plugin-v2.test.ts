import { describe, expect, it } from "vitest";
import { Host } from "@opencode/plugin/host";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import adoPlugin from "../src/index.js";

describe("OpenCode V2 plugin entrypoint", () => {
  it("resolves a local checkout through the root server entrypoint", () => {
    const directory = fileURLToPath(new URL("../", import.meta.url));
    const entry = Host.resolve({ directory }).server;
    expect(entry).toBe(new URL("../index.js", import.meta.url).href);
    expect(readFileSync(fileURLToPath(entry!), "utf8")).toContain('export { default, server } from "./dist/index.js"');
  });

  it("registers the shared ADO tool surface through the V2 tool transform", async () => {
    const tools: Array<{ name: string; input: { type: string } }> = [];
    const context = {
      options: {
        defaultProfile: "work",
        profiles: {
          work: {
            org: "example",
            project: "project",
            patEnvVar: "ADO_PAT",
            repos: ["repo"],
          },
        },
      },
      tool: {
        transform: async (callback: (editor: { add: (tool: never) => void }) => void) => {
          callback({ add: (tool) => tools.push(tool as unknown as (typeof tools)[number]) });
        },
      },
    } as unknown as Parameters<typeof adoPlugin.setup>[0];

    await adoPlugin.setup(context);

    expect(tools.length).toBeGreaterThan(20);
    expect(tools.every((tool) => tool.input.type === "object")).toBe(true);
    expect(tools.some((tool) => tool.name === "ado_pr_list")).toBe(true);
  });
});
