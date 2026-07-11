// Shared Razorpay Checkout helper for wallet top-ups.
// Handles: script loading, create-order → checkout → verify-payment.
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay?: any;
  }
}


let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Window unavailable"));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Razorpay Checkout"));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export interface TopUpUserInfo {
  name?: string | null;
  email?: string | null;
  contact?: string | null;
}

export interface TopUpResult {
  success: boolean;
  amount: number;
  new_balance: number;
}

/**
 * Start a Razorpay wallet top-up. Resolves ONLY after backend verification
 * succeeds and the wallet has been credited server-side.
 */
export async function startWalletTopUp(
  amount: number,
  user?: TopUpUserInfo,
): Promise<TopUpResult> {
  if (!(amount >= 500)) throw new Error("Minimum top-up is ₹500");

  await loadRazorpayScript();

  // 1. Create order on backend
  const { data: orderData, error: orderErr } = await supabase.functions.invoke(
    "wallet-create-order",
    { body: { amount } },
  );
  if (orderErr) throw new Error(orderErr.message || "Failed to create payment order");
  if (!orderData?.order_id || !orderData?.key_id) {
    throw new Error(orderData?.error || "Invalid order response");
  }

  // 2. Open Razorpay Checkout
  return new Promise<TopUpResult>((resolve, reject) => {
    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: "JaagaX Wallet",
      description: `Wallet Top-up ₹${amount.toLocaleString("en-IN")}`,
      order_id: orderData.order_id,
      prefill: {
        name: user?.name ?? undefined,
        email: user?.email ?? undefined,
        contact: user?.contact ?? undefined,
      },
      theme: { color: "#10b981" },
      handler: async (resp: any) => {
        try {
          const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
            "wallet-verify-payment",
            {
              body: {
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              },
            },
          );
          if (verifyErr) throw new Error(verifyErr.message || "Verification failed");
          if (!verifyData?.success) throw new Error(verifyData?.error || "Verification failed");
          resolve({
            success: true,
            amount: Number(verifyData.amount ?? amount),
            new_balance: Number(verifyData.new_balance ?? 0),
          });
        } catch (e: any) {
          reject(new Error(e?.message || "Payment verification failed"));
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (resp: any) => {
      reject(new Error(resp?.error?.description || "Payment failed"));
    });
    rzp.open();
  });
}
