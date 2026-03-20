(() => {
  const form = document.getElementById("inquiry-form");
  const status = document.getElementById("inquiry-status");

  if (!form || !status) {
    return;
  }

  const recipient = "hello@madeeshpnissanka.com";

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = form.elements.namedItem("name")?.value.trim() ?? "";
    const email = form.elements.namedItem("email")?.value.trim() ?? "";
    const topic = form.elements.namedItem("topic")?.value.trim() ?? "";
    const message = form.elements.namedItem("message")?.value.trim() ?? "";

    if (!name || !email || !topic || !message) {
      status.textContent = "Complete every field before opening the inquiry email.";
      return;
    }

    const subject = `[Inquiry Desk] ${topic} | ${name}`;
    const body = [
      `Name: ${name}`,
      `Reply email: ${email}`,
      `Topic: ${topic}`,
      "",
      "Question / description:",
      message,
    ].join("\n");

    status.textContent = "Opening your email client...";
    window.location.href =
      `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();
