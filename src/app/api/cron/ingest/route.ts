import { NextRequest } from "next/server";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

const execFile = promisify(execFileCb);

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const started = Date.now();
  try {
    const script = join(process.cwd(), "ingest", "run.ts");
    const { stdout } = await execFile("npx", ["tsx", script], {
      maxBuffer: 64 * 1024 * 1024,
      env: process.env,
    });
    return Response.json({
      ok: true,
      durationMs: Date.now() - started,
      tail: stdout.split("\n").slice(-20).join("\n"),
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export const maxDuration = 300;
