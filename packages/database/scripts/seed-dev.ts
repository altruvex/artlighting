/**
 * Seeds the Neon **dev** branch with demo customers and orders so the admin
 * screens (orders, customers, server-side pagination, order detail) have
 * realistic data to work with. Never runs against production: the guard in
 * ../load-env refuses unless DATABASE_URL points somewhere else.
 *
 * Idempotent: it deletes the rows it created before (matched by the
 * DEV_EMAIL_DOMAIN below) and recreates them.
 *
 * Customers are created through Better Auth's own signup so they have a
 * usable password (DEV_CUSTOMER_PASSWORD below) — the ownership tests need
 * to sign in as them.
 *
 * Run: pnpm --filter @repo/database seed:dev
 */
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../load-env";

loadEnv(new URL("..", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("../index");
const { OrderStatus } = await import("../index");
const { addMoney, money, multiplyMoney } = await import("@repo/money");
const { betterAuth } = await import("better-auth");
const { prismaAdapter } = await import("better-auth/adapters/prisma");

/** Everything this script creates is tagged with this domain. */
const DEV_EMAIL_DOMAIN = "seed.dev.local";

/** Dev-only password for the seeded customers. Never used anywhere real. */
const DEV_CUSTOMER_PASSWORD = "dev-password-12345";

const CUSTOMERS = [
  {
    email: `mona.farouk@${DEV_EMAIL_DOMAIN}`,
    name: "Mona Farouk",
    phone: "+20 100 224 8831",
    language: "ar",
    address: {
      fullName: "Mona Farouk",
      address: "14 Abbas El Akkad, Nasr City",
      city: "Cairo",
      state: "Cairo",
      zipCode: "11765",
      country: "Egypt",
      countryCode: "EG",
      phoneNumber: "+20 100 224 8831",
    },
  },
  {
    email: `tarek.selim@${DEV_EMAIL_DOMAIN}`,
    name: "Tarek Selim",
    phone: "+20 122 907 4416",
    language: "en",
    address: {
      fullName: "Tarek Selim",
      address: "8 El Geish Road, Sidi Gaber",
      city: "Alexandria",
      state: "Alexandria",
      zipCode: "21523",
      country: "Egypt",
      countryCode: "EG",
      phoneNumber: "+20 122 907 4416",
    },
  },
];

/** 34 orders: enough to page through at 25 per page, spread across statuses. */
const STATUS_PLAN: { status: keyof typeof OrderStatus; count: number; completed: boolean }[] = [
  { status: "awaiting_shipment", count: 7, completed: true },
  { status: "processing", count: 6, completed: true },
  { status: "shipped", count: 5, completed: true },
  { status: "delivered", count: 8, completed: true },
  { status: "fulfilled", count: 3, completed: true },
  { status: "cancelled", count: 3, completed: true },
  { status: "refunded", count: 2, completed: true },
];

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9 + (days % 9), (days * 7) % 60, 0, 0);
  return date;
}

async function main() {
  console.log(`Seeding dev data into ${hostOf(databaseUrl())}`);

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    take: 12,
    orderBy: { productId: "asc" },
    select: {
      id: true,
      productId: true,
      productName: true,
      images: { select: { url: true }, orderBy: { order: "asc" } },
      price: true,
      brand: true,
      chandelierLightingType: true,
      productColor: true,
      productIp: true,
      productChandLamp: true,
    },
  });

  if (products.length === 0) throw new Error("No products in this database — nothing to build orders from.");

  // Clean up a previous run (orders first: they reference users and configurations).
  const existing = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEV_EMAIL_DOMAIN}` } },
    select: { id: true, orders: { select: { configurationId: true } } },
  });
  if (existing.length > 0) {
    const userIds = existing.map((user) => user.id);
    const configurationIds = existing
      .flatMap((user) => user.orders.map((order) => order.configurationId))
      .filter((id): id is string => Boolean(id));
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.shippingAddress.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (configurationIds.length > 0) {
      await prisma.configuration.deleteMany({ where: { id: { in: configurationIds } } });
    }
    console.log(`Removed ${existing.length} previously seeded customer(s) and their orders.`);
  }

  // Same shape as apps/web/src/lib/auth.ts, so the password hash is one the
  // storefront can verify. The secret only has to be present, not match the
  // app's, for hashing to work.
  const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    secret: process.env.BETTER_AUTH_SECRET ?? "dev-seed-secret-dev-seed-secret-32",
    emailAndPassword: { enabled: true },
  });

  const customers = [];
  for (const customer of CUSTOMERS) {
    await auth.api.signUpEmail({
      body: { email: customer.email, password: DEV_CUSTOMER_PASSWORD, name: customer.name },
    });
    const user = await prisma.user.update({
      where: { email: customer.email },
      data: {
        emailVerified: true,
        phoneNumber: customer.phone,
        preferredLanguage: customer.language,
        shippingAddress: { create: { ...customer.address, isDefault: true } },
      },
      include: { shippingAddress: true },
    });
    customers.push(user);
    console.log(`Customer: ${user.name} <${user.email}> (password: ${DEV_CUSTOMER_PASSWORD})`);
  }

  let created = 0;
  let index = 0;
  for (const plan of STATUS_PLAN) {
    for (let i = 0; i < plan.count; i += 1) {
      const product = products[index % products.length];
      const customer = customers[index % customers.length];
      const quantity = (index % 3) + 1;
      const shippingPrice = index % 4 === 0 ? 0 : 150;
      const configPrice = money(product.price);
      const totalPrice = addMoney(multiplyMoney(configPrice, quantity), shippingPrice);
      const placedAt = daysAgo(index * 2 + 1);

      const configuration = await prisma.configuration.create({
        data: {
          productId: product.productId,
          configPrice: configPrice.toFixed(2),
          quantity,
          totalPrice: totalPrice.toFixed(2),
          shippingPrice,
          productIp: product.productIp,
          createdAt: placedAt,
          updatedAt: placedAt,
        },
      });

      // A header and its line, as the storefront places orders now: the
      // product lives on the line, the totals on the header.
      const lineSubtotal = multiplyMoney(configPrice, quantity);
      await prisma.order.create({
        data: {
          userId: customer.id,
          subtotal: lineSubtotal.toFixed(2),
          discountTotal: "0.00",
          shippingPrice,
          totalPrice: totalPrice.toFixed(2),
          status: OrderStatus[plan.status],
          isCompleted: plan.completed,
          customerLanguage: customer.preferredLanguage,
          createdAt: placedAt,
          updatedAt: placedAt,
          orderTimeReceived: plan.status === "delivered" ? daysAgo(index * 2 - 2) : null,
          configurationId: configuration.id,
          // The order's own address link; User.shippingAddressId is a separate
          // legacy column that a nested create does not populate.
          shippingAddressId: customer.shippingAddress?.id ?? null,
          orderItems: {
            create: {
              productId: product.id,
              quantity,
              configPrice: configPrice.toFixed(2),
              configurationId: configuration.id,
              productName: product.productName,
              productImages: product.images.map((image) => image.url),
              brand: product.brand,
              productIp: product.productIp,
              productColorTemp: product.productColor,
              discountAmount: "0.00",
              lineTotal: lineSubtotal.toFixed(2),
            },
          },
        },
      });

      created += 1;
      index += 1;
    }
  }

  const byStatus = await prisma.order.groupBy({ by: ["status"], _count: { _all: true } });
  console.log(`Created ${created} orders:`);
  for (const group of byStatus) console.log(`  ${group.status}: ${group._count._all}`);
}

await main();
await prisma.$disconnect();
