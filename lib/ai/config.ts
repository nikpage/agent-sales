// lib/ai/config.ts

export const AI_MODELS = {
  classification: 'gemini-2.5-flash',
  summarization: 'gemini-2.5-flash',
  writing: 'gemini-2.5-flash',
  embeddings: {
  model: 'text-embedding-004',
  purpose: 'semantic-search',
  language: 'multilingual'
}


};

export const AI_PROMPTS = {
  classify: `ACT AS: Expert Executive Assistant...`,
  threadSummary: `You are a Real Estate Assistant...`,
};
