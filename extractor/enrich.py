import json
import asyncio
import os
from pathlib import Path
from openai import AsyncOpenAI

# ── Config (set these manually) ───────────────────────────────────────────────
API_KEY = os.environ.get("OPENROUTER_API_KEY")
INPUT_FILE = Path("../A2_B1_wordlist_enriched_v3.json")
OUTPUT_FILE = INPUT_FILE  # overwrite in place; change to a new path if needed
CONCURRENCY = 10
START_INDEX = 0  # set higher to resume from a specific entry
MODEL = "google/gemini-2.5-flash"  # fast + accurate; change to any OpenRouter model
SAVE_EVERY = 50  # save to disk every N completions
# ─────────────────────────────────────────────────────────────────────────────

if not API_KEY:
    raise RuntimeError("Set OPENROUTER_API_KEY before running this script.")

client = AsyncOpenAI(
    api_key=API_KEY,
    base_url="https://openrouter.ai/api/v1",
)


def build_prompt(entry: dict) -> str:
    return f"""You are a German-English dictionary assistant. Given a German word/phrase, return ONLY a JSON object (no markdown, no explanation) with exactly two fields:
- "english": a concise, accurate English translation (update/improve if one is already provided)
- "pronunciation": the IPA transcription of the German word (e.g. "/ˈʔapfl̩/" for "Apfel")

German word: {entry["word"]}
Role: {entry["role"]}
{f'Current english: {entry["english"]}' if entry.get("english") else ""}

Respond with only the JSON object."""


def parse_response(text: str) -> dict:
    cleaned = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(cleaned)


async def enrich_entry(sem: asyncio.Semaphore, data: list, idx: int) -> None:
    entry = data[idx]
    async with sem:
        try:
            response = await client.chat.completions.create(
                model=MODEL,
                max_tokens=256,
                messages=[{"role": "user", "content": build_prompt(entry)}],
            )
            result = parse_response(response.choices[0].message.content)
            if result.get("english"):
                data[idx]["english"] = result["english"]
            if result.get("pronunciation"):
                data[idx]["pronunciation"] = result["pronunciation"]
            return True
        except Exception as e:
            print(f"[{idx}] Error for '{entry['word']}': {e}")
            return False


async def main():
    data = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
    total = len(data)
    print(f"Loaded {total} entries. Starting at index {START_INDEX}.")

    sem = asyncio.Semaphore(CONCURRENCY)
    completed = 0
    errors = 0

    tasks = [enrich_entry(sem, data, i) for i in range(START_INDEX, total)]

    for i, coro in enumerate(asyncio.as_completed(tasks)):
        success = await coro
        if success:
            completed += 1
        else:
            errors += 1

        if (completed + errors) % SAVE_EVERY == 0:
            OUTPUT_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            pct = (completed + errors) / (total - START_INDEX) * 100
            print(f"Progress: {completed + errors}/{total - START_INDEX} ({pct:.1f}%)  errors: {errors}")

    OUTPUT_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nDone! {completed} updated, {errors} errors. Saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
