import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isInteger(id)) return NextResponse.json({ ok:false, error:'invalid id' }, { status:400 });

    const { error } = await supabaseAdmin.from('prices').delete().eq('id', id);
    if (error) return NextResponse.json({ ok:false, error:error.message }, { status:400 });

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message || 'server error' }, { status:500 });
  }
}
