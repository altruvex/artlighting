/**
 * Seeds the Neon **dev** branch with demo customers and orders so the admin
 * screens (orders, customers, server-side pagination, order detail) have
 * realistic data to work with. Never runs against production: the guard in
 * ../load-env refuses unless DATABASE_URL points somewhere else.
 *
 * Idempotent: it deletes the rows it created before (matched by the
 * DEV_EMAIL_DOMAIN below) and recreates them.
 *
 * Run: pnpm --filter @repo/database seed:dev
 */
import { assertNotProduction, databaseUrl, hostOf, loadEnv } from "../load-env";

loadEnv(new URL("..", import.meta.url).pathname);
assertNotProduction();

const { prisma } = await import("../index");
const { OrderStatus } = await import("../index");

/** Everything this script creates is tagged with this domain. */
const DEV_EMAIL_DOMAIN = "seed.dev.local";

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
      productImages: true,
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

  const customers = [];
  for (const customer of CUSTOMERS) {
    const user = await prisma.user.create({
      data: {
        email: customer.email,
        name: customer.name,
        emailVerified: true,
        phoneNumber: customer.phone,
        preferredLanguage: customer.language,
        shippingAddress: { create: { ...customer.address, isDefault: true } },
      },
      include: { shippingAddress: true },
    });
    customers.push(user);
    console.log(`Customer: ${user.name} <${user.email}>`);
  }

  let created = 0;
  let index = 0;
  for (const plan of STATUS_PLAN) {
    for (let i = 0; i < plan.count; i += 1) {
      const product = products[index % products.length];
      const customer = customers[index % customers.length];
      const quantity = (index % 3) + 1;
      const shippingPrice = index % 4 === 0 ? 0 : 150;
      const configPrice = product.price;
      const totalPrice = configPrice * quantity + shippingPrice;
      const placedAt = daysAgo(index * 2 + 1);

      const configuration = await prisma.configuration.create({
        data: {
          productId: product.productId,
          configPrice,
          quantity,
          totalPrice,
          shippingPrice,
          productIp: product.productIp,
          createdAt: placedAt,
          updatedAt: placedAt,
        },
      });

      await prisma.order.create({
        data: {
          userId: customer.id,
          productId: product.id,
          productName: product.productName,
          productImages: product.productImages,
          productColorTemp: product.productColor,
          productIp: product.productIp,
          productChandLamp: product.productChandLamp,
          brand: product.brand,
          chandelierLightingType: product.chandelierLightingType,
          quantity,
          productPrice: product.price,
          configPrice,
          shippingPrice,
          totalPrice,
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
