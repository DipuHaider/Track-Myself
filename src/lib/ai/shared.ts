export const AI_KEY_EVENT = "tm-ai-key";

export type AiKeyState = {
  configured: boolean;
  provider: string | null;
  model: string;
  baseUrl: string;
  last4: string;
  status: string;
  lastError: string;
  addedAt: string | null;
  lastCheckedAt: string | null;
  lastCallAt?: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    calls: number;
    lastCallAt: string | null;
    monthInputTokens: number;
    monthOutputTokens: number;
    monthCalls: number;
  };
  sharedKeyAvailable: boolean;
  storageReady: boolean;
};

export const PROVIDER_OPTIONS = [
  {
    key: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-3.6-flash",
    placeholder: "AIza…",
    hint: "Free tier available. Create a key at aistudio.google.com/apikey.",
  },
  {
    key: "anthropic",
    label: "Anthropic (Claude)",
    defaultModel: "claude-sonnet-5",
    placeholder: "sk-ant-…",
    hint: "Pay as you go. Haiku 4.5 is the cheapest current model. console.anthropic.com.",
  },
  {
    key: "openai-compatible",
    label: "OpenAI-compatible",
    defaultModel: "gpt-4o-mini",
    placeholder: "sk-… or or-…",
    hint: "OpenAI, OpenRouter, Groq, Together, DeepSeek or a local model.",
  },
] as const;
