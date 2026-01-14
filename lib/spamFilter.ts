// lib/spamFilter.ts

export type SpamDecision = {
  isSpam: boolean
  reasons: string[]
}

const PROMO_KEYWORDS = [
  // EN
  'unsubscribe', 'sale', 'offer', 'discount', 'deal',
  'promo', 'promotion', 'marketing', 'newsletter',
  'limited time', 'special offer',

  // CS
  'odhlasit', 'odhlaseni', 'zrusit odber',
  'sleva', 'akce', 'nabidka', 'vyprodej',
  'propagace', 'marketing', 'newsletter',
  'casove omezena'
]

const BULK_HEADERS = [
  'list-unsubscribe',
  'list-id',
  'precedence',
  'x-campaign',
  'x-mailer'
]

const KNOWN_BULK_DOMAINS = [
  'mailchimp.com',
  'sendgrid.net',
  'hubspotemail.net',
  'campaignmonitor.com'
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function spamFilter(input: {
  headers: Record<string, string | undefined>
  fromEmail: string
  fromName?: string
  subject?: string
  text: string
  html?: string
}): SpamDecision {
  const reasons: string[] = []

  const headerKeys = Object.keys(input.headers).map(h => h.toLowerCase())

  // Header checks
  for (const h of BULK_HEADERS) {
    if (headerKeys.includes(h)) {
      reasons.push(`bulk_header:${h}`)
    }
  }

  // Sender domain checks
  const domain = input.fromEmail.split('@')[1]?.toLowerCase()
  if (domain && KNOWN_BULK_DOMAINS.some(d => domain.endsWith(d))) {
    reasons.push('known_bulk_domain')
  }

  if (
    input.fromName &&
    domain &&
    !normalize(input.fromName).includes(domain.split('.')[0])
  ) {
    reasons.push('sender_name_domain_mismatch')
  }

  // Content heuristics
  const textNorm = normalize(input.text)
  const words = textNorm.split(/\s+/)

  const promoHits = PROMO_KEYWORDS.filter(k =>
    textNorm.includes(k)
  ).length

  if (promoHits >= 2) {
    reasons.push('promo_keywords')
  }

  const body = input.html ?? input.text
  const linkCount = body.match(/https?:\/\//g)?.length ?? 0

  if (linkCount >= 2 && words.length < 150) {
    reasons.push('link_heavy')
  }

  return {
    isSpam: reasons.length > 0,
    reasons
  }
}
