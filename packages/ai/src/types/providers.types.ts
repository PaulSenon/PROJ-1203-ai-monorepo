export type ProviderSlug =
  | "aihubmix"
  | "alibaba-cn"
  | "alibaba"
  | "amazon-bedrock"
  | "anthropic"
  | "azure"
  | "baseten"
  | "cerebras"
  | "chutes"
  | "cloudflare-workers-ai"
  | "cortecs"
  | "deepinfra"
  | "deepseek"
  | "fastrouter"
  | "fireworks-ai"
  | "github-copilot"
  | "github-models"
  | "google-vertex-anthropic"
  | "google-vertex"
  | "google"
  | "groq"
  | "huggingface"
  | "iflowcn"
  | "inception"
  | "inference"
  | "llama"
  | "lmstudio"
  | "lucidquery"
  | "mistral"
  | "modelscope"
  | "moonshotai-cn"
  | "moonshotai"
  | "morph"
  | "nebius"
  | "nvidia"
  | "openai"
  | "opencode"
  | "openrouter"
  | "perplexity"
  | "requesty"
  | "scaleway"
  | "submodel"
  | "synthetic"
  | "togetherai"
  | "upstage"
  | "v0"
  | "venice"
  | "vercel"
  | "vultr"
  | "wandb"
  | "xai"
  | "zai-coding-plan"
  | "zai"
  | "zenmux"
  | "zhipuai-coding-plan"
  | "zhipuai"
  | (string & {});

const providerTitleMap: Record<ProviderSlug, string> = {
  aihubmix: "AIHubMix",
  "alibaba-cn": "Alibaba (CN)",
  alibaba: "Alibaba",
  "amazon-bedrock": "Amazon Bedrock",
  anthropic: "Anthropic",
  azure: "Azure",
  baseten: "Baseten",
  cerebras: "Cerebras",
  chutes: "Chutes",
  "cloudflare-workers-ai": "Cloudflare Workers AI",
  cortecs: "Cortecs",
  deepinfra: "Deepinfra",
  deepseek: "DeepSeek",
  fastrouter: "FastRouter",
  "fireworks-ai": "Fireworks AI",
  "github-copilot": "GitHub Copilot",
  "github-models": "GitHub Models",
  "google-vertex-anthropic": "Google Vertex Anthropic",
  "google-vertex": "Google Vertex",
  google: "Google",
  groq: "Groq",
  huggingface: "Hugging Face",
  iflowcn: "IflowCN",
  inception: "Inception",
  inference: "Inference",
  llama: "Llama",
  lmstudio: "LMStudio",
  lucidquery: "LucidQuery",
  mistral: "Mistral AI",
  modelscope: "ModelScope",
  "moonshotai-cn": "Moonshot AI (CN)",
  moonshotai: "Moonshot AI",
  morph: "Morph",
  nebius: "Nebius",
  nvidia: "Nvidia",
  openai: "OpenAI",
  opencode: "OpenCode",
  openrouter: "OpenRouter",
  perplexity: "Perplexity",
  requesty: "Requesty",
  scaleway: "Scaleway",
  submodel: "Submodel",
  synthetic: "Synthetic",
  togetherai: "Together AI",
  upstage: "Upstage",
  v0: "v0",
  venice: "Venice",
  vercel: "Vercel",
  vultr: "Vultr",
  wandb: "Wandb",
  xai: "xAI",
  "zai-coding-plan": "Zai Coding Plan",
  zai: "Zai",
  zenmux: "Zenmux",
  "zhipuai-coding-plan": "Zhipuai Coding Plan",
  zhipuai: "Zhipuai",
};

export function getProviderTitle(provider: ProviderSlug): string {
  return providerTitleMap[provider] ?? provider;
}
