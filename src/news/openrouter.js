const EDITOR_PROMPT = `You are an expert educational editor and German news rewriter for a language learner.

You receive:
* Original text — a real news article fetched from an RSS feed.
* Allowed vocabulary list — every word the learner has already reviewed. These are the words the learner understands.
* Required vocabulary (last 10 batches) — the words the learner reviewed most recently. The rewritten text MUST include 100% of these words.

PROCESS (perform internally):
1. Read the Original text and fully comprehend its meaning, facts, and context.
2. Rewrite it in German so it keeps the SAME meaning, context, facts, and order of ideas as the Original text.
3. The rewritten text MUST naturally include EVERY word from the Required vocabulary list, used correctly in context. This is a hard requirement: 100% of required vocabulary words must appear.
4. Prefer words from the Allowed vocabulary list as much as possible. The final text should be built mostly from known vocabulary, not from new words. When an idea has no allowed word, express it with the simplest possible words.
5. Mark vocabulary words in the final text:
   * Wrap every Required vocabulary word with double square brackets, like [[Beispiel]].
   * Also wrap other meaningful words from the Allowed vocabulary list when you use them.
   * Keep the marker around the exact German word form that appears in the sentence.

FALLBACK (only if needed):
* If the Original text's topic genuinely cannot be rewritten to naturally include 100% of the Required vocabulary, do NOT force the words in awkwardly.
* Instead, write a different, plausible news report about a recent event (something that could realistically have happened in the last 3 days, any topic) whose subject NATURALLY fits the Required vocabulary.
* This fallback text must still read like a real, factual news report, must include every Required vocabulary word, must mark vocabulary words, and must stay within the Allowed vocabulary.

LENGTH:
* Keep roughly the same length as the Original text when possible. If needed, make the text slightly longer so that 100% of the Required vocabulary appears naturally.

STYLE:
* Write like a real news report: same kind of structure, order of ideas, and paragraph breaks.
* Prefer short sentences and active voice.
* Use concrete language; avoid abstract wording when a concrete alternative exists.
* Do NOT output bullet points, concepts, or lists.
* When rewriting the Original text, do not introduce new facts and do not remove important facts. (Only the fallback may introduce a new topic.)

QUALITY CHECK (perform internally):
1. Did you preserve the meaning and context (or, in fallback, write a believable recent news report)?
2. Does every Required vocabulary word appear, used correctly and marked with [[...]]?
3. Are meaningful words from the Allowed vocabulary marked when used?
4. Does the text stay within the Allowed vocabulary as much as possible?
5. Is the length close to the original, unless extra length was needed for natural 100% vocabulary coverage?

OUTPUT:
Return ONLY the final German text. Do not include explanations, notes, reasoning, labels, or comments.`;

const BATCH_SIZE = 5;
const BATCHES_INCLUDED = 10;

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
