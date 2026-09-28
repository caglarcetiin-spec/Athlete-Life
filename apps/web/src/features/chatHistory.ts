export function chatHistory(
  messages: { role: "user" | "assistant"; text: string }[],
  text: string,
) {
  const history: { role: "user" | "assistant"; text: string }[] = [
    { role: "user", text },
  ];
  let size = text.length;
  // Preserve complete user/assistant pairs and a bounded context, never prior image bytes.
  for (let i = messages.length - 2; i >= 0 && history.length < 15; i -= 2) {
    const pair = messages.slice(i, i + 2);
    const length = pair.reduce((sum, m) => sum + m.text.length, 0);
    if (size + length > 24000) break;
    history.unshift(...pair.map(({ role, text }) => ({ role, text })));
    size += length;
  }
  return history;
}
