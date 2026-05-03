import MercadoPago, { PreApproval } from "mercadopago";
import { MP_ACCESS_TOKEN, MP_BACK_URL, MP_TEST_PAYER_EMAIL, NODE_ENV } from "../config/env";

const client = new MercadoPago({ accessToken: MP_ACCESS_TOKEN });
const preApproval = new PreApproval(client);

export interface SubscriptionInput {
  payerEmail: string;
  planName: string;
  amountBRL: number;
}

export async function createMpSubscription(input: SubscriptionInput) {
  const isDev = NODE_ENV !== "production";
  const payerEmail = isDev && MP_TEST_PAYER_EMAIL ? MP_TEST_PAYER_EMAIL : input.payerEmail;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await preApproval.create({ body: {
    reason: input.planName,
    payer_email: payerEmail,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: input.amountBRL,
      currency_id: "BRL",
    },
    back_url: MP_BACK_URL,
    status: "pending",
  } } as any);
  return result;
}

export async function getMpSubscription(id: string) {
  return preApproval.get({ id });
}
