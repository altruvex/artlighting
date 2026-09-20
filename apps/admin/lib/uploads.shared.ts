/**
 * Shared between the signing action and the browser that uses the
 * signature, so the two cannot disagree about what is allowed.
 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

/** Where a product's images live in the Cloudinary account. */
export function productImageFolder(sku: string): string {
  return `products/${sku}`;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  maxBytes: number;
  allowedTypes: string[];
}

/** What Cloudinary returns for a successful upload, narrowed to what we store. */
export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}
