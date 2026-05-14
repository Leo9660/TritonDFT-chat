import { Conversation } from "./types";

/**
 * Render a conversation as a clean Markdown document.
 */
export function conversationToMarkdown(conv: Conversation): string {
  const out: string[] = [];
  const dt = new Date(conv.updatedAt || conv.createdAt).toISOString();
  out.push(`# ${conv.title || "TritonDFT chat"}`);
  out.push("");
  out.push(`> Exported from [chat.tritondft.com](https://chat.tritondft.com) — ${dt}`);
  out.push("");
  for (const m of conv.messages) {
    if (m.role === "user") {
      out.push(`## 🧑 User`);
      out.push("");
      out.push(m.content);
    } else if (m.role === "assistant") {
      out.push(`## 🤖 TritonDFT Agent`);
      out.push("");
      out.push(m.content);
    } else {
      out.push(`## ${m.role}`);
      out.push("");
      out.push(m.content);
    }
    out.push("");
    out.push("---");
    out.push("");
  }
  return out.join("\n");
}

export function downloadMarkdown(conv: Conversation): void {
  const md = conversationToMarkdown(conv);
  const safe = (conv.title || "tritondft-chat")
    .replace(/[^a-zA-Z0-9-_ 一-鿿]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .trim() || "tritondft-chat";
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyMarkdown(conv: Conversation): Promise<void> {
  const md = conversationToMarkdown(conv);
  await navigator.clipboard.writeText(md);
}
