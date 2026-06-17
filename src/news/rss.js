const RSS_FEEDS = [
  { id: "spektrum", name: "Spektrum der Wissenschaft", path: "/api/rss/spektrum" },
  { id: "geo", name: "GEO", path: "/api/rss/geo" },
  { id: "zeit", name: "ZEIT Online", path: "/api/rss/zeit" },
  { id: "sz", name: "Süddeutsche Zeitung", path: "/api/rss/sz" },
  { id: "spiegel", name: "Der Spiegel", path: "/api/rss/spiegel" },
];

const MIN_WORDS = 52;
const MAX_WORDS = 78;

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

async function fetchFeed(feed) {
  const res = await fetch(feed.path);
  if (!res.ok) throw new Error(`${feed.name}: HTTP ${res.status}`);
  return parseRssItems(await res.text());
}

export async function fetchNewsExcerpt(feedOffset = 0) {
  const feeds = RSS_FEEDS.map((feed, i) => ({
    ...feed,
    order: (i + feedOffset) % RSS_FEEDS.length,
  }));
  feeds.sort((a, b) => a.order - b.order);

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

  throw new Error("No article with 52–78 words found. Try refresh.");
}

export { RSS_FEEDS, MIN_WORDS, MAX_WORDS };
