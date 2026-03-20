const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");
const book = require("./books/trading-for-beginners-book");

const ROOT = __dirname;
const OUTPUT = path.join(ROOT, "madeesh-trading-for-the-slightly-confused-full-edition.pdf");
const PAGE = { size: "A4", margins: { top: 64, right: 62, bottom: 64, left: 62 } };
const COLORS = {
  ink: "#161616",
  muted: "#635d56",
  soft: "#7d746a",
  rule: "#d9d9d9",
  gold: "#b79156",
  goldSoft: "#f5f5f5",
  paper: "#ffffff",
  dark: "#10161e",
  darkSoft: "#1b2430",
  teal: "#24525f",
  rose: "#6f3948",
};

function measure(doc, text, options = {}) {
  const { width, font = "Times-Roman", size = 11.5, lineGap = 3 } = options;
  doc.font(font).fontSize(size);
  return doc.heightOfString(text, { width, lineGap });
}

function svgDimensions(svgMarkup) {
  const viewBoxMatch = svgMarkup.match(/viewBox="([\d.\s-]+)"/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  return { width: 900, height: 560 };
}

function buildPdf() {
  const doc = new PDFDocument({
    autoFirstPage: false,
    bufferPages: true,
    size: PAGE.size,
    margins: PAGE.margins,
    info: {
      Title: `${book.title} - ${book.edition}`,
      Author: book.author,
      Subject: "Educational trading manual",
      Keywords: "trading, markets, crypto, stocks, futures, beginner",
      Creator: "Codex",
    },
  });

  const stream = fs.createWriteStream(OUTPUT);
  doc.pipe(stream);

  const pageMeta = [];
  const tocEntries = [];
  const tocPageIndices = [];
  let tocLinkCounter = 0;
  let activeMeta = null;

  const contentWidth = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const contentBottom = () => doc.page.height - doc.page.margins.bottom;
  const x = () => doc.page.margins.left;
  const currentPageNumber = () => pageMeta.length;

  function addPage(meta = {}) {
    doc.addPage(PAGE);
    doc.save();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.paper);
    doc.restore();
    activeMeta = meta;
    pageMeta.push(meta);
  }

  function addTocEntry(level, label, pageNumber, destination) {
    tocEntries.push({ level, label, pageNumber, destination });
  }

  function ensureRoom(height) {
    if (doc.y + height <= contentBottom()) {
      return;
    }

    const continuation = {
      ...activeMeta,
      continuation: true,
    };
    addPage(continuation);
    drawBodyHeader(continuation);
  }

  function drawBodyHeader(meta) {
    const width = contentWidth();
    doc.save();
    doc.strokeColor(COLORS.rule).lineWidth(1);
    doc.moveTo(x(), doc.page.margins.top - 18).lineTo(x() + width, doc.page.margins.top - 18).stroke();
    doc.restore();

    if (meta.chapterLabel) {
      doc.fillColor(COLORS.soft).font("Helvetica-Bold").fontSize(8.5);
      doc.text(meta.chapterLabel.toUpperCase(), x(), doc.page.margins.top - 2, { width: width / 2 });
    }
    if (meta.sectionLabel) {
      doc.fillColor(COLORS.soft).font("Helvetica").fontSize(8.5);
      doc.text(meta.sectionLabel, x(), doc.page.margins.top - 2, { width, align: "right" });
    }
    doc.moveDown(0.6);
  }

  function renderParagraph(text, options = {}) {
    const width = contentWidth();
    const font = options.font || "Times-Roman";
    const size = options.size || 11.6;
    const lineGap = options.lineGap ?? 3;
    const color = options.color || COLORS.ink;
    const gap = options.gap ?? 0.62;
    const height = measure(doc, text, { width, font, size, lineGap });
    ensureRoom(height + 8);
    doc.fillColor(color).font(font).fontSize(size);
    doc.text(text, x(), doc.y, { width, lineGap });
    doc.moveDown(gap);
  }

  function renderSubheading(text) {
    const width = contentWidth();
    const height = measure(doc, text, { width, font: "Times-Bold", size: 17, lineGap: 2 });
    ensureRoom(height + 6);
    doc.fillColor(COLORS.ink).font("Times-Bold").fontSize(17);
    doc.text(text, x(), doc.y, { width, lineGap: 2 });
    doc.moveDown(0.24);
  }

  function renderList(items, ordered = false, options = {}) {
    const width = contentWidth();
    const left = x();
    const markerWidth = options.markerWidth ?? 22;
    const font = options.font || "Times-Roman";
    const size = options.size || 11.3;
    const markerFont = options.markerFont || "Helvetica-Bold";
    const markerSize = options.markerSize || 10.4;
    const color = options.color || COLORS.ink;
    const markerColor = options.markerColor || COLORS.gold;
    const lineGap = options.lineGap ?? 3;
    const itemGap = options.itemGap ?? 0.2;
    const endGap = options.endGap ?? 0.4;
    items.forEach((item, index) => {
      const itemHeight = measure(doc, item, {
        width: width - markerWidth,
        font,
        size,
        lineGap,
      });
      ensureRoom(itemHeight + 6);
      const y = doc.y;
      doc.fillColor(markerColor).font(markerFont).fontSize(markerSize);
      doc.text(ordered ? `${index + 1}.` : "\u2022", left, y, { width: markerWidth });
      doc.fillColor(color).font(font).fontSize(size);
      doc.text(item, left + markerWidth, y, { width: width - markerWidth, lineGap });
      doc.moveDown(itemGap);
    });
    doc.moveDown(endGap);
  }

  function renderCallout(title, text, options = {}) {
    const width = contentWidth();
    const padding = options.padding ?? 14;
    const titleFont = options.titleFont || "Helvetica-Bold";
    const textFont = options.textFont || "Times-Roman";
    const titleSize = options.titleSize ?? 11.4;
    const textSize = options.textSize ?? 11;
    const textLineGap = options.textLineGap ?? 3;
    const radius = options.radius ?? 10;
    const fill = options.fill || COLORS.goldSoft;
    const stroke = options.stroke || COLORS.rule;
    const titleColor = options.titleColor || COLORS.gold;
    const textColor = options.textColor || COLORS.ink;
    const titleHeight = measure(doc, title, {
      width: width - padding * 2,
      font: titleFont,
      size: titleSize,
      lineGap: 1,
    });
    const textHeight = measure(doc, text, {
      width: width - padding * 2,
      font: textFont,
      size: textSize,
      lineGap: textLineGap,
    });
    const blockHeight = padding * 2 + titleHeight + textHeight + 18;
    ensureRoom(blockHeight + 10);
    const y = doc.y;
    doc.save();
    doc.roundedRect(x(), y, width, blockHeight, radius).fillAndStroke(fill, stroke);
    doc.restore();
    doc.fillColor(titleColor).font(titleFont).fontSize(titleSize);
    doc.text(title, x() + padding, y + padding, { width: width - padding * 2 });
    doc.fillColor(textColor).font(textFont).fontSize(textSize);
    doc.text(text, x() + padding, y + padding + titleHeight + 6, {
      width: width - padding * 2,
      lineGap: textLineGap,
    });
    doc.y = y + blockHeight + 12;
  }

  function renderFigure(relativeSrc, caption) {
    const fullPath = path.join(ROOT, relativeSrc);
    if (!fs.existsSync(fullPath)) {
      renderParagraph(caption, {
        size: 10.2,
        font: "Helvetica-Oblique",
        color: COLORS.soft,
      });
      return;
    }

    const svg = fs.readFileSync(fullPath, "utf8");
    const dims = svgDimensions(svg);
    const maxWidth = Math.min(contentWidth(), 520);
    const renderHeight = Math.max(190, Math.min(300, (maxWidth * dims.height) / dims.width));
    const captionHeight = measure(doc, caption, {
      width: contentWidth(),
      font: "Helvetica-Oblique",
      size: 10,
      lineGap: 2,
    });
    ensureRoom(renderHeight + captionHeight + 24);
    const startY = doc.y;
    const imageX = x() + (contentWidth() - maxWidth) / 2;
    doc.save();
    doc.roundedRect(imageX - 8, startY - 8, maxWidth + 16, renderHeight + 16, 10).stroke(COLORS.rule);
    doc.restore();
    SVGtoPDF(doc, svg, imageX, startY, { width: maxWidth, height: renderHeight });
    doc.y = startY + renderHeight + 12;
    doc.fillColor(COLORS.soft).font("Helvetica-Oblique").fontSize(10);
    doc.text(caption, x(), doc.y, { width: contentWidth(), align: "center", lineGap: 2 });
    doc.moveDown(0.8);
  }

  function renderNoteLines(count = 10) {
    const width = contentWidth();
    const needed = count * 20 + 18;
    ensureRoom(needed);
    doc.fillColor(COLORS.soft).font("Helvetica-Bold").fontSize(9);
    doc.text("Notes", x(), doc.y, { width });
    doc.moveDown(0.25);
    for (let index = 0; index < count; index += 1) {
      const y = doc.y + index * 18;
      doc.save();
      doc.strokeColor("#d9d3c7").lineWidth(0.8);
      doc.moveTo(x(), y + 12).lineTo(x() + width, y + 12).stroke();
      doc.restore();
    }
    doc.y += count * 18 + 6;
    doc.moveDown(0.25);
  }

  function estimateListHeight(items, options = {}) {
    const width = contentWidth();
    const markerWidth = options.markerWidth ?? 22;
    const font = options.font || "Times-Roman";
    const size = options.size || 11.3;
    const lineGap = options.lineGap ?? 3;
    const itemGap = options.itemGap ?? 0.2;
    const endGap = options.endGap ?? 0.55;
    const lines = items.reduce((total, item) => {
      return total + measure(doc, item, { width: width - markerWidth, font, size, lineGap }) + 6;
    }, 0);
    return lines + itemGap * 14 * Math.max(items.length - 1, 0) + endGap * 14;
  }

  function estimateSubheadingHeight(text) {
    return measure(doc, text, { width: contentWidth(), font: "Times-Bold", size: 17, lineGap: 2 }) + 18;
  }

  function estimateCalloutHeight(title, text, options = {}) {
    const width = contentWidth();
    const padding = options.padding ?? 14;
    const titleFont = options.titleFont || "Helvetica-Bold";
    const textFont = options.textFont || "Times-Roman";
    const titleSize = options.titleSize ?? 11.4;
    const textSize = options.textSize ?? 11;
    const textLineGap = options.textLineGap ?? 3;
    const titleHeight = measure(doc, title, {
      width: width - padding * 2,
      font: titleFont,
      size: titleSize,
      lineGap: 1,
    });
    const textHeight = measure(doc, text, {
      width: width - padding * 2,
      font: textFont,
      size: textSize,
      lineGap: textLineGap,
    });
    return padding * 2 + titleHeight + textHeight + 30;
  }

  function estimateFigureHeight(relativeSrc, caption) {
    const fullPath = path.join(ROOT, relativeSrc);
    const maxWidth = Math.min(contentWidth(), 520);
    let renderHeight = 260;
    if (fs.existsSync(fullPath)) {
      const svg = fs.readFileSync(fullPath, "utf8");
      const dims = svgDimensions(svg);
      renderHeight = Math.max(190, Math.min(300, (maxWidth * dims.height) / dims.width));
    }
    const captionHeight = measure(doc, caption, {
      width: contentWidth(),
      font: "Helvetica-Oblique",
      size: 10,
      lineGap: 2,
    });
    return renderHeight + captionHeight + 28;
  }

  function estimateBlockHeight(block) {
    if (block.type === "paragraph") {
      return measure(doc, block.text, {
        width: contentWidth(),
        font: "Times-Roman",
        size: 11.6,
        lineGap: 3,
      }) + 14;
    }
    if (block.type === "list") {
      return estimateListHeight(block.items, {});
    }
    if (block.type === "callout") {
      return estimateCalloutHeight(block.title, block.text, {});
    }
    if (block.type === "figure") {
      return estimateFigureHeight(block.src, block.caption);
    }
    return 48;
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

  function renderBlocks(blocks) {
    blocks.forEach((block) => {
      if (block.type === "paragraph") {
        renderParagraph(block.text);
      } else if (block.type === "list") {
        renderList(block.items, block.ordered);
      } else if (block.type === "callout") {
        renderCallout(block.title, block.text);
      } else if (block.type === "figure") {
        renderFigure(block.src, block.caption);
      }
    });
  }

  function coverPage() {
    addPage({ kind: "cover", suppressFooter: true });
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#0d1015");
    const leftX = 82;
    const topY = 112;
    const panelWidth = 170;
    const panelX = doc.page.width - panelWidth - 58;
    const titleWidth = panelX - leftX - 30;
    const badgeY = 462;
    doc.save();
    doc.roundedRect(44, 68, doc.page.width - 88, doc.page.height - 136, 28).lineWidth(1.6).stroke("#8f7347");
    doc.restore();
    doc.save();
    doc.lineWidth(3).strokeColor("#b79156");
    doc.moveTo(68, 96).lineTo(68, doc.page.height - 96).stroke();
    doc.restore();

    doc.fillColor("#b79156").font("Helvetica-Bold").fontSize(10);
    doc.text(book.edition.toUpperCase(), leftX, topY, { width: 220, characterSpacing: 2.2 });
    let coverTitleSize = 35;
    const coverTitleLineGap = 4;
    let coverTitleHeight = measure(doc, book.title, {
      width: titleWidth,
      font: "Times-Bold",
      size: coverTitleSize,
      lineGap: coverTitleLineGap,
    });
    while (coverTitleHeight > 98 && coverTitleSize > 28) {
      coverTitleSize -= 1;
      coverTitleHeight = measure(doc, book.title, {
        width: titleWidth,
        font: "Times-Bold",
        size: coverTitleSize,
        lineGap: coverTitleLineGap,
      });
    }
    const coverTitleY = topY + 48;
    doc.fillColor("#ffffff").font("Times-Bold").fontSize(coverTitleSize);
    doc.text(book.title, leftX, coverTitleY, { width: titleWidth, lineGap: coverTitleLineGap });

    const coverSubtitleY = coverTitleY + coverTitleHeight + 18;
    const coverSubtitleSize = 16;
    const coverSubtitleHeight = measure(doc, book.subtitle, {
      width: titleWidth,
      font: "Times-Roman",
      size: coverSubtitleSize,
      lineGap: 4,
    });
    doc.fillColor("#c8cbd2").font("Times-Roman").fontSize(coverSubtitleSize);
    doc.text(book.subtitle, leftX, coverSubtitleY, { width: titleWidth, lineGap: 4 });

    const coverAuthorY = coverSubtitleY + coverSubtitleHeight + 28;
    doc.fillColor("#aeb4bf").font("Helvetica").fontSize(12);
    doc.text(`Prepared by ${book.author}`, leftX, coverAuthorY, { width: 260 });

    doc.roundedRect(panelX, 126, panelWidth, 286, 18).fillAndStroke("#151920", "#2a313d");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16);
    doc.text("Inside this guide", panelX + 16, 156, { width: panelWidth - 32 });
    doc.fillColor("#c6ccd6").font("Helvetica").fontSize(10.5);
    doc.text(
      [
        "Risk, capital, and market structure",
        "Accounts, execution, and chart reading",
        "Patterns, Fibonacci, and trade planning",
        "Sizing, review, and fraud defense",
      ].join("\n\n"),
      panelX + 16,
      194,
      { width: panelWidth - 32, lineGap: 4 }
    );

    [
      { x: leftX, label: "Audience", value: "First-time traders" },
      { x: leftX + 132, label: "Focus", value: "Stocks, ETFs, crypto" },
      { x: leftX + 264, label: "Style", value: "Clear, practical structure" },
    ].forEach((badge) => {
      doc.roundedRect(badge.x, badgeY, 118, 58, 14).fillAndStroke("#151920", "#2a313d");
      doc.fillColor("#b79156").font("Helvetica-Bold").fontSize(8.4);
      doc.text(badge.label.toUpperCase(), badge.x + 12, badgeY + 13, { width: 94, characterSpacing: 1.1 });
      doc.fillColor("#e7eaef").font("Helvetica").fontSize(10.6);
      doc.text(badge.value, badge.x + 12, badgeY + 29, { width: 94, lineGap: 2 });
    });

    doc.fillColor("#8f97a5").font("Helvetica").fontSize(9.2);
    doc.text(
      "Educational material only. No promise of profit. Verify current operational details against official sources before public use.",
      leftX,
      doc.page.height - 104,
      { width: contentWidth(), lineGap: 3 }
    );
  }

  function titlePage() {
    addPage({ kind: "front", chapterLabel: "Title Page", suppressFooter: true });
    let titlePageSize = 28;
    let titlePageHeight = measure(doc, book.title, {
      width: contentWidth(),
      font: "Times-Bold",
      size: titlePageSize,
      lineGap: 3,
    });
    while (titlePageHeight > 54 && titlePageSize > 24) {
      titlePageSize -= 1;
      titlePageHeight = measure(doc, book.title, {
        width: contentWidth(),
        font: "Times-Bold",
        size: titlePageSize,
        lineGap: 3,
      });
    }
    const titlePageY = 118;
    doc.fillColor(COLORS.ink).font("Times-Bold").fontSize(titlePageSize);
    doc.text(book.title, x(), titlePageY, { width: contentWidth(), lineGap: 3 });

    const titleSubtitleY = titlePageY + titlePageHeight + 12;
    const titleSubtitleHeight = measure(doc, book.subtitle, {
      width: contentWidth(),
      font: "Times-Roman",
      size: 15,
      lineGap: 4,
    });
    doc.fillColor(COLORS.muted).font("Times-Roman").fontSize(15);
    doc.text(book.subtitle, x(), titleSubtitleY, { width: contentWidth(), lineGap: 4 });

    doc.y = titleSubtitleY + titleSubtitleHeight + 28;
    renderParagraph(`Author: ${book.author}`, { font: "Helvetica", size: 11.2, gap: 0.4 });
    renderParagraph(`Edition: ${book.edition}`, { font: "Helvetica", size: 11.2, gap: 0.4 });
    renderParagraph(`Audience: ${book.audience}`, { font: "Helvetica", size: 11.2, gap: 0.4 });

    doc.moveDown(1.6);
    renderParagraph(
      "I wrote this manual as part of the Madeesh P. Nissanka educational library. Official and public-interest sources were used for research and verification, but the explanatory text in this edition is original instructional writing rather than a copied third-party book.",
      { size: 11.4 }
    );
    renderParagraph(
      "Every operational detail tied to brokers, exchanges, products, regulations, and platform workflows should be re-checked against current official documentation before use. This book is designed as an educational manual and is not a substitute for licensed advice.",
      { size: 11.4 }
    );
  }

  function disclaimerPage() {
    addPage({ kind: "front", chapterLabel: "Disclaimer" });
    doc.fillColor(COLORS.ink).font("Times-Bold").fontSize(24);
    doc.text(book.disclaimerTitle.toUpperCase(), x(), 100, { width: contentWidth(), characterSpacing: 1.1 });
    doc.moveDown(1.2);
    book.disclaimerParagraphs.forEach((paragraph) => renderParagraph(paragraph, { size: 11.6 }));
    renderCallout(
      "Reader protection note",
      "If any statement in this guide affects money movement, legal obligations, leverage, margin, taxes, or platform setup, verify it against current official documentation before acting."
    );
  }

  function usagePage() {
    addPage({ kind: "front", chapterLabel: "Using the Guide" });
    doc.fillColor(COLORS.ink).font("Times-Bold").fontSize(24);
    doc.text("How to use this guide", x(), 100, { width: contentWidth() });
    doc.moveDown(1.2);
    renderParagraph(
      "I wrote this guide to be read slowly and used practically. My intention is not to overwhelm you with jargon. It is to help you build a cleaner decision process before real money and real emotion start pressing on that process.",
      { size: 11.4, gap: 0.6 }
    );
    renderList(book.howToUse);
    renderSubheading("Operating principles");
    renderList(book.openingPrinciples);
  }

  function reserveTocPages() {
    for (let index = 0; index < 3; index += 1) {
      addPage({ kind: "toc", chapterLabel: "Contents" });
      tocPageIndices.push(currentPageNumber() - 1);
    }
  }

  function chapterOpener(chapter) {
    addPage({
      kind: "chapter",
      chapterLabel: `Chapter ${chapter.number}`,
      sectionLabel: "",
    });
    const chapterDestination = `toc-dest-${tocLinkCounter++}`;
    doc.addNamedDestination(chapterDestination, "XYZ", x(), doc.page.height - 108, null);
    addTocEntry(0, `Chapter ${chapter.number}  ${chapter.title}`, currentPageNumber(), chapterDestination);
    drawBodyHeader(activeMeta);
    doc.fillColor(COLORS.gold).font("Helvetica-Bold").fontSize(10.6);
    doc.text(`CHAPTER ${chapter.number}`, x(), 108, { width: contentWidth(), characterSpacing: 1.4 });
    const titleY = 138;
    const titleHeight = measure(doc, chapter.title, {
      width: contentWidth(),
      font: "Times-Bold",
      size: 27,
      lineGap: 3,
    });
    doc.fillColor(COLORS.ink).font("Times-Bold").fontSize(27);
    doc.text(chapter.title, x(), titleY, { width: contentWidth(), lineGap: 3 });
    const subtitleY = titleY + titleHeight + 10;
    const subtitleHeight = measure(doc, chapter.subtitle, {
      width: contentWidth(),
      font: "Times-Roman",
      size: 13.6,
      lineGap: 3,
    });
    doc.fillColor(COLORS.muted).font("Times-Roman").fontSize(13.6);
    doc.text(chapter.subtitle, x(), subtitleY, { width: contentWidth(), lineGap: 3 });
    doc.y = subtitleY + subtitleHeight + 28;
    renderParagraph(chapterPreviewText(chapter), {
      size: 11.5,
      color: COLORS.ink,
      gap: 0.65,
    });
    renderParagraph(
      `Key terms for this chapter include ${chapter.keyTerms.join(", ")}. Keep them in working memory as you read so the rest of the chapter feels like process rather than decoration.`,
      { size: 11.3, color: COLORS.muted, gap: 0.7 }
    );
    renderCallout(
      "What I want you to take from this chapter",
      chapter.objectives.join(" ")
    );
  }

  function beginSection(chapter, section) {
    activeMeta.chapterLabel = `Chapter ${chapter.number}`;
    activeMeta.sectionLabel = section.title;
    const headingHeight = measure(doc, section.title, {
      width: contentWidth(),
      font: "Times-Bold",
      size: 20,
      lineGap: 2,
    });
    const firstBlockHeight = section.blocks?.length ? estimateBlockHeight(section.blocks[0]) : 0;
    ensureRoom(headingHeight + firstBlockHeight + 18);
    const sectionDestination = `toc-dest-${tocLinkCounter++}`;
    doc.addNamedDestination(sectionDestination, "XYZ", x(), doc.page.height - doc.y, null);
    addTocEntry(1, section.title, currentPageNumber(), sectionDestination);
    renderSubheading(section.title);
  }

  function renderChapter(chapter) {
    chapterOpener(chapter);
    chapter.sections.forEach((section) => {
      beginSection(chapter, section);
      renderBlocks(section.blocks);
    });
  }

  function chapterWrapPage(chapter) {
    const reviewWorkbookPrompts = [
      ...chapter.reviewQuestions.map((item) => `Review: ${item}`),
      ...chapter.worksheetPrompts.map((item) => `Write: ${item}`),
    ];
    const estimatedHeight =
      44 +
      measure(doc, "Review and workbook", { width: contentWidth(), font: "Times-Bold", size: 20, lineGap: 2 }) +
      measure(doc, "Use this page to compress the chapter into decisions you can actually apply. The aim is clarity, not volume: if you cannot answer these prompts in plain language, the chapter is not learned yet.", {
        width: contentWidth(),
        font: "Times-Roman",
        size: 10.7,
        lineGap: 3,
      }) +
      estimateSubheadingHeight("Core checks") +
      estimateListHeight(chapter.chapterChecklist, {
        size: 10.2,
        markerSize: 9.4,
        endGap: 0.25,
        itemGap: 0.06,
      }) +
      estimateSubheadingHeight("Review and workbook prompts") +
      estimateListHeight(reviewWorkbookPrompts, {
        size: 10.1,
        markerSize: 9.3,
        endGap: 0.25,
        itemGap: 0.05,
      }) +
      (chapter.commonMistakes?.length
        ? estimateSubheadingHeight("Common beginner mistakes") +
          estimateListHeight(chapter.commonMistakes, {
            size: 10.0,
            markerSize: 9.2,
            endGap: 0.2,
            itemGap: 0.04,
          })
        : 0) +
      (chapter.scenarioLab
        ? estimateCalloutHeight(chapter.scenarioLab.title, chapter.scenarioLab.text, {
            padding: 12,
            titleSize: 10.6,
            textSize: 10.2,
            textLineGap: 2,
          }) +
          measure(doc, `Scenario prompts: ${chapter.scenarioLab.prompts.join(" ")}`, {
            width: contentWidth(),
            font: "Times-Roman",
            size: 9.9,
            lineGap: 3,
          }) + 10
        : 0) +
      54;

    const hasRoomOnCurrentPage = doc.y + estimatedHeight <= contentBottom();
    let startY = 112;
    if (hasRoomOnCurrentPage) {
      doc.moveDown(0.2);
      doc.save();
      doc.strokeColor(COLORS.rule).lineWidth(1);
      doc.moveTo(x(), doc.y).lineTo(x() + contentWidth(), doc.y).stroke();
      doc.restore();
      doc.moveDown(0.8);
      activeMeta.sectionLabel = "Review and workbook";
      startY = doc.y;
    } else {
      addPage({
        kind: "review",
        chapterLabel: `Chapter ${chapter.number}`,
        sectionLabel: "Review and workbook",
      });
      drawBodyHeader(activeMeta);
      startY = 112;
    }
    doc.fillColor(COLORS.ink).font("Times-Bold").fontSize(20);
    doc.text("Review and workbook", x(), startY, { width: contentWidth() });
    doc.moveDown(0.7);
    renderParagraph(
      "Use this page to compress the chapter into decisions you can actually apply. The aim is clarity, not volume: if you cannot answer these prompts in plain language, the chapter is not learned yet.",
      { size: 10.7, gap: 0.4 }
    );
    renderSubheading("Core checks");
    renderList(chapter.chapterChecklist, false, {
      size: 10.2,
      markerSize: 9.4,
      endGap: 0.25,
      itemGap: 0.06,
    });

    renderSubheading("Review and workbook prompts");
    renderList(reviewWorkbookPrompts, true, {
      size: 10.1,
      markerSize: 9.3,
      endGap: 0.25,
      itemGap: 0.05,
    });
    if (chapter.commonMistakes?.length) {
      renderSubheading("Common beginner mistakes");
      renderList(chapter.commonMistakes, false, {
        size: 10.0,
        markerSize: 9.2,
        endGap: 0.2,
        itemGap: 0.04,
      });
    }
    if (chapter.scenarioLab) {
      renderCallout(chapter.scenarioLab.title, chapter.scenarioLab.text, {
        padding: 12,
        titleSize: 10.6,
        textSize: 10.2,
        textLineGap: 2,
      });
      renderParagraph(
        `Scenario prompts: ${chapter.scenarioLab.prompts.join(" ")}`,
        { size: 9.9, color: COLORS.muted, gap: 0.25 }
      );
    }
    renderNoteLines(2);
  }

  function renderReferencesGroup(title, references) {
    const headingHeight = measure(doc, title, {
      width: contentWidth(),
      font: "Helvetica-Bold",
      size: 10.6,
    });
    ensureRoom(headingHeight + 12);
    doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(10.6);
    doc.text(title, x(), doc.y, { width: contentWidth() });
    doc.moveDown(0.2);
    references.forEach((reference) => {
      const estimated = measure(doc, reference.title, {
        width: contentWidth(),
        font: "Helvetica-Bold",
        size: 8.7,
      }) +
        measure(doc, reference.url, { width: contentWidth(), font: "Helvetica", size: 7.5 }) +
        (reference.note
          ? measure(doc, reference.note, { width: contentWidth(), font: "Times-Roman", size: 8.1, lineGap: 1 })
          : 0) +
        10;
      ensureRoom(estimated);
      doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(8.7);
      doc.text(reference.title, x(), doc.y, { width: contentWidth() });
      doc.fillColor(COLORS.teal).font("Helvetica").fontSize(7.5);
      doc.text(reference.url, x(), doc.y + 1, { width: contentWidth(), lineGap: 1, link: reference.url });
      if (reference.note) {
        doc.fillColor(COLORS.muted).font("Times-Roman").fontSize(8.1);
        doc.text(reference.note, x(), doc.y + 2, { width: contentWidth(), lineGap: 1 });
      }
      doc.moveDown(0.45);
    });
    doc.moveDown(0.2);
  }

  function appendixPage(appendix) {
    addPage({
      kind: "appendix",
      chapterLabel: "Appendix",
      sectionLabel: appendix.title,
    });
    const appendixDestination = `toc-dest-${tocLinkCounter++}`;
    doc.addNamedDestination(appendixDestination, "XYZ", x(), doc.page.height - 112, null);
    addTocEntry(0, appendix.title, currentPageNumber(), appendixDestination);
    drawBodyHeader(activeMeta);
    doc.fillColor(COLORS.ink).font("Times-Bold").fontSize(22);
    doc.text(appendix.title, x(), 112, { width: contentWidth() });
    doc.fillColor(COLORS.muted).font("Times-Roman").fontSize(13);
    doc.text(appendix.subtitle, x(), 146, { width: contentWidth(), lineGap: 3 });
    doc.moveDown(2);
  }

  function appendixSection(section) {
    renderSubheading(section.title);
    renderBlocks(section.blocks);
    if (section.title.toLowerCase().includes("template")) {
      renderNoteLines(10);
    }
  }

  function referencesPages() {
    addPage({
      kind: "references",
      chapterLabel: "References",
      sectionLabel: "Official and source material",
    });
    const referencesDestination = `toc-dest-${tocLinkCounter++}`;
    doc.addNamedDestination(referencesDestination, "XYZ", x(), doc.page.height - 112, null);
    addTocEntry(0, "References", currentPageNumber(), referencesDestination);
    drawBodyHeader(activeMeta);
    doc.fillColor(COLORS.ink).font("Times-Bold").fontSize(22);
    doc.text("References", x(), 112, { width: contentWidth() });
    doc.moveDown(0.7);
    renderParagraph(
      "The following sources informed the factual and regulatory scaffolding of this edition. The explanatory text in the body of the manual is original instructional writing prepared for this project.",
      { size: 11.2 }
    );
    book.chapters.forEach((chapter) => {
      renderReferencesGroup(`Chapter ${chapter.number}: ${chapter.title}`, chapter.sourceNotes);
    });
    renderReferencesGroup("General references", book.references);
  }

  function fillTocPages() {
    const linesPerPage = 18;
    const chunks = [];
    for (let index = 0; index < tocEntries.length; index += linesPerPage) {
      chunks.push(tocEntries.slice(index, index + linesPerPage));
    }
    while (chunks.length < tocPageIndices.length) {
      chunks.push([]);
    }

    tocPageIndices.forEach((pageIndex, chunkIndex) => {
      doc.switchToPage(pageIndex);
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.paper);
      doc.fillColor(COLORS.ink).font("Times-Bold").fontSize(24);
      doc.text("Contents", x(), 100, { width: contentWidth() });
      doc.fillColor(COLORS.muted).font("Times-Roman").fontSize(12.2);
      doc.text(
        "Chapter openings and section openings are listed with their starting page numbers.",
        x(),
        138,
        { width: contentWidth(), lineGap: 3 }
      );

      let y = 188;
      const entries = chunks[chunkIndex];
      entries.forEach((entry) => {
        const indent = entry.level === 0 ? 0 : 20;
        const labelWidth = contentWidth() - 54 - indent;
        const labelX = x() + indent;
        doc.fillColor(entry.level === 0 ? COLORS.ink : COLORS.muted);
        doc.font(entry.level === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(entry.level === 0 ? 11 : 10.5);
        doc.text(entry.label, labelX, y, { width: labelWidth, lineGap: 2 });
        doc.fillColor(COLORS.ink).font("Helvetica").fontSize(10.5);
        const pageX = x() + contentWidth() - 24;
        doc.text(String(entry.pageNumber), pageX, y, { width: 24, align: "right" });
        doc.goTo(labelX, y, labelWidth, 14, entry.destination);
        doc.goTo(pageX, y, 24, 14, entry.destination);
        doc.save();
        doc.strokeColor("#d8d8d8").lineWidth(0.6);
        doc.moveTo(labelX + labelWidth + 6, y + 9).lineTo(x() + contentWidth() - 30, y + 9).dash(1, { space: 3 }).stroke();
        doc.undash();
        doc.restore();
        y += entry.level === 0 ? 24 : 20;
      });
    });
  }

  function addRunningChrome() {
    const total = pageMeta.length;
    pageMeta.forEach((meta, index) => {
      if (meta.kind === "cover") {
        return;
      }
      doc.switchToPage(index);
      const number = index + 1;
      const width = contentWidth();
      const footerY = doc.page.height - doc.page.margins.bottom - 10;
      if (!meta.suppressFooter) {
        doc.save();
        doc.strokeColor(COLORS.rule).lineWidth(0.8);
        doc.moveTo(x(), footerY - 10).lineTo(x() + width, footerY - 10).stroke();
        doc.restore();
        doc.fillColor(COLORS.soft).font("Helvetica").fontSize(8.3);
        doc.text("Educational only. Not financial advice. No promise of profit.", x(), footerY, {
          width: width - 48,
          align: "left",
        });
      }
      doc.fillColor(COLORS.soft).font("Helvetica").fontSize(8.6);
      doc.text(`${number}`, x(), footerY, { width, align: "right" });
    });
  }

  coverPage();
  titlePage();
  disclaimerPage();
  usagePage();
  reserveTocPages();

  book.chapters.forEach((chapter) => {
    renderChapter(chapter);
    chapterWrapPage(chapter);
  });

  book.appendices.forEach((appendix) => {
    appendixPage(appendix);
    appendix.sections.forEach((section) => appendixSection(section));
  });

  referencesPages();
  fillTocPages();
  addRunningChrome();
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

buildPdf().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
