import { spawn } from "node:child_process";

export class ExternalToolError extends Error {
  constructor(
    message: string,
    public readonly tool: string,
  ) {
    super(message);
    this.name = "ExternalToolError";
  }
}

/** Runs an external CLI tool, collecting stdout/stderr. Rejects on non-zero exit or timeout. */
export function runCommand(
  bin: string,
  args: string[],
  opts?: { timeoutMs?: number },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      reject(new ExternalToolError(`Failed to launch ${bin}: ${(err as Error).message}`, bin));
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = opts?.timeoutMs
      ? setTimeout(() => {
          if (settled) return;
          settled = true;
          child.kill("SIGKILL");
          reject(new ExternalToolError(`${bin} timed out after ${opts.timeoutMs}ms`, bin));
        }, opts.timeoutMs)
      : null;

    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      const notFound = (err as NodeJS.ErrnoException).code === "ENOENT";
      reject(
        new ExternalToolError(
          notFound
            ? `${bin} is not installed or not on PATH`
            : `Failed to run ${bin}: ${err.message}`,
          bin,
        ),
      );
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new ExternalToolError(
            `${bin} exited with code ${code}: ${stderr.trim().slice(-2000) || "(no stderr output)"}`,
            bin,
          ),
        );
      }
    });
  });
}

/** Checks whether a CLI tool is actually installed and runnable, e.g. to pick a fallback strategy. */
export async function commandExists(bin: string, opts?: { timeoutMs?: number }): Promise<boolean> {
  try {
    await runCommand(bin, ["--version"], { timeoutMs: opts?.timeoutMs ?? 5000 });
    return true;
  } catch {
    return false;
  }
}
