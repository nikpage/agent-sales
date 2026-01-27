// lib/cp.ts

export function getSenderEmail(fromHeader: string): string {
  const match = fromHeader.match(/<(.+?)>/);
  const email = (match ? match[1] : fromHeader).trim().toLowerCase();
  return normalizeGmailAddress(email);
}

export function normalizeGmailAddress(email: string): string {
  const lower = email.toLowerCase();
  const [localPart, domain] = lower.split('@');

  // Only normalize Gmail addresses
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Remove all dots from local part
    return localPart.replace(/\./g, '') + '@' + domain;
  }

  return lower;
}

function getSenderName(fromHeader: string): string {
  const name = fromHeader.split('<')[0]?.trim()?.replace(/"/g, '');
  return name && name.length > 0 ? name : 'Unknown';
}

function extractPhone(text: string): string | null {
  // Remove spaces, dashes, dots
  const cleaned = text.replace(/[\s\-\.]/g, '');

  // Find all 9-digit sequences
  const matches = cleaned.match(/\d{9}/g);

  if (!matches) return null;

  // Return first valid phone (starts with 2-9)
  for (const match of matches) {
    if (match[0] >= '2' && match[0] <= '9') {
      return match;
    }
  }

  return null;
}

/**
 * Resolve (or create) a CP row for an inbound sender.
 * DB is authoritative: cps(user_id, primary_identifier, other_identifiers).
 */
export async function resolveCp(
  supabase: any,
  userId: string,
  fromHeader: string,
  emailBody?: string,
  userEmail?: string
): Promise<string> {
  const senderEmail = getSenderEmail(fromHeader);
  const senderName = getSenderName(fromHeader);
  const phoneNumber = emailBody ? extractPhone(emailBody) : null;

  // GUARD: Never create CP for user's own email
  if (userEmail && senderEmail === userEmail.toLowerCase()) {
    throw new Error('CANNOT_CREATE_CP_FOR_USER');
  }

  // Check primary_identifier
  let { data: cp, error: findErr } = await supabase
    .from('cps')
    .select('id')
    .eq('user_id', userId)
    .eq('primary_identifier', senderEmail)
    .maybeSingle();

  if (findErr) throw findErr;
  if (cp?.id) return cp.id as string;

  // Check other_identifiers->emails
  const { data: emailCp } = await supabase
    .from('cps')
    .select('id')
    .eq('user_id', userId)
    .filter('other_identifiers->emails', 'cs', `{"${senderEmail}"}`)
    .maybeSingle();

  if (emailCp?.id) return emailCp.id;

  // Check other_identifiers->phones (if phoneNumber provided)
  if (phoneNumber) {
    const { data: phoneCp } = await supabase
      .from('cps')
      .select('id')
      .eq('user_id', userId)
      .filter('other_identifiers->phones', 'cs', `{"${phoneNumber}"}`)
      .maybeSingle();

    if (phoneCp?.id) return phoneCp.id;
  }

  // Create new CP
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
