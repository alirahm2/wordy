const RSS_FEEDS = [
  { id: "spektrum", name: "Spektrum der Wissenschaft", path: "/api/rss/spektrum", weight: 1 },
  { id: "geo", name: "GEO", path: "/api/rss/geo", weight: 1 },
  { id: "zeit", name: "ZEIT Online", path: "/api/rss/zeit", weight: 4 },
  { id: "sz", name: "Süddeutsche Zeitung", path: "/api/rss/sz", weight: 4 },
  { id: "spiegel", name: "Der Spiegel", path: "/api/rss/spiegel", weight: 4 },
];

const MIN_WORDS = 90;
const MAX_WORDS = 140;

function stripHtml(html) {
  return normalizeText(
    unwrapCdata(html)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  );
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function unwrapCdata(text) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function takeWordRange(text, min = MIN_WORDS, max = MAX_WORDS) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < min) return null;
  const end = Math.min(max, words.length);
  return words.slice(0, end).join(" ");
}

function fieldFromItem(xml, tag) {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(pattern);
  if (!match) return "";
  return normalizeText(stripHtml(unwrapCdata(match[1])));
}

function parseRssItems(xmlText) {
  const blocks = [...xmlText.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  if (!blocks.length) throw new Error("Invalid RSS feed");

  return blocks.map((match) => {
    const block = match[1];
    const title = fieldFromItem(block, "title");
    const description = fieldFromItem(block, "description");
    const content = fieldFromItem(block, "content:encoded") || description;
    return { title, description, content };
  });
}

function excerptFromItem(item) {
  const candidates = [
    item.content,
    `${item.title}. ${item.description}`,
    item.description,
    item.title,
  ];

  for (const candidate of candidates) {
    const excerpt = takeWordRange(candidate);
    if (excerpt) return excerpt;
  }
  return null;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function weightedShuffle(array) {
  return array
    .map((item) => ({
      ...item,
      order: Math.random() ** (1 / (item.weight || 1)),
    }))
    .sort((a, b) => b.order - a.order);
}

async function fetchFeed(feed) {
  const res = await fetch(feed.path);
  if (!res.ok) throw new Error(`${feed.name}: HTTP ${res.status}`);
  return parseRssItems(await res.text());
}

export async function fetchNewsExcerpt() {
  const feeds = weightedShuffle(RSS_FEEDS);

  for (const feed of feeds) {
    try {
      const items = shuffle(await fetchFeed(feed));
      for (const item of items) {
        const excerpt = excerptFromItem(item);
        if (excerpt && countWords(excerpt) >= MIN_WORDS) {
          return {
            excerpt,
            source: feed.name,
            title: item.title,
          };
        }
      }
    } catch {
      // try next feed
    }
  }

  throw new Error("No article with 90–140 words found. Try refresh.");
}

export { RSS_FEEDS, MIN_WORDS, MAX_WORDS };
