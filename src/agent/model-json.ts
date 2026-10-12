/** Accept plain JSON or exactly one JSON code fence. Reject prose and trailing
 * instructions; the caller still applies its strict verdict/action schema. */
export function parseModelJson(content: string): unknown {
  const text = content.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(text);
  return JSON.parse(fenced ? fenced[1] : text);
}
