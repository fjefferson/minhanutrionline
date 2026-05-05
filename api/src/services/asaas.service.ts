import axios from "axios";
import { ASAAS_API_KEY, ASAAS_BASE_URL } from "../config/env";

const api = axios.create({
  baseURL: ASAAS_BASE_URL,
  headers: { access_token: ASAAS_API_KEY },
});

export async function findOrCreateCustomer(
  email: string,
  name: string,
): Promise<string> {
  const search = await api.get(`/customers?email=${encodeURIComponent(email)}`);
  const existing = search.data?.data?.[0];
  if (existing) return existing.id as string;

  const created = await api.post("/customers", { name, email });
  return created.data.id as string;
}

export interface AsaasSubscriptionInput {
  customerId: string;
  planName: string;
  amountBRL: number;
  externalReference: string;
  firstPaymentAmountBRL?: number; // valor proporcional para a 1ª cobrança (upgrade)
}

export async function createAsaasSubscription(
  input: AsaasSubscriptionInput,
): Promise<{ id: string; paymentUrl: string }> {
  const nextDueDate = new Date().toISOString().split("T")[0];

  const sub = await api.post("/subscriptions", {
    customer: input.customerId,
    billingType: "CREDIT_CARD",
    value: input.amountBRL,
    nextDueDate,
    cycle: "MONTHLY",
    description: input.planName,
    externalReference: input.externalReference,
  });

  const subId: string = sub.data.id;

  // Pega a primeira cobrança gerada para obter o link de pagamento hosted
  const payments = await api.get(`/subscriptions/${subId}/payments`);
  const firstPayment = payments.data?.data?.[0];
  const paymentUrl: string =
    firstPayment?.invoiceUrl ?? firstPayment?.bankSlipUrl ?? "";

  // Se valor proporcional foi informado, atualiza o 1º pagamento antes de ser pago
  if (
    firstPayment?.id &&
    input.firstPaymentAmountBRL !== undefined &&
    Math.abs(input.firstPaymentAmountBRL - input.amountBRL) > 0.01
  ) {
    try {
      await api.put(`/payments/${firstPayment.id}`, {
        value: input.firstPaymentAmountBRL,
      });
    } catch (err: any) {
      console.warn(
        "Aviso: não foi possível aplicar desconto proporcional no 1º pagamento:",
        err?.response?.data ?? err?.message,
      );
      // Não bloqueia o fluxo — continua com o valor cheio
    }
  }

  return { id: subId, paymentUrl };
}

export async function getAsaasSubscription(id: string) {
  const res = await api.get(`/subscriptions/${id}`);
  return res.data;
}

export async function cancelAsaasSubscription(
  subscriptionId: string,
): Promise<void> {
  await api.delete(`/subscriptions/${subscriptionId}`);
}

export async function getAsaasSubscriptionPaymentStatus(
  subscriptionId: string,
): Promise<"ACTIVE" | "PENDING" | "CANCELED" | "PAST_DUE"> {
  const res = await api.get(`/subscriptions/${subscriptionId}/payments`);
  const payments: { status: string }[] = res.data?.data ?? [];
  const confirmed = payments.some(
    (p) => p.status === "CONFIRMED" || p.status === "RECEIVED",
  );
  if (confirmed) return "ACTIVE";
  const overdue = payments.some((p) => p.status === "OVERDUE");
  if (overdue) return "PAST_DUE";
  return "PENDING";
}
