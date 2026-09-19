import { createWriteStream } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import archiver from "archiver";

export interface BuiltFile {
  name: string;
  buffer: Buffer;
}

/** Zips the given files to a temp path and returns it. Always zips, even a single file, for one predictable download shape. */
export async function zipFiles(jobId: string, files: BuiltFile[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "datasheet-bulk-"));
  const zipPath = join(dir, `${jobId}.zip`);

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    for (const file of files) archive.append(file.buffer, { name: file.name });
    void archive.finalize();
  });

  return zipPath;
}
