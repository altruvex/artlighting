import type { Order, ShippingAddress } from "@/types/products";
import { applyRate, money, serializeMoney, serializeRate, subtractMoney, type MoneyInput } from "@repo/money";
import { prisma } from "@repo/database";
import { computePricing } from "@repo/pricing";
import { discountsForCart, toCartLine } from "@repo/catalog";

export interface CreateOrderDTO {
    userId: string;
    productId: string;
    productName: string;
    productImages: string[];
    quantity: number;
    configPrice: MoneyInput;
    productPrice: MoneyInput;
    totalPrice: MoneyInput;
    shippingMethod: string;
    shippingPrice: MoneyInput;
    configurationId: string;
    shippingAddress: {
        fullName: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        phoneNumber: string;
    };
}

export class OrderService {
    static async createOrder(dto: CreateOrderDTO): Promise<Order> {
        const product = await prisma.product.findUnique({
            where: { id: dto.productId },
        });

        if (!product) {
            throw new Error("Product not found");
        }

        const shippingAddress = await this.upsertShippingAddress(dto.userId, dto.shippingAddress);

        // What the customer actually chose, taken from the configuration they
        // are checking out. productChandLamp below is the product's unused
        // default and says "9 W" for every order ever placed.
        const configuration = await prisma.configuration.findUnique({
            where: { id: dto.configurationId },
            select: { bulbId: true },
        });

        // Priced by the engine, not by a rate on the product row — the same
        // function the storefront displays from and the admin previews with.
        const rules = await discountsForCart(null, prisma);
        const priced = computePricing({
            lines: [toCartLine(product, { unitPrice: serializeMoney(dto.configPrice) })],
            discounts: rules,
            now: new Date(),
        });
        const discountRate = money(priced.subtotal).isZero()
            ? money(0)
            : money(priced.discountTotal).dividedBy(priced.subtotal);
        const discountedPrice = money(priced.lines[0]?.total ?? dto.configPrice);

        return prisma.order.create({
            data: {
                user: { connect: { id: dto.userId } },
                configuration: { connect: { id: dto.configurationId } },
                product: { connect: { id: dto.productId } },
                quantity: dto.quantity,
                productPrice: serializeMoney(dto.productPrice),
                discountRate: serializeRate(discountRate),
                discountedPrice: serializeMoney(discountedPrice),
                discountApplied: discountRate.greaterThan(0),
                totalPrice: serializeMoney(dto.totalPrice),
                productName: dto.productName,
                productImages: dto.productImages,
                shippingPrice: serializeMoney(dto.shippingPrice),
                status: "awaiting_shipment",
                shippingAddress: { connect: { id: shippingAddress.id } },
                productColorTemp: product.productColor || "warm",
                productIp: product.productIp || "IP20",
                productChandLamp: product.productChandLamp || "lamp9w",
                ...(configuration?.bulbId ? { bulb: { connect: { id: configuration.bulbId } } } : {}),
                brand: product.brand,
                chandelierLightingType: product.chandelierLightingType,
                configPrice: serializeMoney(dto.configPrice),
            },
        }) as any as Order;
    }

    private static async upsertShippingAddress(
        userId: string,
        addressData: CreateOrderDTO["shippingAddress"]
    ): Promise<ShippingAddress> {
        return prisma.shippingAddress.upsert({
            where: { userId },
            update: addressData,
            create: {
                userId,
                ...addressData,
            },
        });
    }

    /**
     * The caller's own order, or null. Scoped by userId: another customer's
     * order is indistinguishable from one that doesn't exist, so callers
     * answer 404 for both and order ids can't be probed.
     */
    static async getOrderWithDetails(orderId: number, userId: string, locale: string = "ar") {
        const order = await prisma.order.findFirst({
            where: { id: orderId, userId },
            include: {
                shippingAddress: true,
                product: {
                    include: {
                        specifications: { where: { language: locale } },
                        translations: { where: { language: locale } },
                    },
                },
                user: true,
                configuration: true,
            },
        });

        return order;
    }

    /**
     * Marks the caller's own order as completed. Scoped by userId so a customer
     * can never complete someone else's order; returns null when the order
     * doesn't exist or belongs to another user (callers answer 404 for both,
     * so order ids can't be probed).
     */
    static async completeOrder(orderId: number, userId: string): Promise<Order | null> {
        const { count } = await prisma.order.updateMany({
            where: { id: orderId, userId },
            data: { isCompleted: true },
        });
        if (count === 0) return null;

        return prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true, shippingAddress: true },
        }) as any as Order;
    }
}