import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const langTargets = {
  ja: "ja",
  zh: "zh-CN",
  ne: "ne",
};

const keepExact = new Set([
  "Moringa Nepal",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "EN",
  "JP",
  "ZH",
  "NE",
  "USD",
  "Moringa",
]);

const cache = {
  ja: new Map(),
  zh: new Map(),
  ne: new Map(),
};

const cacheFile = join(process.cwd(), "scripts", ".translation-cache.json");
const REQUEST_DELAY_MS = 120;

const languagePatches = {
  ja: {
    Home: "ホーム",
    "About Us": "私たちについて",
    Benefits: "メリット",
    Products: "製品",
    Gallery: "ギャラリー",
    Trust: "信頼",
    Origin: "産地",
    Contact: "お問い合わせ",
    "How to Use": "使い方",
    "View All Products": "すべての製品を見る",
    "Need More Information?": "さらに詳しい情報が必要ですか？",
    FAQ: "よくある質問",
    FAQs: "よくある質問",
    Pages: "ページ",
    Social: "SNS",
    "Trust & Compliance": "信頼とコンプライアンス",
    "\u5bb6": "ホーム",
    "\u63a5\u89e6": "お問い合わせ",
    "Moringa Nepal Gallery": "モリンガネパールギャラリー",
    "Gallery of the Moringa Nepal farm, moringa crops, and production process.": "モリンガネパール農園、モリンガ作物、製造工程のギャラリー。",
    "Moringa Nepal Products": "モリンガネパール製品",
  },
  zh: {
    Home: "首页",
    "About Us": "关于我们",
    Benefits: "益处",
    Products: "产品",
    Gallery: "画廊",
    Trust: "信任",
    Origin: "产地",
    Contact: "联系我们",
    "How to Use": "使用方法",
    "View All Products": "查看所有产品",
    "Need More Information?": "需要更多信息？",
    FAQ: "常见问题",
    FAQs: "常见问题",
    Pages: "页面",
    Social: "社交媒体",
    "Trust & Compliance": "信任与合规",
    "\u5bb6": "首页",
    "\u63a5\u89e6": "联系我们",
    "\u76f8\u4fe1": "信任",
    "\u9875\u6570": "页面",
    "\u5e38\u95ee\u95ee\u9898": "常见问题",
    "Moringa Nepal Gallery": "Moringa Nepal 画廊",
    "Gallery of the Moringa Nepal farm, moringa crops, and production process.": "Moringa Nepal 农场、辣木作物和生产流程的画廊。",
    "Moringa Nepal Products": "Moringa Nepal 产品",
  },
  ne: {
    Home: "गृहपृष्ठ",
    "About Us": "हाम्रो बारेमा",
    Benefits: "फाइदाहरू",
    Products: "उत्पादनहरू",
    Gallery: "ग्यालेरी",
    Trust: "विश्वास",
    Origin: "उत्पत्ति",
    Contact: "सम्पर्क",
    "How to Use": "प्रयोग गर्ने तरिका",
    "View All Products": "सबै उत्पादनहरू हेर्नुहोस्",
    "Need More Information?": "थप जानकारी चाहिन्छ?",
    FAQ: "बारम्बार सोधिने प्रश्नहरू",
    FAQs: "बारम्बार सोधिने प्रश्नहरू",
    Pages: "पृष्ठहरू",
    Social: "सामाजिक सञ्जाल",
    "Trust & Compliance": "विश्वास र अनुपालन",
    "Moringa Nepal Gallery": "Moringa Nepal ग्यालेरी",
    "Gallery of the Moringa Nepal farm, moringa crops, and production process.": "Moringa Nepal फार्म, मोरिंगा बाली र उत्पादन प्रक्रियाको ग्यालेरी।",
    "Moringa Nepal Products": "Moringa Nepal उत्पादनहरू",
  },
};

function shouldTranslate(text) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (keepExact.has(t)) return false;
  if (t.startsWith("http://") || t.startsWith("https://")) return false;
  if (t.includes("@") && t.includes(".")) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  return true;
}

function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

async function translateText(text, lang) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!shouldTranslate(clean)) return clean;
  if (cache[lang].has(clean)) return cache[lang].get(clean);

  const tl = langTargets[lang];
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(clean)}`;

  let translated = clean;
  let didTranslate = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const candidate = Array.isArray(data?.[0]) ? data[0].map((x) => x?.[0] || "").join("") : "";
        if (candidate) {
          translated = candidate;
          didTranslate = translated !== clean;
          break;
        }
      }
    } catch {
      // Retry network/API failures.
    }
    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
  }

  // Avoid caching untranslated fallback English when API is throttled/fails.
  if (didTranslate) {
    cache[lang].set(clean, translated);
  }
  return translated;
}

async function replaceAsync(input, regex, replacer) {
  let out = "";
  let lastIndex = 0;
  for (const match of input.matchAll(regex)) {
    const idx = match.index ?? 0;
    out += input.slice(lastIndex, idx);
    out += await replacer(...match);
    lastIndex = idx + match[0].length;
  }
  out += input.slice(lastIndex);
  return out;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyLanguagePatches(html, lang) {
  const patches = languagePatches[lang];
  if (!patches) return html;

  for (const [source, target] of Object.entries(patches)) {
    const escaped = escapeRegex(source);
    html = html.replace(new RegExp(`>(\\s*)${escaped}(\\s*)<`, "g"), (_, left, right) => `>${left}${target}${right}<`);
    html = html.replace(new RegExp(`"${escaped}"`, "g"), `"${target}"`);
  }
  return html;
}

async function translateFile(filePath, lang) {
  let html = await readFile(filePath, "utf8");

  // Translate common user-facing attributes.
  html = await replaceAsync(
    html,
    /(title|aria-label|alt|content)="([^"]+)"/g,
    async (full, attr, value) => {
      if (!shouldTranslate(value)) return full;
      const translated = await translateText(value, lang);
      return `${attr}="${escapeAttr(translated)}"`;
    }
  );

  // Protect non-visible blocks.
  const blocks = [];
  html = html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, (m) => {
    const id = blocks.length;
    blocks.push(m);
    return `%%${id}%%`;
  });

  // Translate visible text nodes.
  html = await replaceAsync(
    html,
    />([^<]+)</g,
    async (full, text) => {
      const left = text.match(/^\s*/)?.[0] ?? "";
      const right = text.match(/\s*$/)?.[0] ?? "";
      const core = text.trim();
      if (!shouldTranslate(core)) return full;
      const translated = await translateText(core, lang);
      return `>${left}${translated}${right}<`;
    }
  );

  // Restore protected blocks.
  html = html.replace(/%%(\d+)%%/g, (_, n) => blocks[Number(n)] ?? "");
  html = applyLanguagePatches(html, lang);

  await writeFile(filePath, html, "utf8");
}

async function main() {
  try {
    const raw = await readFile(cacheFile, "utf8");
    const parsed = JSON.parse(raw);
    for (const lang of Object.keys(cache)) {
      if (!parsed[lang]) continue;
      for (const [k, v] of Object.entries(parsed[lang])) {
        cache[lang].set(k, v);
      }
    }
  } catch {
    // no cache yet
  }

  const argFiles = process.argv.slice(2);
  const files = argFiles.length ? argFiles : await readdir(process.cwd());
  const targets = files.filter((f) => /-(ja|zh|ne)\.html$/i.test(f));
  for (const file of targets) {
    const lang = file.match(/-(ja|zh|ne)\.html$/i)?.[1];
    if (!lang) continue;
    const path = join(process.cwd(), file);
    await translateFile(path, lang);
    const out = {};
    for (const l of Object.keys(cache)) {
      out[l] = Object.fromEntries(cache[l]);
    }
    await writeFile(cacheFile, JSON.stringify(out), "utf8");
    console.log(`Translated: ${file}`);
  }
  console.log("Localization translation pass complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
