// lib/cp.ts

function getSenderEmail(fromHeader: string): string {
  const match = fromHeader.match(/<(.+?)>/);
  return (match ? match[1] : fromHeader).trim().toLowerCase();
}

function getSenderName(fromHeader: string): string {
  const name = fromHeader.split('<')[0]?.trim()?.replace(/"/g, '');
  return name && name.length > 0 ? name : 'Unknown';
}

function extractPhone(emailBody: string): string | null {
  // Get last ~10 lines (signature area)
  const lines = emailBody.split('\n');
  const signatureLines = lines.slice(-10).join('\n');

  // Remove all spaces, dashes, dots
  const cleaned = signatureLines.replace(/[\s\-\.]/g, '');

  // Try +420 format first
  let match = cleaned.match(/\+420(\d{9})/);
  if (match) return match[1];

  // Try +42 format (German)
  match = cleaned.match(/\+42(\d{9,})/);
  if (match) return match[1].substring(0, 9);

  // Try plain 9 digits
  const matches = cleaned.match(/\d{9}/g);
  if (!matches) return null;

  // Return first valid (starts with 2-9)
  for (const m of matches) {
    if (m[0] >= '2' && m[0] <= '9') {
      return m;
    }
  }

  return null;
}

/**
 * Resolve (or create) a CP row for an inbound sender.
 */
export async function resolveCp(
  supabase: any,
  userId: string,
  fromHeader: string,
  emailBody?: string
): Promise<string> {
  const senderEmail = getSenderEmail(fromHeader);
  const senderName = getSenderName(fromHeader);
  const phoneNumber = emailBody ? extractPhone(emailBody) : null;

  // 1. Check if email exists as primary_identifier
  let { data: cp, error: findErr } = await supabase
    .from('cps')
    .select('*')
    .eq('user_id', userId)
    .eq('primary_identifier', senderEmail)
    .maybeSingle();

  if (findErr) throw findErr;

  if (cp?.id) {
    // Found by email - update phone if we have one
    if (phoneNumber) {
      const phones = cp.other_identifiers?.phones || [];
      if (!phones.includes(phoneNumber)) {
        phones.push(phoneNumber);
        await supabase
          .from('cps')
          .update({
            other_identifiers: { ...cp.other_identifiers, phones }
          })
          .eq('id', cp.id);
      }
    }
    return cp.id as string;
  }

  // 2. Check if email exists in other_identifiers->emails
  ({ data: cp, error: findErr } = await supabase
    .from('cps')
    .select('*')
    .eq('user_id', userId)
    .contains('other_identifiers', { emails: [senderEmail] })
    .maybeSingle());

  if (findErr) throw findErr;

  if (cp?.id) {
    // Found by email - update phone if we have one
    if (phoneNumber) {
      const phones = cp.other_identifiers?.phones || [];
      if (!phones.includes(phoneNumber)) {
        phones.push(phoneNumber);
        await supabase
          .from('cps')
          .update({
            other_identifiers: { ...cp.other_identifiers, phones }
          })
          .eq('id', cp.id);
      }
    }
    return cp.id as string;
  }

  // 3. Check if phone exists (if we have one)
  if (phoneNumber) {
    ({ data: cp, error: findErr } = await supabase
      .from('cps')
      .select('*')
      .eq('user_id', userId)
      .contains('other_identifiers', { phones: [phoneNumber] })
      .maybeSingle());

    if (findErr) throw findErr;

    if (cp?.id) {
      // Found by phone - add this email
      const emails = cp.other_identifiers?.emails || [];
      if (!emails.includes(senderEmail)) {
        emails.push(senderEmail);
        await supabase
          .from('cps')
          .update({
            other_identifiers: { ...cp.other_identifiers, emails }
          })
          .eq('id', cp.id);
      }
      return cp.id as string;
    }
  }

  // 4. Create new CP
  const otherIdentifiers: any = { emails: [] };
  if (phoneNumber) {
    otherIdentifiers.phones = [phoneNumber];
  }

  const { data: newCp, error: createErr } = await supabase
    .from('cps')
    .insert({
      user_id: userId,
      name: senderName,
      primary_identifier: senderEmail,
      other_identifiers: otherIdentifiers,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (createErr) throw createErr;
  return newCp.id as string;
}
