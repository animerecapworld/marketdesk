const fs = require("fs");
const path = require("path");

function loadBookModule() {
  const candidates = [
    path.join(__dirname, "books", "trading-for-beginners-book.js"),
    path.join(__dirname, "..", "working-finance-site", "books", "trading-for-beginners-book.js"),
    path.join(
      __dirname,
      "..",
      "backups",
      "marketdesk-backup-20260320-042029",
      "1. Trial 01",
      "books",
      "trading-for-beginners-book.js"
    ),
  ];

  const source = candidates.find((candidate) => fs.existsSync(candidate));
  if (!source) {
    throw new Error("Unable to locate trading-for-beginners-book.js in the current or archived workspaces.");
  }

  return require(source);
}

const book = loadBookModule();
const OUTPUT = path.join(__dirname, "trading-for-beginners-full.html");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function splitTitle(title) {
  if (title === "Trading for the Slightly Confused") {
    return ["Trading for the", "Slightly Confused."];
  }

  const words = title.trim().split(/\s+/);
  if (words.length < 4) {
    return [title, ""];
  }

  return [words.slice(0, Math.ceil(words.length / 2)).join(" "), `${words.slice(Math.ceil(words.length / 2)).join(" ")}.`];
}

function renderList(items, ordered = false, className = "") {
  if (!items || !items.length) {
    return "";
  }

  const tag = ordered ? "ol" : "ul";
  const attr = className ? ` class="${className}"` : "";
  const rows = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<${tag}${attr}>${rows}</${tag}>`;
}

function renderLinks(items, className = "book-source-list") {
  if (!items || !items.length) {
    return "";
  }

  const rows = items
    .map((item) => `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></li>`)
    .join("");
  return `<ul class="${className}">${rows}</ul>`;
}

function renderFigureCard(block) {
  return `
    <article class="figure-card">
      <img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.caption || "")}" />
      <p class="figure-caption">${escapeHtml(block.caption || "")}</p>
    </article>
  `;
}

function renderBlocks(blocks) {
  let html = "";
  let figureCards = [];

  const flushFigures = () => {
    if (!figureCards.length) {
      return;
    }
    html += `<div class="figure-grid">${figureCards.join("")}</div>`;
    figureCards = [];
  };

  for (const block of blocks) {
    if (block.type === "figure") {
      figureCards.push(renderFigureCard(block));
      continue;
    }

    flushFigures();

    if (block.type === "paragraph") {
      html += `<p>${escapeHtml(block.text)}</p>`;
      continue;
    }

    if (block.type === "list") {
      html += renderList(block.items, block.ordered, block.ordered ? "document-steps" : "book-source-list");
      continue;
    }

    if (block.type === "callout") {
      html += `
        <div class="book-callout">
          <p><strong>${escapeHtml(block.title)}:</strong> ${escapeHtml(block.text)}</p>
        </div>
      `;
    }
  }

  flushFigures();
  return html;
}

function chapterPreviewText(chapter) {
  if (!chapter.objectives.length) {
    return chapter.subtitle;
  }

  if (chapter.objectives.length === 1) {
    return `In this chapter, I want to help you ${chapter.objectives[0].replace(/\.$/, "").toLowerCase()}.`;
  }

  return `In this chapter, I want to help you do three things: ${chapter.objectives.join(" ")}`;
}

function renderChapter(chapter) {
  const sectionHtml = chapter.sections
    .map(
      (section) => `
        <h3>${escapeHtml(section.title)}</h3>
        ${renderBlocks(section.blocks)}
      `
    )
    .join("");

  return `
    <section class="panel document-section">
      <p class="section-tag">Chapter ${chapter.number}</p>
      <h2>${escapeHtml(chapter.title)}</h2>
      <p>${escapeHtml(chapter.subtitle)}</p>
      <div class="book-split">
        <div>
          <h3>Objectives</h3>
          ${renderList(chapter.objectives, true, "document-steps")}
          <h3>Key terms</h3>
          <p>${escapeHtml(chapter.keyTerms.join(", "))}</p>
        </div>
        <aside class="book-callout">
          <p>${escapeHtml(chapterPreviewText(chapter))}</p>
        </aside>
      </div>
      ${sectionHtml}
      <h3>Chapter checklist</h3>
      ${renderList(chapter.chapterChecklist, false, "book-source-list")}
      <h3>Review questions</h3>
      ${renderList(chapter.reviewQuestions, true, "document-steps")}
      <h3>Common mistakes</h3>
      ${renderList(chapter.commonMistakes, false, "book-source-list")}
      <h3>${escapeHtml(chapter.scenarioLab.title)}</h3>
      <div class="book-callout">
        <p>${escapeHtml(chapter.scenarioLab.text)}</p>
      </div>
      ${renderList(chapter.scenarioLab.prompts, true, "document-steps")}
      <h3>Verification checklist</h3>
      ${renderList(chapter.verificationChecklist, false, "book-source-list")}
      <h3>Worksheet prompts</h3>
      ${renderList(chapter.worksheetPrompts, false, "book-source-list")}
      <h3>Primary sources</h3>
      ${renderLinks(chapter.sourceNotes)}
    </section>
  `;
}

const [titleLineOne, titleLineTwo] = splitTitle(book.title);

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(book.title)} Full Edition | Madeesh P. Nissanka</title>
    <meta
      name="description"
      content="${escapeHtml(book.subtitle)}"
    />
    <meta name="robots" content="index,follow" />
    <meta name="theme-color" content="#06080d" />
    <link rel="canonical" href="https://madeeshmarkets.xyz/trading-for-beginners-full.html" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="icon" type="image/svg+xml" href="favicon.svg" />
    <link rel="manifest" href="site.webmanifest" />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body class="page page-book">
    <div class="site-bg"></div>
    <div class="page-shell">
      <header class="site-header">
        <div class="topbar">
          <a class="brand" href="/">
            <span class="brand-name">Madeesh P. Nissanka</span>
            <span class="brand-tag">Official markets profile</span>
          </a>
          <nav class="nav-links" aria-label="Primary">
            <a href="/">Home</a>
            <a href="markets.html">Market Desk</a>
            <a href="bio.html">Bio</a>
            <div class="nav-dropdown">
              <a class="nav-dropdown-trigger is-active" href="manual.html">Products</a>
              <div class="nav-flyout" aria-label="Product guides">
                <p class="nav-flyout-label">Guide Library</p>
                <p class="nav-flyout-copy">
                  Beginner manuals, setup guides, and operational handbooks.
                </p>
                <div class="nav-flyout-grid">
                  <a href="trading-for-beginners.html">
                    <span class="nav-guide-title">Trading for the Slightly Confused</span>
                    <span class="nav-guide-meta">Charts, trend, entries, exits, and risk</span>
                  </a>
                  <a href="wallet-dex-starter-guide.html">
                    <span class="nav-guide-title">Wallet and DEX Starter Guide</span>
                    <span class="nav-guide-meta">Wallet setup, swaps, approvals, and safety</span>
                  </a>
                  <a href="exchange-setup-guide.html">
                    <span class="nav-guide-title">Exchange Setup Guide</span>
                    <span class="nav-guide-meta">Onboarding, security, and transfer basics</span>
                  </a>
                  <a href="testnet-participation-guide.html">
                    <span class="nav-guide-title">Testnet Participation Guide</span>
                    <span class="nav-guide-meta">Faucets, wallets, bridges, and participation flow</span>
                  </a>
                  <a href="free-opportunities-guide.html">
                    <span class="nav-guide-title">Free Opportunities Guide</span>
                    <span class="nav-guide-meta">Quests, points, and participation systems</span>
                  </a>
                  <a href="risk-safety-handbook.html">
                    <span class="nav-guide-title">Risk and Safety Handbook</span>
                    <span class="nav-guide-meta">Scams, wallet hygiene, and approval defense</span>
                  </a>
                </div>
              </div>
            </div>
            <a href="https://www.cmegroup.com/markets/cryptocurrencies/bitcoin/bitcoin.quotes.html" target="_blank" rel="noreferrer">CME BTC</a>
            <a href="https://www.cmegroup.com/markets/equities/sp/micro-e-mini-sandp-500.quotes.html" target="_blank" rel="noreferrer">CME MES</a>
          </nav>
        </div>
      </header>

      <main class="document-shell" data-skip-pagination-intro="true" data-pagination-variant="compact">
        <section class="panel book-cover">
          <div class="book-cover-layout">
            <div class="book-cover-art">
              <img src="trading-for-the-slightly-confused-cover.svg" alt="Trading for the Slightly Confused cover" />
            </div>
            <div class="book-cover-copy">
              <p class="section-tag">${escapeHtml(book.edition)}</p>
              <h1>
                <span>${escapeHtml(titleLineOne)}</span>
                <span>${escapeHtml(titleLineTwo)}</span>
              </h1>
              <p class="hero-lede">${escapeHtml(book.subtitle)}</p>
              <div class="book-meta-grid">
                <article class="book-meta-card">
                  <span class="book-meta-label">Prepared by</span>
                  <p class="book-meta-value">${escapeHtml(book.author)}</p>
                </article>
                <article class="book-meta-card">
                  <span class="book-meta-label">Audience</span>
                  <p class="book-meta-value">${escapeHtml(book.audience)}</p>
                </article>
                <article class="book-meta-card">
                  <span class="book-meta-label">Scope</span>
                  <p class="book-meta-value">Stocks, ETFs, crypto spot, and listed futures</p>
                </article>
                <article class="book-meta-card">
                  <span class="book-meta-label">Structure</span>
                  <p class="book-meta-value">${book.chapters.length} chapters with workbook pages and source notes</p>
                </article>
              </div>
              <div class="hero-actions">
                <a
                  class="button button-primary"
                  href="madeesh-trading-for-the-slightly-confused-full-edition.pdf"
                  download="madeesh-trading-for-the-slightly-confused-full-edition.pdf"
                >Download Full Edition</a>
                <a class="button button-secondary" href="trading-for-beginners.html">Back to Guide</a>
              </div>
            </div>
          </div>
        </section>

        <section class="panel book-disclaimer-page">
          <p class="section-tag">${escapeHtml(book.disclaimerTitle)}</p>
          <h2>Important educational, regulatory, and legal notice</h2>
          ${book.disclaimerParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        </section>

        <section class="panel document-section">
          <p class="section-tag">How To Use</p>
          <h2>Read it like a working manual</h2>
          <p>
            This edition is meant to be studied in sequence. The early chapters establish risk,
            market structure, accounts, and execution before later sections expand into patterns,
            planning, and review.
          </p>
          ${renderList(book.howToUse, true, "document-steps")}
        </section>

        <section class="panel document-section">
          <p class="section-tag">Operating Principles</p>
          <h2>The rules that should survive every market phase</h2>
          <div class="book-callout">
            <p>These principles are the backbone of the manual. They are supposed to remain useful even when the setup, product, or market tone changes.</p>
          </div>
          ${renderList(book.openingPrinciples, false, "book-source-list")}
        </section>

        <section class="panel resource-panel">
          <div class="section-heading">
            <div>
              <p class="section-tag">Contents</p>
              <h2>Full chapter map</h2>
            </div>
            <p class="section-note">This web edition is synced to the full source book rather than the earlier short-form upload.</p>
          </div>
          <div class="book-toc-grid">
            ${book.chapters
              .map(
                (chapter) => `
                  <article class="chapter-card">
                    <span class="chapter-index">${String(chapter.number).padStart(2, "0")}</span>
                    <h3>${escapeHtml(chapter.title)}</h3>
                    <p>${escapeHtml(chapter.subtitle)}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        ${book.chapters.map(renderChapter).join("")}

        <section class="panel book-signoff">
          <p class="section-tag">Publication Note</p>
          <h2>End of full edition</h2>
          <p>
            This edition is the long-form beginner manual for the Madeesh P. Nissanka educational
            library and is intended to read like a durable operating guide rather than a short web article.
          </p>
          <p>Educational only. Not financial advice.</p>
          <p class="book-signature">${escapeHtml(book.author)}</p>
        </section>
      </main>

      <footer class="site-footer">
        <p>${escapeHtml(book.title)} Full Edition.</p>
        <p>Educational only. Not financial advice.</p>
      </footer>
    </div>
    <script src="book-pagination.js" defer></script>
  </body>
</html>
`;

fs.writeFileSync(OUTPUT, html);
console.log(path.basename(OUTPUT));
