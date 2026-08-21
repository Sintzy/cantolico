type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionChoice = {
  message?: {
    content?: string | null;
  };
};

type ChatCompletionResponse = {
  choices?: ChatCompletionChoice[];
  error?: {
    message?: string;
  };
};

const DEFAULT_AI_BASE_URL = "https://ai.hackclub.com/proxy/v1";
const DEFAULT_AI_MODEL = "qwen/qwen3-32b";

export class AIClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIClientError";
  }
}

export function getAIConfig() {
  const apiKey = process.env.HACKCLUB_AI_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.HACKCLUB_AI_BASE_URL || process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL;
  const model = process.env.HACKCLUB_AI_MODEL || process.env.AI_MODEL || DEFAULT_AI_MODEL;

  return { apiKey, baseUrl, model };
}

export async function createChatCompletion(messages: ChatMessage[]) {
  const { apiKey, baseUrl, model } = getAIConfig();

  if (!apiKey) {
    throw new AIClientError("A IA ainda não está configurada no servidor.");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.35,
      max_tokens: 1200,
    }),
  });

  const payload = (await response.json().catch(() => null)) as ChatCompletionResponse | null;

  if (!response.ok) {
    throw new AIClientError(payload?.error?.message || "Erro ao contactar o serviço de IA.");
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new AIClientError("A IA não devolveu uma resposta utilizável.");
  }

  return content;
}

export function extractJsonObject(text: string) {
  const withoutFence = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new AIClientError("A resposta da IA não continha JSON válido.");
  }

  return JSON.parse(withoutFence.slice(start, end + 1));
}
