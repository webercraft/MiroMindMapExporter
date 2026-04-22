import { getUserIdFromRequest } from "../../../utils/user";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from '../../../utils/supabase';

export async function GET() {
  console.log('API called at:', new Date().toISOString());

  const userId = await getUserIdFromRequest();
  // console.log("get user udgg   here")
  // console.log(userId)
  if (userId && userId!.user!) {
    const { data, error } = await supabase
      .from(process.env.UserTable!)
      .select('*')
      .eq('user_id', userId!.user)

    if (!data || data.length == 0) {
      // console.log("data check")
      const { data } = await supabase.from(process.env.UserTable!).upsert({
        user_id: userId!.user,
        used_credits: 3,
        total_credits: 3,
      }).select()
      await supabase.from(process.env.TeamTable!).upsert({
        user_id: userId!.user,
        team_id: userId!.team,
      })
      const id = data?.[0]["id"] ? data[0]["id"] : "error";

      if (error) {
        return NextResponse.json({ userId: userId!.user, record: {}, traildays: 0, used_credits: 3, total_credits: 3 });
      } else {
        return NextResponse.json({ userId: userId!.user, record: data, traildays: 0, used_credits: data?.[0]?.used_credits ?? 3, total_credits: data?.[0]?.total_credits ?? 3 });
      }
    }

    // if (userId!.team) {
    //   const { data, error } = await supabase
    //     .from(process.env.TeamTable!)
    //     .select('*')
    //     .eq('team_id', userId!.team)

    //     if(error){
    //       console.log(error)
    //     }
    //   if (!data || data.length == 0) {
    //     await supabase.from(process.env.TeamTable!).upsert({
    //       user_id: userId!.user,
    //       team_id: userId!.team
    //     })
    //   }
    // }



    const createdDate = data?.[0]?.created_at ? new Date(data[0].created_at) : new Date();
    const todayDate = new Date();

    const daysDifference = calculateDayDifference(createdDate, todayDate);

    if (error) {
      return NextResponse.json({ userId: userId!.user, record: {}, traildays: 0, used_credits: 0, total_credits: 0 });
    } else {
      return NextResponse.json({ userId: userId!.user, record: data, traildays: daysDifference, used_credits: data?.[0]?.used_credits ?? 0, total_credits: data?.[0]?.total_credits ?? 0 });
    }
  } else {
    return NextResponse.json({ userId: 0, record: {}, traildays: 0, used_credits: 0, total_credits: 0 });

  }

}

// POST: decrement used_credits by 1 after an export or import action
export async function POST(_req: NextRequest) {
  const userId = getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from(process.env.UserTable!)
    .select('used_credits, total_credits')
    .eq('user_id', userId.user)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (data.used_credits <= 0) {
    return NextResponse.json({ error: 'No credits remaining', used_credits: 0, total_credits: data.total_credits }, { status: 403 });
  }

  const { data: updated, error: updateError } = await supabase
    .from(process.env.UserTable!)
    .update({ used_credits: data.used_credits - 1 })
    .eq('user_id', userId.user)
    .select('used_credits, total_credits')
    .single();

  if (updateError || !updated) {
    console.error('Credit update error:', updateError);
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
  }

  return NextResponse.json({ used_credits: updated.used_credits, total_credits: updated.total_credits });
}

function calculateDayDifference(timestamp1: string | number | Date, timestamp2: string | number | Date) {
  // Create Date objects from timestamps
  const date1 = new Date(timestamp1).valueOf();
  const date2 = new Date(timestamp2).valueOf();

  // Calculate the difference in time (milliseconds)
  const timeDifference = Math.abs(date2 - date1);

  // Convert milliseconds to days (1000 ms = 1 second, 60 seconds = 1 minute, 60 minutes = 1 hour, 24 hours = 1 day)
  const dayDifference = timeDifference / (1000 * 60 * 60 * 24);

  return dayDifference;
}
