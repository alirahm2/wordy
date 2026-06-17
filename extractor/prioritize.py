import json
import asyncio
import os
from pathlib import Path
from openai import AsyncOpenAI

# ── Config (set these manually) ───────────────────────────────────────────────
API_KEY = os.environ.get("OPENROUTER_API_KEY")
INPUT_FILE = Path("../A2_B1_wordlist_enriched_v3.json")
OUTPUT_FILE = INPUT_FILE
CONCURRENCY = 15
START_INDEX = 0
MODEL = "google/gemini-2.5-flash"
SAVE_EVERY = 50
# ─────────────────────────────────────────────────────────────────────────────

if not API_KEY:
    raise RuntimeError("Set OPENROUTER_API_KEY before running this script.")

client = AsyncOpenAI(api_key=API_KEY, base_url="https://openrouter.ai/api/v1")


def build_prompt(entry: dict) -> str:
    return f"""You are a German language exam expert. Rate this word's importance for the Goethe/telc B1 exam.

Word: {entry["word"]}
Role: {entry["role"]}
Meaning: {entry.get("english", "")}

Reply with ONLY a single digit: 1, 2, or 3.
1 = essential (core B1 vocab, appears frequently in B1 exams)
2 = useful (good to know, may appear)
3 = low priority (rare, advanced, or already obvious to A2 learners)"""


async def prioritize_entry(sem: asyncio.Semaphore, data: list, idx: int) -> bool:
    entry = data[idx]
    async with sem:
        try:
            response = await client.chat.completions.create(
                model=MODEL,
                max_tokens=4,
                messages=[{"role": "user", "content": build_prompt(entry)}],
            )
            rating = response.choices[0].message.content.strip()[0]
            if rating not in ("1", "2", "3"):
                raise ValueError(f"Unexpected rating: {rating}")
            data[idx]["priority"] = int(rating)
            return True
        except Exception as e:
            print(f"[{idx}] Error for '{entry['word']}': {e}")
            data[idx]["priority"] = 2  # default to medium on error
            return False


async def main():
    data = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
    total = len(data)
    print(f"Loaded {total} entries. Assigning B1 priority scores...")

    sem = asyncio.Semaphore(CONCURRENCY)
    completed = 0
    errors = 0

    tasks = [prioritize_entry(sem, data, i) for i in range(START_INDEX, total)]

    for coro in asyncio.as_completed(tasks):
        success = await coro
        if success:
            completed += 1
        else:
            errors += 1

        if (completed + errors) % SAVE_EVERY == 0:
            pct = (completed + errors) / (total - START_INDEX) * 100
            print(f"Progress: {completed + errors}/{total - START_INDEX} ({pct:.1f}%)  errors: {errors}")

    # Sort by priority (1 first), preserve index as original position reference
    data.sort(key=lambda e: e.get("priority", 2))

    OUTPUT_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    p1 = sum(1 for e in data if e.get("priority") == 1)
    p2 = sum(1 for e in data if e.get("priority") == 2)
    p3 = sum(1 for e in data if e.get("priority") == 3)
    print(f"\nDone! Priority 1: {p1}  Priority 2: {p2}  Priority 3: {p3}")
    print(f"Saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
