import { getUserIdFromRequest } from '../../../utils/user';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { priceId } = await req.json();

  if (!priceId) {
    return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
  }

  // Look up existing customer from DB
  const { data } = await supabase
    .from(process.env.UserTable!)
    .select('stripe_json')
    .eq('user_id', userId.user)
    .single();

  const customerId: string | undefined = data?.stripe_json?.customer;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}?upgrade=cancel`,
      metadata: { userId: userId.user },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
