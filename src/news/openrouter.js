const EDITOR_PROMPT = `You are an expert educational editor.

Your task is to rewrite a text for a learner with a limited vocabulary.

INPUT:

* Original text
* Allowed vocabulary list

OBJECTIVE:
Rewrite the text so that it conveys the same meaning, facts, ideas, and narrative flow as the original text while using only words from the allowed vocabulary list whenever possible.

IMPORTANT:

* Do NOT output concepts or bullet points.
* Preserve the original structure, order of ideas, paragraph breaks, and storytelling flow.
* The final result should feel like the same text written for a younger reader.
* Keep all important information.
* If a word or concept is not available in the allowed vocabulary, express the same idea using simpler allowed words.
* Prefer short sentences.
* Prefer active voice.
* Avoid abstract language when a concrete alternative exists.
* Do not introduce new facts.
* Do not remove important facts.

VOCABULARY CONSTRAINTS:

* Use only words from the allowed vocabulary list.
* You may change sentence structure as needed to stay within the vocabulary.
* If a concept cannot be expressed exactly, preserve the meaning as closely as possible using available words.

QUALITY CHECK (perform internally):

1. Read and understand the original text.
2. Identify all key facts and relationships.
3. Rewrite using the allowed vocabulary.
4. Verify that the rewritten version preserves the original meaning.
5. Verify that no disallowed vocabulary appears in the final text.

OUTPUT:
Return only the rewritten text.
Do not include explanations, notes, reasoning, or comments.`;

export function buildVocabularyList(wordEntries, currentIndex) {
  return wordEntries.slice(0, currentIndex + 1).map((entry) => entry.word);
}

export async function rewriteForLearner(originalText, vocabulary, settings) {
  if (!settings.openRouterApiKey) {
    throw new Error("Add your OpenRouter API key in Settings");
  }

  const model = settings.openRouterModel || "google/gemini-2.5-flash";
  const userMessage = `${EDITOR_PROMPT}

Original text:
${originalText}

Allowed vocabulary list:
${vocabulary.join(", ")}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "German Wordlist Study",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter returned an empty response");
  return text;
}
