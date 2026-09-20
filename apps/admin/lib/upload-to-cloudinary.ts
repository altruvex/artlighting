import type { UploadSignature } from "@/lib/uploads.shared";

/**
 * Uploads one file straight from the browser to Cloudinary using a
 * signature the server issued.
 *
 * XMLHttpRequest rather than fetch: `fetch` still has no upload progress
 * event, and a 6MB photo on a slow connection with no progress bar looks
 * like a broken page.
 */
export function uploadToCloudinary(
  file: File,
  signature: UploadSignature,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<{ publicId: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.set("file", file);
    form.set("api_key", signature.apiKey);
    form.set("timestamp", String(signature.timestamp));
    form.set("folder", signature.folder);
    form.set("signature", signature.signature);

    const request = new XMLHttpRequest();
    request.open("POST", `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`);

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    });

    request.addEventListener("load", () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`Cloudinary responded ${request.status}`));
        return;
      }
      try {
        const body = JSON.parse(request.responseText) as { public_id?: string };
        if (!body.public_id) throw new Error("No public_id in the response");
        // Only the id travels back: the server re-reads the asset from
        // Cloudinary, so nothing the browser claims about it is trusted.
        resolve({ publicId: body.public_id });
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Malformed Cloudinary response"));
      }
    });

    request.addEventListener("error", () => reject(new Error("Network error uploading to Cloudinary")));
    request.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    signal?.addEventListener("abort", () => request.abort(), { once: true });

    request.send(form);
  });
}
