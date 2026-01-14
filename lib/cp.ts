// Path: lib/cp.ts

function getSenderEmail(fromHeader: string): string {
  const match = fromHeader.match(/<(.+?)>/);
  return (match ? match[1] : fromHeader).trim().toLowerCase();
}

function getSenderName(fromHeader: string): string {
  const name = fromHeader.split('<')[0]?.trim()?.replace(/"/g, '');
  return name && name.length > 0 ? name : 'Unknown';
}

/**
 * Resolve (or create) a CP row for an inbound sender.
 * DB is authoritative: cps(user_id, primary_identifier).
 */
export async function resolveCp(
  supabase: any,
  userId: string,
  fromHeader: string
): Promise<string> {
  const senderEmail = getSenderEmail(fromHeader);
  const senderName = getSenderName(fromHeader);

  const { data: cp, error: findErr } = await supabase
    .from('cps')
    .select('id')
    .eq('user_id', userId)
    .eq('primary_identifier', senderEmail)
    .maybeSingle();

  if (findErr) throw findErr;
  if (cp?.id) return cp.id as string;

  const { data: newCp, error: createErr } = await supabase
    .from('cps')
    .insert({
      user_id: userId,
      name: senderName,
      primary_identifier: senderEmail,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (createErr) throw createErr;
  return newCp.id as string;
}
