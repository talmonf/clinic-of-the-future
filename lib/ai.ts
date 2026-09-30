import Anthropic from "@anthropic-ai/sdk";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI_NOT_CONFIGURED");
    this.name = "AiNotConfiguredError";
  }
}

export async function completeWithClaude(system: string, user: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const message = await client.messages.create({
    model,
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  return { text, model: message.model };
}

export function parseTaskList(output: string) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(output.slice(start, end + 1));
    if (!parsed || typeof parsed !== "object" || !("tasks" in parsed)) return null;
    const tasks = (parsed as { tasks: unknown }).tasks;
    if (!Array.isArray(tasks)) return null;
    const rows = tasks.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const title = "title" in item && typeof item.title === "string" ? item.title.trim() : "";
      if (!title) return [];
      const details =
        "details" in item && typeof item.details === "string" ? item.details.trim() : "";
      const owner = "owner" in item && typeof item.owner === "string" ? item.owner.trim() : "";
      return [{ title: title.slice(0, 200), details: details.slice(0, 4000), owner: owner.slice(0, 120) }];
    });
    return rows.slice(0, 8);
  } catch {
    return null;
  }
}
