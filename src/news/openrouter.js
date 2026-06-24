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
   * ONLY mark words that appear in the Required vocabulary list sent below (the learner's most recently practiced words).
   * Wrap every Required vocabulary word with double square brackets, like [[Beispiel]].
   * Do NOT mark words from the Allowed vocabulary list, and do NOT mark any word that is not in the Required vocabulary list.
   * Keep the marker around the exact German word form that appears in the sentence.

Example of correct marking (assuming only "Mann" and "Arbeit" are in the Required vocabulary list):
Der [[Mann]] geht zur [[Arbeit]].

FALLBACK (only if needed):
* If the Original text's topic genuinely cannot be rewritten to naturally include 100% of the Required vocabulary, do NOT force the words in awkwardly.
* Instead, write a different, plausible news report about a recent event (something that could realistically have happened in the last 3 days, any topic) whose subject NATURALLY fits the Required vocabulary.
* This fallback text must still read like a real, factual news report, must include every Required vocabulary word, must mark vocabulary words, and must stay within the Allowed vocabulary.

LENGTH:
* The rewritten text MUST be between 20 and 30 lines long (counting wrapped sentences/paragraphs, not counting blank lines).
* Adjust detail, context, and elaboration of the same facts — without inventing contradicting facts — so the text fits within this 20-30 line range.
* Do NOT exceed 30 lines, and do NOT produce fewer than 20 lines.

STYLE:
* Write like a real news report: same kind of structure, order of ideas, and paragraph breaks.
* Prefer short sentences and active voice.
* Use concrete language; avoid abstract wording when a concrete alternative exists.
* Do NOT output bullet points, concepts, or lists.
* When rewriting the Original text, do not introduce new facts and do not remove important facts. (Only the fallback may introduce a new topic.)

QUALITY CHECK (perform internally):
1. Did you preserve the meaning and context (or, in fallback, write a believable recent news report)?
2. Does every Required vocabulary word appear, used correctly and marked with [[...]]?
3. Are ONLY Required vocabulary words marked with [[...]], and no Allowed-vocabulary or other words highlighted?
4. Does the text stay within the Allowed vocabulary as much as possible?
5. Is the text between 20 and 30 lines long?

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

  // Diagnostics: confirm what is actually being sent to the model.
  console.log(
    "[rewriteForLearner] allowed:",
    vocabulary.length,
    "required:",
    requiredVocabulary.length,
    "originalText chars:",
    originalText?.length ?? 0
  );

  const userMessage = `Original text:
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
      messages: [
        { role: "system", content: EDITOR_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 3000,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const text = choice?.message?.content?.trim();

  // Diagnostics: surface truncation and whether the model marked anything.
  console.log(
    "[rewriteForLearner] finish_reason:",
    choice?.finish_reason,
    "output chars:",
    text?.length ?? 0,
    "contains markers:",
    text ? text.includes("[[") : false
  );

  if (!text) throw new Error("OpenRouter returned an empty response");
  return text;
}