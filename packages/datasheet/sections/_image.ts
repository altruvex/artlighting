import type { ImageRef } from "../types";

/** Maps our ImageRef union onto pptxgenjs's own path/data union. */
export function imagePropsFor(ref: ImageRef): { path?: string; data?: string } {
  return ref.kind === "path" ? { path: ref.path } : { data: ref.dataUri };
}
