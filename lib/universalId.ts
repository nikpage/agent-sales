//lib/universalId.ts

export function makeUniversalMessageId(input: {
  provider: 'GMAIL';
  providerMessageId: string | null;
}) {
  if (!input.providerMessageId) {
    throw new Error('MISSING_PROVIDER_MESSAGE_ID');
  }
  return `${input.provider}:${input.providerMessageId}`;
}
