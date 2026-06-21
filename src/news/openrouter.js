const EDITOR_PROMPT = `You are an expert educational editor and German news rewriter for a language learner.

You receive:
* Original text — a real news article fetched from an RSS feed.
* Allowed vocabulary list — every word the learner has already reviewed. These are the words the learner understands.
* Required vocabulary (last 3 batches) — the words the learner reviewed most recently. The rewritten text MUST include these words.

PROCESS (perform internally):
1. Read the Original text and fully comprehend its meaning, facts, and context.
2. Rewrite it in German so it keeps the SAME meaning, context, facts, and order of ideas as the Original text.
3. The rewritten text MUST naturally include EVERY word from the Required vocabulary list, used correctly in context.
4. Prefer words from the Allowed vocabulary list. When an idea has no allowed word, express it with the simplest possible words.

FALLBACK (only if needed):
* If the Original text's topic genuinely cannot be rewritten to naturally include the Required vocabulary, do NOT force the words in awkwardly.
* Instead, write a different, plausible news report about a recent event (something that could realistically have happened in the last 3 days, any topic) whose subject NATURALLY fits the Required vocabulary.
* This fallback text must still read like a real, factual news report, must include every Required vocabulary word, and must stay within the Allowed vocabulary.

LENGTH:
* Keep roughly the same length as the Original text. Do not pad it out and do not shorten it significantly.

STYLE:
* Write like a real news report: same kind of structure, order of ideas, and paragraph breaks.
* Prefer short sentences and active voice.
* Use concrete language; avoid abstract wording when a concrete alternative exists.
* Do NOT output bullet points, concepts, or lists.
* When rewriting the Original text, do not introduce new facts and do not remove important facts. (Only the fallback may introduce a new topic.)

QUALITY CHECK (perform internally):
1. Did you preserve the meaning and context (or, in fallback, write a believable recent news report)?
2. Does every Required vocabulary word appear, used correctly?
3. Does the text stay within the Allowed vocabulary as much as possible?
4. Is the length close to the original?

OUTPUT:
Return ONLY the final German text. Do not include explanations, notes, reasoning, labels, or comments.`;

const BATCH_SIZE = 5;
const BATCHES_INCLUDED = 3;

export function buildVocabularyList(wordEntries, currentIndex) {
  return wordEntries.slice(0, currentIndex + 1).map((entry) => entry.word);
}

export async function rewriteForLearner(originalText, vocabulary, settings) {
  if (!settings.openRouterApiKey) {
    throw new Error("Add your OpenRouter API key in Settings");
  }

  const model = settings.openRouterModel || "google/gemini-2.5-flash";
  const requiredVocabulary = vocabulary.slice(-(BATCH_SIZE * BATCHES_INCLUDED));
  const userMessage = `${EDITOR_PROMPT}

Original text:
${originalText}

Allowed vocabulary list:
${vocabulary.join(", ")}

Required vocabulary (last ${BATCHES_INCLUDED} batches — every one of these MUST appear in the rewritten text):
${requiredVocabulary.join(", ")}`;

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
      max_tokens: 1500,
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
