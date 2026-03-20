(() => {
  const body = document.querySelector("body.page-book");
  const shell = document.querySelector(".document-shell");

  if (!body || !shell || shell.dataset.bookPaginated === "true") {
    return;
  }

  const escapeHtml = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const renderList = (items, ordered = false) => {
    const tag = ordered ? "ol" : "ul";
    return `<${tag}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</${tag}>`;
  };

  const renderNoteLines = (count) =>
    `<div class="book-note-lines">${Array.from({ length: count }, () => "<span></span>").join("")}</div>`;

  const createPage = (tag, title, html) => {
    const section = document.createElement("section");
    section.className = "panel book-page book-page-generated";
    section.innerHTML = `
      <p class="section-tag">${escapeHtml(tag)}</p>
      <h2>${escapeHtml(title)}</h2>
      <div class="book-page-copy">${html}</div>
    `;
    return section;
  };

  const chapterSections = Array.from(shell.children).filter((section) => {
    const tag = section.querySelector(".section-tag")?.textContent.trim() ?? "";
    return /^Chapter\s+\d+/i.test(tag);
  });

  const cover = shell.querySelector(".book-cover");
  const toc = Array.from(shell.children).find((section) => {
    const tag = section.querySelector(".section-tag")?.textContent.trim() ?? "";
    return tag === "Contents";
  });
  const firstChapter = chapterSections[0];
  const bookTitle = Array.from(shell.querySelectorAll(".book-cover h1 span"))
    .map((node) => node.textContent.trim())
    .join(" ")
    .trim();
  const bookLede = shell.querySelector(".book-cover .hero-lede")?.textContent.trim() ?? "";

  if (!chapterSections.length || !firstChapter || !bookTitle) {
    return;
  }

  const introFragment = document.createDocumentFragment();
  introFragment.append(
    createPage(
      "Study Guide",
      "How to use the full edition",
      `
        <p>${escapeHtml(
          `This manual is built to be read like a working playbook rather than a quick article. Use the chapter pages for the main teaching material, then use the added workbook pages to slow the process down and make the ideas operational.`
        )}</p>
        <p>${escapeHtml(
          `The objective is not just to finish ${bookTitle}. The objective is to turn the chapter ideas into repeatable decisions, better record-keeping, and stronger verification habits.`
        )}</p>
        ${renderList(
          [
            "Read the main chapter first and summarize the idea in your own words.",
            "Pause after each chapter and complete the checklist and review pages.",
            "Keep notes on any term, screen, or workflow that still feels unclear.",
            "Re-check live platform, network, or market details against current official documentation before acting.",
          ],
          true
        )}
      `
    )
  );
  introFragment.append(
    createPage(
      "Verification",
      "Public version and source-check standard",
      `
        <p>${escapeHtml(
          `Outside material was used as research input only. The final manual text is original and should still be verified against current official sources before public release or real-world use.`
        )}</p>
        ${renderList([
          "Date-check time-sensitive facts before publishing or selling the manual.",
          "Compare public claims against official documentation, regulator guidance, or primary-source education pages.",
          "Keep a record of the sources used for each major claim so the public version can be double-checked later.",
          "If a platform workflow, fee model, network label, or contract process changes, update the relevant chapter promptly.",
        ])}
        <p>${escapeHtml(
          `This double-check standard is part of the product, not an afterthought. The cleaner the verification process, the safer the public-facing manual becomes.`
        )}</p>
      `
    )
  );
  shell.insertBefore(introFragment, firstChapter);

  chapterSections.forEach((section, index) => {
    const title = section.querySelector("h2")?.textContent.trim() ?? `Chapter ${index + 1}`;
    const directParagraphs = Array.from(section.children)
      .filter((child) => child.tagName === "P")
      .map((node) => node.textContent.trim())
      .filter(Boolean);
    const summary = directParagraphs[0] ?? `This chapter introduces ${title.toLowerCase()} inside ${bookTitle}.`;
    const support = directParagraphs[1] ?? bookLede;
    const figureCard = section.querySelector(".figure-card");

    const checklistItems = [
      `Restate ${title.toLowerCase()} in plain language before taking any action.`,
      `Identify what must be verified first when working through this chapter in practice.`,
      `Write down the one decision error most likely to appear if this step is rushed.`,
      `Translate the idea into a repeatable checklist rather than a one-time guess.`,
      `Keep screenshots or notes if the chapter involves any live tool, chart, wallet, or platform flow.`,
    ];

    const mistakeItems = [
      `Reading ${title.toLowerCase()} once and assuming the process is now fully understood.`,
      "Moving from theory to execution without documenting the exact steps.",
      "Ignoring verification because the interface or market setup looks familiar.",
      "Letting speed, confidence, or social pressure replace structured review.",
      "Failing to revisit the chapter after something in the real workflow changes.",
    ];

    const reviewQuestions = [
      `What is the core operating idea behind "${title}"?`,
      "What needs to be verified before the chapter guidance is used in the real world?",
      "What are the two most common errors a beginner could make here?",
      "How would you explain this chapter to someone with no technical background?",
      "What note or checklist would make this chapter easier to execute correctly next time?",
    ];

    const worksheetPrompts = [
      `Write a one-sentence summary of ${title.toLowerCase()}.`,
      "List three actions that should happen before execution.",
      "List the main failure signal that would tell you to stop and re-check the process.",
      "List one official source you would verify before using the chapter in public.",
    ];

    const insertAfter = [];
    insertAfter.push(
      createPage(
        `Chapter ${index + 1} Workbook`,
        `${title}: briefing page`,
        `
          <p>${escapeHtml(summary)}</p>
          <p>${escapeHtml(
            `Inside ${bookTitle}, this chapter functions as an operating layer. The goal is not only to understand the idea conceptually, but to know how it changes the way a real decision is made.`
          )}</p>
          <div class="book-callout">
            <p>${escapeHtml(
              `Focus question: If this chapter were the only reference on the desk, what would still need to be verified before you acted?`
            )}</p>
          </div>
          <p>${escapeHtml(support)}</p>
        `
      )
    );

    insertAfter.push(
      createPage(
        `Chapter ${index + 1} Workbook`,
        `${title}: operating checklist`,
        `
          <p>${escapeHtml(
            `Use this page to slow the process down. A chapter becomes useful when it can be converted into a checklist that still works under time pressure.`
          )}</p>
          ${renderList(checklistItems, true)}
        `
      )
    );

    insertAfter.push(
      createPage(
        `Chapter ${index + 1} Workbook`,
        `${title}: failure map`,
        `
          <p>${escapeHtml(
            `Most beginner losses do not come from missing one hidden secret. They come from repeating ordinary mistakes around process, verification, or impatience.`
          )}</p>
          ${renderList(mistakeItems)}
          <p>${escapeHtml(
            `If one of these errors appears while working through ${title.toLowerCase()}, pause the workflow and rebuild the checklist before proceeding.`
          )}</p>
        `
      )
    );

    const scenarioParts = [
      `<p>${escapeHtml(
        `Scenario: a beginner reaches the ${title.toLowerCase()} stage and feels pressure to move quickly because the setup looks obvious on the surface.`
      )}</p>`,
      `<p>${escapeHtml(
        `A better response is to slow the sequence down, compare the chapter logic to the live setup, and confirm that the public explanation, the platform view, and the actual prompt or chart all line up.`
      )}</p>`,
      `<p>${escapeHtml(
        `If anything about the live situation feels harder to explain than the chapter itself, that is a signal to stop and verify rather than improvise.`
      )}</p>`,
    ];

    if (figureCard) {
      scenarioParts.push(figureCard.outerHTML);
    }

    insertAfter.push(
      createPage(
        `Chapter ${index + 1} Workbook`,
        `${title}: scenario lab`,
        scenarioParts.join("")
      )
    );

    insertAfter.push(
      createPage(
        `Chapter ${index + 1} Workbook`,
        `${title}: review questions`,
        `
          <p>${escapeHtml(
            `Use these questions after reading the main chapter. If the answers are vague, the chapter should be reviewed again before it is treated as operational knowledge.`
          )}</p>
          ${renderList(reviewQuestions, true)}
        `
      )
    );

    insertAfter.push(
      createPage(
        `Chapter ${index + 1} Workbook`,
        `${title}: worksheet`,
        `
          <p>${escapeHtml(
            `This worksheet turns the chapter into a written process. Completing it is often more useful than simply re-reading the explanation.`
          )}</p>
          ${renderList(worksheetPrompts)}
          ${renderNoteLines(10)}
        `
      )
    );

    insertAfter.push(
      createPage(
        `Chapter ${index + 1} Workbook`,
        `${title}: verification notes`,
        `
          <p>${escapeHtml(
            `Before a public version of this chapter is published or sold, the operational details should be checked one more time against official documentation or primary-source guidance.`
          )}</p>
          ${renderList([
            `Mark the date when ${title.toLowerCase()} was last verified.`,
            "Record the official source that confirmed the current workflow or concept.",
            "Note any differences between the public explanation and the live product or market environment.",
            "Write down what would require a chapter update in the future.",
          ])}
          ${renderNoteLines(8)}
        `
      )
    );

    let reference = section;
    insertAfter.forEach((page) => {
      reference.insertAdjacentElement("afterend", page);
      reference = page;
    });
  });

  const pages = Array.from(shell.children).filter(
    (section) => section.tagName === "SECTION" && section.classList.contains("panel")
  );

  const totalPages = pages.length;
  pages.forEach((page, index) => {
    page.classList.add("book-page");
    if (!page.querySelector(".book-page-meta")) {
      const meta = document.createElement("div");
      meta.className = "book-page-meta";
      meta.innerHTML = `
        <span class="book-page-count">Page ${index + 1} of ${totalPages}</span>
        <span class="book-page-label">${escapeHtml(bookTitle)}</span>
      `;
      page.prepend(meta);
    }
  });

  if (cover) {
    const metaGrid = cover.querySelector(".book-meta-grid");
    if (metaGrid && !metaGrid.querySelector("[data-book-length='true']")) {
      const card = document.createElement("article");
      card.className = "book-meta-card";
      card.dataset.bookLength = "true";
      card.innerHTML = `
        <span class="book-meta-label">Length</span>
        <p class="book-meta-value">${totalPages} page layout</p>
      `;
      metaGrid.append(card);
    }
  }

  shell.dataset.bookPaginated = "true";
})();
