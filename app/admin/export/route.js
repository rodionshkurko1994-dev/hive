import { NextResponse } from 'next/server';
import { createClient, isAdminEmail } from '@/lib/supabase/server';
import { loadAllUsers } from '@/lib/admin';

export const dynamic = 'force-dynamic';

function esc(v) {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return new NextResponse('Forbidden', { status: 403 });

  const sp = new URL(request.url).searchParams;
  const q = (sp.get('q') || '').toLowerCase();
  const district = sp.get('district') || '';
  const users = (await loadAllUsers()).filter((u) =>
    (!q || `${u.full_name} ${u.email} ${u.building} ${u.neighborhood}`.toLowerCase().includes(q)) &&
    (!district || u.district === district)
  );

  const head = ['id', 'email', 'full_name', 'district', 'neighborhood', 'building', 'bio', 'created_at', 'confirmed_at', 'last_sign_in_at', 'onboarded', 'is_blocked', 'posts'];
  const lines = [head.join(',')].concat(users.map((u) => head.map((k) => esc(u[k])).join(',')));
  return new NextResponse('﻿' + lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hive-users-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
