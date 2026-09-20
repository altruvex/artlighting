// apps/web/src/app/[locale]/api/pricing/validate/route.ts
import { PricingService } from "@/lib/pricing.server";
import { applyRateLimit } from "@/middleware/ratelimit";
import { auth } from "@/lib/auth-server";
import { ownsConfiguration, readGuestToken } from "@/lib/guest-token";
import { prisma } from "@repo/database";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ValidatePricingSchema = z.object({
  configurationId: z.string().min(1),
  quantity: z.number().int().positive().optional(),
});

/**
 * Server-side price validation endpoint
 * CRITICAL: All pricing must be validated server-side to prevent manipulation
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, "api");
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { configurationId, quantity } = ValidatePricingSchema.parse(body);

    // Fetch configuration from database
    const configuration = await prisma.configuration.findUnique({
      where: { id: configurationId },
    });

    // Ownership: a configuration belonging to another customer answers like
    // one that doesn't exist, so ids can't be probed. An unclaimed
    // (anonymous) configuration is readable — the owner is recorded on the
    // first authenticated write.
    //
    // This previously checked Configuration.users, a relation fed by
    // User.configurationId, which was never written for any user: the check
    // rejected everyone, so this endpoint always answered 403.
    const guestToken = await readGuestToken();
    if (!configuration || !ownsConfiguration(configuration, { userId, guestToken })) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    // Only the price: the rate the order was quoted at is the snapshot on
    // the configuration, not something read off the product row.
    const product = await prisma.product.findUnique({
      where: { id: configuration.productId },
      select: { price: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Calculate pricing server-side (AUTHORITATIVE)
    const actualQuantity = quantity || configuration.quantity;
    const pricing = PricingService.calculateOrderPricing(
      configuration.configPrice,
      configuration.totalPrice,
      actualQuantity,
      configuration.discount,
      configuration.shippingPrice
    );

    return NextResponse.json({
      validated: true,
      pricing,
      configurationId,
      productId: configuration.productId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    console.error("Error validating pricing:", error);
    return NextResponse.json(
      { error: "Failed to validate pricing" },
      { status: 500 }
    );
  }
}
