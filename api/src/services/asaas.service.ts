import axios from "axios";
import { ASAAS_API_KEY, ASAAS_BASE_URL } from "../config/env";

const api = axios.create({
  baseURL: ASAAS_BASE_URL,
  headers: { access_token: ASAAS_API_KEY },
});

export async function findOrCreateCustomer(
  email: string,
  name: string,
  cpfCnpj?: string,
): Promise<string> {
  const search = await api.get(`/customers?email=${encodeURIComponent(email)}`);
  const existing = search.data?.data?.[0];

  if (existing) {
    // Atualiza CPF/CNPJ se ainda não estiver cadastrado
    if (cpfCnpj && !existing.cpfCnpj) {
      try {
        await api.put(`/customers/${existing.id}`, { cpfCnpj });
      } catch (err: any) {
        console.warn(
          "Aviso: não foi possível atualizar CPF do cliente:",
          err?.response?.data ?? err?.message,
        );
      }
    }
    return existing.id as string;
  }

  const payload: Record<string, string> = { name, email };
  if (cpfCnpj) payload.cpfCnpj = cpfCnpj;
  const created = await api.post("/customers", payload);
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

  // Se há valor proporcional, cria a assinatura já com esse valor.
  // O Asaas gera o invoice/PIX com o valor de criação — atualizar depois
  // não altera o link já gerado. Após confirmação do pagamento, o controlador
  // atualiza a assinatura para o valor cheio (ciclos futuros).
  const billingValue = input.firstPaymentAmountBRL ?? input.amountBRL;

  const sub = await api.post("/subscriptions", {
    customer: input.customerId,
    billingType: "UNDEFINED",
    value: billingValue,
    nextDueDate,
    cycle: "MONTHLY",
    description: input.planName,
    externalReference: input.externalReference,
  });

  const subId: string = sub.data.id;

  // Asaas pode demorar alguns milissegundos para gerar a primeira cobrança
  // Tenta até 5x com espera de 800ms entre tentativas
  let firstPayment: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 800));
    const payments = await api.get(`/subscriptions/${subId}/payments`);
    firstPayment = payments.data?.data?.[0];
    if (firstPayment?.invoiceUrl || firstPayment?.bankSlipUrl) break;
  }

  const paymentUrl: string =
    firstPayment?.invoiceUrl ?? firstPayment?.bankSlipUrl ?? "";

  return { id: subId, paymentUrl };
}

// Atualiza o valor recorrente de uma assinatura Asaas (usado após o 1º pagamento proporcional)
export async function updateAsaasSubscriptionValue(
  subscriptionId: string,
  value: number,
): Promise<void> {
  await api.put(`/subscriptions/${subscriptionId}`, { value });
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
