// Runs a bench file of this resource: Bun cannot read the tsconfig path aliases under a folder named "[ai]", so the
// bench is bundled first with `common/*` resolved here (`bun bench/run.ts inventory`).
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const name = process.argv[2] ?? "inventory";
const result = await Bun.build({
  entrypoints: [join(import.meta.dir, `${name}.bench.ts`)],
  target: "bun",
  outdir: join(import.meta.dir, ".out"),
  plugins: [
    {
      name: "aliases",
      setup(build) {
        build.onResolve({ filter: /^common(\/.*)?$/ }, (args) => ({ path: join(root, "resource", args.path === "common" ? "common/index.ts" : `${args.path}.ts`) }));
      },
    },
  ],
});
if (!result.success) throw new AggregateError(result.logs, "bench build failed");
await import(join(import.meta.dir, ".out", `${name}.bench.js`));
