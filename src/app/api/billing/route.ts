import { getUserIdFromRequest } from "../../../utils/user";
import { NextResponse } from "next/server";
import { supabase } from '../../../utils/supabase';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2026-03-25.dahlia',
});

export async function GET() {

    const userId = getUserIdFromRequest();

    const { data } = await supabase
        .from(process.env.UserTable!)
        .select('*')
        .eq('user_id', userId!.user)

    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: data ? data[0].stripe_json.customer:null,
            return_url: 'https://example.com/account',
        });
        if (session) {
            return NextResponse.json({
                status: 200,
                message: 'stripe billing portal session created successfully.',
                data: session,
            });
        }
        return NextResponse.json({
            status: 200,
            message: 'ISSUE WITH STRIPE.',
            data: null,
        });
    } catch (error) {
        console.log(error)
        return NextResponse.json({
            status: 400,
            message: 'EXCEPTION .',
            data: error,
        });
    }
}
