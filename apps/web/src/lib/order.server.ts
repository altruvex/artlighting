import type { Order, ShippingAddress } from "@/types/products";
import { prisma } from "@repo/database";

export interface CreateOrderDTO {
    userId: string;
    productId: string;
    productName: string;
    productImages: string[];
    quantity: number;
    configPrice: number;
    productPrice: number;
    totalPrice: number;
    shippingMethod: string;
    shippingPrice: number;
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

        const discountRate = product.discount;
        const discountedPrice = discountRate > 0
            ? Math.ceil(dto.configPrice * (1 - discountRate))
            : dto.configPrice;

        return prisma.order.create({
            data: {
                user: { connect: { id: dto.userId } },
                configuration: { connect: { id: dto.configurationId } },
                product: { connect: { id: dto.productId } },
                quantity: dto.quantity,
                productPrice: dto.productPrice,
                discountRate,
                discountedPrice,
                discountApplied: discountRate > 0,
                totalPrice: dto.totalPrice,
                productName: dto.productName,
                productImages: dto.productImages,
                shippingPrice: dto.shippingPrice,
                status: "awaiting_shipment",
                shippingAddress: { connect: { id: shippingAddress.id } },
                productColorTemp: product.productColor || "warm",
                productIp: product.productIp || "IP20",
                productChandLamp: product.productChandLamp || "lamp9w",
                brand: product.brand,
                chandelierLightingType: product.chandelierLightingType,
                configPrice: dto.configPrice,
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

        if (!order) {
            throw new Error("Order not found or unauthorized");
        }

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