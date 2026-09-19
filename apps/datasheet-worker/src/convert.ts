import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SOFFICE_BIN = process.env.SOFFICE_BIN ?? "soffice";
const CONVERT_TIMEOUT_MS = 60_000;

export class ConversionError extends Error {}

/**
 * Converts a PPTX buffer to PDF via LibreOffice headless. Each call gets its
 * own temp dir AND its own isolated LibreOffice user profile
 * (-env:UserInstallation) — LibreOffice headless shares a single
 * profile/lock directory by default, and overlapping conversions without
 * isolated profiles is a known source of hangs/corruption. Cheap to do now,
 * protects a future concurrent/batch conversion mode.
 */
export async function runConversion(pptxBuffer: Buffer): Promise<Buffer> {
  const workDir = await mkdtemp(join(tmpdir(), "datasheet-"));
  const profileDir = join(tmpdir(), `lo-profile-${randomUUID()}`);
  const inputPath = join(workDir, "input.pptx");
  const outputPath = join(workDir, "input.pdf");

  try {
    await writeFile(inputPath, pptxBuffer);

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        SOFFICE_BIN,
        [
          "--headless",
          "--nologo",
          "--nofirststartwizard",
          `-env:UserInstallation=file://${profileDir}`,
          "--convert-to",
          "pdf",
          "--outdir",
          workDir,
          inputPath,
        ],
        { timeout: CONVERT_TIMEOUT_MS }
      );

      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new ConversionError(`soffice exited with code ${code}: ${stderr}`));
      });
    });

    return await readFile(outputPath);
  } catch (err) {
    if (err instanceof ConversionError) throw err;
    throw new ConversionError(err instanceof Error ? err.message : String(err));
  } finally {
    await rm(workDir, { recursive: true, force: true });
    await rm(profileDir, { recursive: true, force: true });
  }
}
