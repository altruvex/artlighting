"use server";

import { cloudinary } from "@/lib/cloudinary";
import { requirePermission } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { ActionError, run } from "./result";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  productImageFolder,
  type UploadSignature,
} from "@/lib/uploads.shared";

/**
 * Signed direct uploads.
 *
 * The old path read the whole file into a Server Action, base64'd it and
 * posted it to Cloudinary from the server: roughly 1.37× the bytes over the
 * wire twice, through a request body limit that a large photo can exceed,
 * with no progress to show the admin. Here the server only signs the
 * parameters and the browser uploads straight to Cloudinary.
 *
 * The signature covers the folder and the upload preset-ish parameters, so
 * a signature handed out for one product cannot be replayed to write
 * somewhere else in the account. It is short-lived: Cloudinary rejects a
 * timestamp older than an hour.
 */
export async function signProductImageUpload(sku: string): Promise<
  Awaited<ReturnType<typeof run<UploadSignature>>>
> {
  return run(async () => {
    await requirePermission("product:write");
    const t = await getTranslations("ProductActions");

    const cloudName = process.env.CLOUD_NAME;
    const apiKey = process.env.CLOUD_API_KEY;
    const apiSecret = process.env.CLOUD_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ActionError(t("errors.uploadNotConfigured"));
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
      folder: productImageFolder(sku),
      timestamp,
    };

    // Signed by the server, so the browser cannot widen the folder or any
    // other signed parameter without invalidating the signature.
    const signature = cloudinary.utils.api_sign_request(params, apiSecret);

    return {
      cloudName,
      apiKey,
      timestamp,
      folder: params.folder,
      signature,
      maxBytes: MAX_IMAGE_BYTES,
      allowedTypes: [...ALLOWED_IMAGE_TYPES],
    };
  });
}
