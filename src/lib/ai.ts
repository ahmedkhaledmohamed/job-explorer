type Provider = {
  name: string;
  url: string;
  keyEnv: string;
  modelEnv: string;
  defaultModel: string;
};

const PROVIDERS: Provider[] = [
  {
    name: "together",
    url: "https://api.together.xyz/v1/chat/completions",
    keyEnv: "TOGETHER_API_KEY",
    modelEnv: "TOGETHER_MODEL",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  },
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    keyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
  },
];

async function generateWithProvider(
  provider: Provider,
  systemPrompt: string,
  userMessage: string
): Promise<{ content: string; model: string }> {
  const apiKey = process.env[provider.keyEnv];
  if (!apiKey) throw new Error(`${provider.keyEnv} not set`);

  const model = process.env[provider.modelEnv] || provider.defaultModel;

  const res = await fetch(provider.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${provider.name} API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Empty response from ${provider.name}`);

  return { content, model: `${provider.name}/${model}` };
}

export async function generate(
  systemPrompt: string,
  userMessage: string
): Promise<{ content: string; model: string }> {
  const errors: string[] = [];

  for (const provider of PROVIDERS) {
    if (!process.env[provider.keyEnv]) continue;
    try {
      return await generateWithProvider(provider, systemPrompt, userMessage);
    } catch (e) {
      errors.push(`${provider.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(
    `All AI providers failed: ${errors.join("; ") || "No API keys configured"}`
  );
}
