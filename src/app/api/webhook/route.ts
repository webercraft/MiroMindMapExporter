// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { Event as StripeWebhookEvent } from 'stripe/cjs/resources/Events.js';
import type { Subscription as StripeSubscription } from 'stripe/cjs/resources/Subscriptions.js';
import { supabase } from '../../../utils/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-03-25.dahlia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_ENDPOINT_SECRET as string;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let stripeEvent: StripeWebhookEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new NextResponse(
      `Webhook Error: ${err instanceof Error ? err.message : err}`,
      { status: 400 }
    );
  }

  // Handle checkout.session.completed
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    const user_id = session.client_reference_id;
    const email = session.customer_details?.email ?? null;

    const { error } = await supabase.from(process.env.UserTable!).upsert(
      {
        hasPaid: true,
        user_id: user_id,
        email: email,
        stripe_json: session,           // you can store the whole session if needed
        customer_id: session.customer as string | null,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Supabase upsert error (checkout completed):', error);
    }
  }

  // Handle customer.subscription.deleted
  else if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object as StripeSubscription;

    const { error } = await supabase
      .from(process.env.UserTable!)
      .update({ hasPaid: false })
      .eq('customer_id', subscription.customer);

    if (error) {
      console.error('Supabase update error (subscription deleted):', error);
    }
  }

  // You can add more events here (e.g. customer.subscription.updated, invoice.payment_succeeded, etc.)

  return NextResponse.json({ received: true });
}