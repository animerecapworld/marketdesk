const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");

const ROOT = __dirname;
const PAGE_MARGINS = { top: 56, right: 58, bottom: 58, left: 58 };
const FOOTER_TEXT =
  "Educational material only. Madeesh P. Nissanka is not a financial advisor. No promise of profit.";

const BOOKS = [
  {
    html: "trading-for-beginners-full.html",
    pdf: "madeesh-trading-for-the-slightly-confused-full-edition.pdf",
  },
  {
    html: "wallet-dex-starter-guide-full.html",
    pdf: "madeesh-wallet-and-dex-starter-guide-full-edition.pdf",
  },
  {
    html: "exchange-setup-guide-full.html",
    pdf: "madeesh-exchange-setup-guide-full-edition.pdf",
  },
  {
    html: "testnet-participation-guide-full.html",
    pdf: "madeesh-testnet-participation-guide-full-edition.pdf",
  },
  {
    html: "free-opportunities-guide-full.html",
    pdf: "madeesh-free-opportunities-guide-full-edition.pdf",
  },
  {
    html: "risk-safety-handbook-full.html",
    pdf: "madeesh-risk-and-safety-handbook-full-edition.pdf",
  },
];

const paginationScript = fs.readFileSync(path.join(ROOT, "book-pagination.js"), "utf8");

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function firstHeadingChild(section) {
  return Array.from(section.children).find((child) => /^H[123]$/.test(child.tagName)) ?? null;
}

function directListItems(list) {
  return Array.from(list.children)
    .filter((child) => child.tagName === "LI")
    .map((item) => cleanText(item.textContent))
    .filter(Boolean);
}

function svgDimensions(svgMarkup) {
  const viewBoxMatch = svgMarkup.match(/viewBox="([\d.\s-]+)"/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1]
      .trim()
      .split(/\s+/)
      .map((value) => Number(value));
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const widthMatch = svgMarkup.match(/width="([\d.]+)"/i);
  const heightMatch = svgMarkup.match(/height="([\d.]+)"/i);
  if (widthMatch && heightMatch) {
    return { width: Number(widthMatch[1]), height: Number(heightMatch[1]) };
  }

  return { width: 900, height: 560 };
}

function extractFigure(card) {
  const image = card.querySelector("img");
  if (!image) {
    return null;
  }

  const source = image.getAttribute("src");
  if (!source) {
    return null;
  }

  return {
    type: "figure",
    src: path.join(ROOT, source),
    caption: cleanText(card.querySelector(".figure-caption")?.textContent ?? image.alt ?? ""),
    alt: cleanText(image.alt ?? ""),
  };
}

function extractBlocks(node, blocks = []) {
  for (const child of Array.from(node.children)) {
    if (
      child.classList.contains("book-page-meta") ||
      child.classList.contains("hero-actions") ||
      child.classList.contains("section-tag")
    ) {
      continue;
    }

    if (child.classList.contains("book-meta-grid")) {
      const items = Array.from(child.children)
        .map((card) => {
          const label = cleanText(card.querySelector(".book-meta-label")?.textContent ?? "");
          const value = cleanText(card.querySelector(".book-meta-value")?.textContent ?? "");
          return label && value ? `${label}: ${value}` : value;
        })
        .filter(Boolean);
      if (items.length) {
        blocks.push({ type: "list", ordered: false, items });
      }
      continue;
    }

    if (child.classList.contains("book-toc-grid")) {
      const items = Array.from(child.children)
        .map((card) => {
          const index = cleanText(card.querySelector(".chapter-index")?.textContent ?? "");
          const title = cleanText(card.querySelector("h3")?.textContent ?? "");
          const description = cleanText(card.querySelector("p")?.textContent ?? "");
          return [index, title, description].filter(Boolean).join(" - ");
        })
        .filter(Boolean);
      if (items.length) {
        blocks.push({ type: "list", ordered: false, items });
      }
      continue;
    }

    if (child.classList.contains("figure-grid")) {
      for (const figure of Array.from(child.children)) {
        const block = extractFigure(figure);
        if (block) {
          blocks.push(block);
        }
      }
      continue;
    }

    if (child.classList.contains("figure-card")) {
      const block = extractFigure(child);
      if (block) {
        blocks.push(block);
      }
      continue;
    }

    if (child.classList.contains("book-callout")) {
      const text = cleanText(child.textContent);
      if (text) {
        blocks.push({ type: "callout", title: "Desk Note", text });
      }
      continue;
    }

    if (child.classList.contains("chapter-card")) {
      const title = cleanText(child.querySelector("h3")?.textContent ?? "Chapter");
      const text = cleanText(child.querySelector("p")?.textContent ?? "");
      blocks.push({ type: "callout", title, text });
      continue;
    }

    if (child.classList.contains("book-note-lines")) {
      blocks.push({ type: "notes", count: child.querySelectorAll("span").length || 8 });
      continue;
    }

    if (/^H[123]$/.test(child.tagName)) {
      blocks.push({ type: "subheading", text: cleanText(child.textContent) });
      continue;
    }

    if (child.tagName === "P") {
      const text = cleanText(child.textContent);
      if (text) {
        const signature = child.classList.contains("book-signature");
        blocks.push({ type: signature ? "signature" : "paragraph", text });
      }
      continue;
    }

    if (child.tagName === "UL" || child.tagName === "OL") {
      const items = directListItems(child);
      if (items.length) {
        blocks.push({ type: "list", ordered: child.tagName === "OL", items });
      }
      continue;
    }

    extractBlocks(child, blocks);
  }

  return blocks;
}

function loadBook(book) {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, book.html), "utf8"), {
    runScripts: "outside-only",
  });
  dom.window.eval(paginationScript);

  const shell = dom.window.document.querySelector(".document-shell");
  const sections = Array.from(shell.querySelectorAll(":scope > section.panel"));

  const pages = sections.map((section) => {
    const heading = firstHeadingChild(section);
    const sectionTag = cleanText(
      Array.from(section.children).find((child) => child.classList.contains("section-tag"))
        ?.textContent ?? ""
    );
    const title = cleanText(heading?.textContent ?? sectionTag ?? "Guide Page");
    return {
      sectionTag,
      title,
      isCover: section.classList.contains("book-cover"),
      blocks: extractBlocks(section),
    };
  });

  return {
    title: pages[0]?.title ?? book.html,
    pages,
    pdf: path.join(ROOT, book.pdf),
  };
}

function createContext(doc, bookTitle) {
  let currentPage = null;

  const contentWidth = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const usableBottom = () => doc.page.height - doc.page.margins.bottom - 26;

  function startPage(sectionTag, title, options = {}) {
    doc.addPage({ size: "A4", margins: PAGE_MARGINS });
    currentPage = {
      sectionTag: sectionTag || "Guide Page",
      title: title || bookTitle,
    };

    const x = doc.page.margins.left;
    const width = contentWidth();
    const tag = currentPage.sectionTag.toUpperCase();

    doc.save();
    doc.strokeColor("#d0d0d0").lineWidth(1);
    doc.moveTo(x, doc.page.margins.top - 20).lineTo(x + width, doc.page.margins.top - 20).stroke();
    doc.restore();

    doc.fillColor("#666666").font("Helvetica-Bold").fontSize(9);
    doc.text(tag, x, doc.page.margins.top, { width, align: "left" });

    doc.fillColor("#111111").font("Times-Bold").fontSize(options.cover ? 28 : 22);
    doc.text(currentPage.title, x, doc.y + 8, { width, align: "left" });
    doc.moveDown(options.cover ? 0.8 : 0.45);
  }

  function ensureRoom(height) {
    if (doc.y + height <= usableBottom()) {
      return;
    }

    startPage(currentPage.sectionTag, `${currentPage.title} continued`);
  }

  function renderParagraph(text, options = {}) {
    const width = contentWidth();
    doc.font(options.font ?? "Helvetica");
    doc.fontSize(options.size ?? 11.3);
    const height = doc.heightOfString(text, { width, lineGap: 4 });
    ensureRoom(height + 12);
    doc.fillColor(options.color ?? "#171717");
    doc.text(text, { width, lineGap: 4 });
    doc.moveDown(options.gap ?? 0.8);
  }

  function renderSubheading(text) {
    const width = contentWidth();
    doc.font("Times-Bold").fontSize(16);
    const height = doc.heightOfString(text, { width, lineGap: 2 });
    ensureRoom(height + 14);
    doc.fillColor("#111111");
    doc.text(text, { width, lineGap: 2 });
    doc.moveDown(0.55);
  }

  function renderList(items, ordered) {
    const width = contentWidth();
    const left = doc.page.margins.left;
    const markerWidth = 20;

    for (const [index, item] of items.entries()) {
      doc.font("Helvetica").fontSize(11.1);
      const height = doc.heightOfString(item, { width: width - markerWidth, lineGap: 4 });
      ensureRoom(height + 6);

      const y = doc.y;
      doc.fillColor("#222222").font("Helvetica-Bold").fontSize(10.5);
      doc.text(ordered ? `${index + 1}.` : "\u2022", left, y, { width: markerWidth });

      doc.fillColor("#171717").font("Helvetica").fontSize(11.1);
      doc.text(item, left + markerWidth, y, { width: width - markerWidth, lineGap: 4 });
      doc.moveDown(0.2);
    }

    doc.moveDown(0.6);
  }

  function renderCallout(title, text) {
    const width = contentWidth();
    const padding = 14;

    doc.font("Helvetica-Bold").fontSize(11.8);
    const titleHeight = doc.heightOfString(title, { width: width - padding * 2 });
    doc.font("Helvetica").fontSize(11);
    const textHeight = doc.heightOfString(text, { width: width - padding * 2, lineGap: 4 });
    const blockHeight = titleHeight + textHeight + padding * 2 + 10;

    ensureRoom(blockHeight + 10);

    const x = doc.page.margins.left;
    const y = doc.y;
    doc.save();
    doc.roundedRect(x, y, width, blockHeight, 10).fillAndStroke("#f6f3ec", "#d1b98a");
    doc.restore();

    doc.fillColor("#76592d").font("Helvetica-Bold").fontSize(11.8);
    doc.text(title, x + padding, y + padding - 1, { width: width - padding * 2 });
    doc.fillColor("#1a1a1a").font("Helvetica").fontSize(11);
    doc.text(text, x + padding, doc.y + 6, { width: width - padding * 2, lineGap: 4 });
    doc.y = y + blockHeight + 12;
  }

  function renderNotes(count) {
    const width = contentWidth();
    const x = doc.page.margins.left;
    const lineHeight = 19;
    const totalHeight = count * lineHeight + 10;
    ensureRoom(totalHeight + 10);

    doc.fillColor("#666666").font("Helvetica-Bold").fontSize(9.5);
    doc.text("Worksheet notes", x, doc.y, { width });
    doc.moveDown(0.35);

    for (let index = 0; index < count; index += 1) {
      const y = doc.y + index * lineHeight;
      doc.save();
      doc.strokeColor("#cccccc").lineWidth(0.8);
      doc.moveTo(x, y + 12).lineTo(x + width, y + 12).stroke();
      doc.restore();
    }

    doc.y += count * lineHeight + 6;
    doc.moveDown(0.35);
  }

  function renderFigure(block) {
    if (!fs.existsSync(block.src)) {
      if (block.caption) {
        renderParagraph(block.caption, { size: 10.3, font: "Helvetica-Oblique", color: "#555555" });
      }
      return;
    }

    const width = Math.min(contentWidth(), 430);
    let height = 230;
    let svgMarkup = null;

    if (block.src.toLowerCase().endsWith(".svg")) {
      svgMarkup = fs.readFileSync(block.src, "utf8");
      const svgSize = svgDimensions(svgMarkup);
      height = Math.max(180, Math.min(300, (width * svgSize.height) / svgSize.width));
    } else {
      const image = doc.openImage(block.src);
      height = Math.max(180, Math.min(300, (width * image.height) / image.width));
    }

    const captionHeight = block.caption
      ? doc.heightOfString(block.caption, {
          width: contentWidth(),
          lineGap: 2,
        })
      : 0;

    ensureRoom(height + captionHeight + 20);

    const x = doc.page.margins.left + (contentWidth() - width) / 2;
    const y = doc.y;
    doc.save();
    doc.roundedRect(x - 6, y - 6, width + 12, height + 12, 10).stroke("#d7d7d7");
    doc.restore();

    if (svgMarkup) {
      SVGtoPDF(doc, svgMarkup, x, y, { width, height });
    } else {
      doc.image(block.src, x, y, { fit: [width, height], align: "center" });
    }

    doc.y = y + height + 10;
    if (block.caption) {
      doc.fillColor("#555555").font("Helvetica-Oblique").fontSize(10.1);
      doc.text(block.caption, doc.page.margins.left, doc.y, {
        width: contentWidth(),
        align: "center",
        lineGap: 2,
      });
      doc.moveDown(0.8);
    }
  }

  function renderSignature(text) {
    const width = contentWidth();
    doc.font("Times-Italic").fontSize(21);
    const height = doc.heightOfString(text, { width });
    ensureRoom(height + 8);
    doc.fillColor("#222222");
    doc.text(text, { width });
    doc.moveDown(0.45);
  }

  function renderBlock(block) {
    if (block.type === "paragraph") {
      renderParagraph(block.text);
      return;
    }

    if (block.type === "subheading") {
      renderSubheading(block.text);
      return;
    }

    if (block.type === "list") {
      renderList(block.items, block.ordered);
      return;
    }

    if (block.type === "callout") {
      renderCallout(block.title, block.text);
      return;
    }

    if (block.type === "notes") {
      renderNotes(block.count);
      return;
    }

    if (block.type === "figure") {
      renderFigure(block);
      return;
    }

    if (block.type === "signature") {
      renderSignature(block.text);
    }
  }

  return {
    startPage,
    renderBlock,
  };
}

async function writePdf(book) {
  const data = loadBook(book);
  const output = fs.createWriteStream(data.pdf);
  const doc = new PDFDocument({
    autoFirstPage: false,
    bufferPages: true,
    size: "A4",
    margins: PAGE_MARGINS,
    info: {
      Title: data.title,
      Author: "Madeesh P. Nissanka",
      Subject: "Educational guide",
      Keywords: "markets, crypto, trading, guide, education",
    },
  });

  doc.pipe(output);

  const renderer = createContext(doc, data.title);

  for (const page of data.pages) {
    renderer.startPage(page.sectionTag, page.title, { cover: page.isCover });
    for (const block of page.blocks) {
      renderer.renderBlock(block);
    }
  }

  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(index);
    const x = doc.page.margins.left;
    const y = doc.page.height - 30;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.save();
    doc.strokeColor("#d0d0d0").lineWidth(0.8);
    doc.moveTo(x, y - 10).lineTo(x + width, y - 10).stroke();
    doc.restore();

    doc.fillColor("#666666").font("Helvetica").fontSize(8.2);
    doc.text(FOOTER_TEXT, x, y, { width: width - 54, align: "left", lineBreak: false });
    doc.text(`Page ${index + 1} of ${range.count}`, x, y, { width, align: "right", lineBreak: false });
  }

  doc.end();

  await new Promise((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
  });

  return { pdf: data.pdf };
}

async function main() {
  for (const book of BOOKS) {
    const result = await writePdf(book);
    const size = fs.statSync(result.pdf).size;
    console.log(`${path.basename(result.pdf)}\t${size}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
