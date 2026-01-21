// lib/summary/renderSummary.ts

export function renderSummary(summaryJson: any): string {
  if (!summaryJson) {
    return '';
  }

  const parts: string[] = [];

  if (summaryJson.topic) {
    parts.push(`Topic: ${summaryJson.topic}`);
  }

  if (summaryJson.summary) {
    parts.push(summaryJson.summary);
  }

  if (summaryJson.key_points && Array.isArray(summaryJson.key_points)) {
    if (summaryJson.key_points.length > 0) {
      parts.push('\nKey Points:');
      summaryJson.key_points.forEach((point: string) => {
        parts.push(`• ${point}`);
      });
    }
  }

  if (summaryJson.action_items && Array.isArray(summaryJson.action_items)) {
    if (summaryJson.action_items.length > 0) {
      parts.push('\nAction Items:');
      summaryJson.action_items.forEach((item: string) => {
        parts.push(`• ${item}`);
      });
    }
  }

  if (summaryJson.next_steps && Array.isArray(summaryJson.next_steps)) {
    if (summaryJson.next_steps.length > 0) {
      parts.push('\nNext Steps:');
      summaryJson.next_steps.forEach((step: string) => {
        parts.push(`• ${step}`);
      });
    }
  }

  return parts.join('\n');
}
