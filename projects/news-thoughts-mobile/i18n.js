(() => {
  const english = {
  "description": "News and reflections by Yi Huang, on art, technology, industry and everyday life.",
  "pageTitle": "News & Reflections — Issue 002",
  "skip": "Skip to content",
  "home": "Yi Huang, back to selected reading",
  "name": "YI HUANG",
  "publication": "News & Reflections",
  "openMenu": "Open reading menu",
  "issue": "Issue 002",
  "mainSections": "Main sections",
  "news": "News",
  "thoughts": "Reflections",
  "readingMenu": "Reading menu",
  "closeMenu": "Close reading menu",
  "contents": "Contents",
  "issueSections": "In this issue",
  "selected": "Selected reading",
  "originalArchive": "Original archives",
  "backTests": "Back to tests",
  "allNews": "News archive",
  "thoughtsArchive": "Reflections archive",
  "thinkFurther": "A further thought",
  "chipTitle": "Shared progress and value across the chip industry",
  "chipIntro": "From one lithography machine to collaboration and value across the semiconductor industry.",
  "readSummary": "Read the research note",
  "coverAlt": "An ASML lithography machine in a cleanroom, with its housing open to reveal pipes, optics and mechanical components.",
  "coverCaption": "ASML · Lithography equipment in a cleanroom",
  "credit": "© ASML / WIP",
  "industry": "Industry / Semiconductors",
  "leadTitle": "The world’s most complex machine",
  "by": "Words by",
  "author": "Neil Hacker",
  "standfirst": "Behind a lithography machine lie optics, materials, precision manufacturing and years of collaboration.",
  "introLabel": "Editor’s introduction",
  "introOne": "Chips keep getting smaller, while the systems that make them grow more complex. This essay in Works in Progress traces ASML’s development, from an unproven technology to the suppliers and customers who shared the risks of research and development.",
  "introTwo": "It also leaves a question worth pursuing: when progress is a shared achievement, how should we understand each participant’s contribution and value?",
  "readOriginal": "Read the original",
  "wipName": "Works in Progress",
  "newsIndex": "02 / Notes",
  "designTools": "Semiconductors / Design tools",
  "edaTitle": "From AI-Assisted EDA to AI-Mediated Engineering",
  "eeTimes": "EE Times · From the archive",
  "furtherReading": "Further reading",
  "artViewing": "Art / Looking",
  "museumTitle": "Why Are Museum Wall Texts So Bad?",
  "artnet": "Artnet News · From the archive",
  "oneChart": "In one chart",
  "figureOne": "Fig. 01",
  "cloudTitle": "The cloud has a heavy electricity bill.",
  "energyCaption": "Annual global data centre electricity use",
  "energyUnit": "TWh",
  "estimate": "Estimate",
  "projection": "Projection",
  "chartNote": "In its 2025 base case, the IEA projects that global data centre electricity use will more than double between 2024 and 2030.",
  "dataSource": "Source: ",
  "ieaReport": "IEA, Energy and AI (2025)",
  "chartScope": "Includes all data centres, not only AI. Future values are projections.",
  "newsOriginal": "Visit the original news page",
  "thoughtsIndex": "03 / Thoughts",
  "researchSummary": "Research note",
  "chipBody": "This essay examines the contributions of Huawei, fabless chip designers, electronic design automation and wafer manufacturing to advances in chips, and how technical and market value is distributed among them. From Huawei’s collaboration with foundries to the role of fabless firms in connecting market demand with manufacturing capabilities, it explores how progress is created across the layers of the semiconductor industry.",
  "tagsLabel": "Article tags",
  "chipTag": "Chip design",
  "semiTag": "Semiconductors",
  "edaTag": "EDA tools",
  "fullText": "Read the full essay",
  "journalCategory": "Journal / Making",
  "journalTitle": "The sixteenth to eighteenth of the second month",
  "journalBody": "I have been idle of late and have kept few records of my days. Yet I often stay at home, finding pleasure in editing. It is the form of creation I love, so I keep trying different effects, whether in sound and image or in montage, without tiring of it. For this reason I seldom wish to go out, preferring to concentrate on this and leave other matters aside.",
  "journalMeta": "At home / Editing / Making",
  "continueReading": "Continue reading",
  "thoughtsOriginal": "Visit the original reflections page",
  "backTop": "Back to top",
  "footerCredit": "Yi Huang / Issue 002 / 2026"
};
  const attributes = ["aria-label", "alt", "content"];
  const entries = [...document.querySelectorAll("[data-i18n]")].map((node) => ({
    node, key: node.getAttribute("data-i18n"), chinese: node.textContent,
  }));
  const attributeEntries = attributes.flatMap((attribute) =>
    [...document.querySelectorAll(`[data-i18n-${attribute}]`)].map((node) => ({
      node, attribute, key: node.getAttribute(`data-i18n-${attribute}`),
      chinese: node.getAttribute(attribute),
    })),
  );
  const buttons = [...document.querySelectorAll("[data-language-toggle]")];
  const storageKey = "yi-reading-language";
  let language = "zh";
  try { if (localStorage.getItem(storageKey) === "en") language = "en"; } catch {}

  function applyLanguage(next) {
    language = next === "en" ? "en" : "zh";
    document.documentElement.lang = language === "en" ? "en" : "zh-Hans";
    entries.forEach(({node, key, chinese}) => {
      node.textContent = language === "en" ? english[key] : chinese;
    });
    attributeEntries.forEach(({node, attribute, key, chinese}) => {
      node.setAttribute(attribute, language === "en" ? english[key] : chinese);
    });
    buttons.forEach((button) => {
      button.setAttribute("aria-label", language === "en" ? "切换为中文" : "Switch to English");
      const text = button.querySelector("span");
      text.textContent = language === "en" ? "中文" : "EN";
      text.lang = language === "en" ? "zh-Hans" : "en";
    });
    try { localStorage.setItem(storageKey, language); } catch {}
    document.dispatchEvent(new Event("reading:languagechange"));
  }
  buttons.forEach((button) => button.addEventListener("click", () => {
    applyLanguage(language === "en" ? "zh" : "en");
  }));
  applyLanguage(language);
})();
