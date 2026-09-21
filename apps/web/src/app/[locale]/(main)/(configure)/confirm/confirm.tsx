"use client"

import { submitShippingAddress } from "@/actions/checkout"
import { Container } from "@/components/container"
import CustomInput from "@/components/custom-input"
import { OrderLines, OrderTotals } from "@/components/order/order-lines"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { useRouter } from "@/i18n/navigation"
import type { OrderView } from "@/lib/order-view"
import { authFormConfirmingOrderSchema } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"

type AddressForm = z.infer<typeof authFormConfirmingOrderSchema>

/**
 * The address step, for an order already placed.
 *
 * Submitting this posted a whole second order to /api/orders — with the
 * price the browser had worked out — and moved the customer on to that
 * one, leaving the first behind. It saves the address onto this order and
 * nothing else; every figure on the page is the one the order was placed at.
 */
export default function Confirm({ order, prefill }: { order: OrderView; prefill: AddressForm }) {
  const t = useTranslations("confirm")
  const tOrder = useTranslations("order")
  const router = useRouter()
  const [isSubmitting, startSubmit] = useTransition()

  const form = useForm<AddressForm>({
    resolver: zodResolver(authFormConfirmingOrderSchema),
    defaultValues: prefill,
  })

  const onSubmit = (data: AddressForm) =>
    startSubmit(async () => {
      const result = await submitShippingAddress(order.id, data)
      if (!result.ok) {
        toast.error(t("errors.orderProcessingFailed"), { description: tOrder(`errors.${result.error}`) })
        return
      }
      router.push(`/complete?orderId=${order.id}`)
    })

  return (
    <div className="py-8 md:py-12">
      <Container>
        <header className="mb-8 space-y-2">
          <h1 className="font-[family-name:var(--font-display-face)] text-[length:var(--text-3xl)] font-semibold">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <div className="space-y-8">
            <OrderLines lines={order.lines} />

            <section
              aria-labelledby="shipping-heading"
              className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6"
            >
              <h2 id="shipping-heading" className="mb-6 font-semibold">
                {t("shippingInfo.title")}
              </h2>
              <Form {...form}>
                <form id="address-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomInput
                      control={form.control}
                      name="fullName"
                      label={t("shippingInfo.fullName.label")}
                      placeholder={t("shippingInfo.fullName.placeholder")}
                      type="text"
                      required
                    />
                    <CustomInput
                      control={form.control}
                      name="phoneNumber"
                      label={t("shippingInfo.phoneNumber.label")}
                      placeholder={t("shippingInfo.phoneNumber.placeholder")}
                      type="tel"
                      required
                    />
                  </div>
                  <CustomInput
                    control={form.control}
                    name="address"
                    label={t("shippingInfo.address.label")}
                    placeholder={t("shippingInfo.address.placeholder")}
                    type="text"
                    required
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomInput
                      control={form.control}
                      name="city"
                      label={t("shippingInfo.city.label")}
                      placeholder={t("shippingInfo.city.placeholder")}
                      type="text"
                      required
                    />
                    <CustomInput
                      control={form.control}
                      name="state"
                      label={t("shippingInfo.state.label")}
                      placeholder={t("shippingInfo.state.placeholder")}
                      type="text"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomInput
                      control={form.control}
                      name="zipCode"
                      label={t("shippingInfo.zipCode.label")}
                      placeholder={t("shippingInfo.zipCode.placeholder")}
                      type="text"
                    />
                    <CustomInput
                      control={form.control}
                      name="country"
                      label={t("shippingInfo.country.label")}
                      placeholder={t("shippingInfo.country.placeholder")}
                      type="text"
                      required
                    />
                  </div>
                </form>
              </Form>
            </section>
          </div>

          <OrderTotals order={order}>
            <Button type="submit" form="address-form" disabled={isSubmitting} className="h-12 w-full text-base font-semibold">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  {t("buttons.processingOrder")}
                </>
              ) : (
                <>
                  <CheckCircle className="size-5" aria-hidden />
                  {t("buttons.completeOrder")}
                </>
              )}
            </Button>
          </OrderTotals>
        </div>
      </Container>
    </div>
  )
}
