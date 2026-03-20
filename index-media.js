(() => {
  const carousels = document.querySelectorAll("[data-carousel]");

  carousels.forEach((carousel) => {
    const slides = Array.from(carousel.querySelectorAll(".media-slide"));
    const dots = Array.from(carousel.querySelectorAll(".media-dot"));
    let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));

    if (!slides.length || slides.length !== dots.length) {
      return;
    }

    if (activeIndex < 0) {
      activeIndex = 0;
      slides[0].classList.add("is-active");
      dots[0].classList.add("is-active");
    }

    const setActive = (nextIndex) => {
      slides[activeIndex]?.classList.remove("is-active");
      dots[activeIndex]?.classList.remove("is-active");
      activeIndex = (nextIndex + slides.length) % slides.length;
      slides[activeIndex]?.classList.add("is-active");
      dots[activeIndex]?.classList.add("is-active");
    };

    let timerId = window.setInterval(() => {
      setActive(activeIndex + 1);
    }, 3800);

    const resetTimer = () => {
      window.clearInterval(timerId);
      timerId = window.setInterval(() => {
        setActive(activeIndex + 1);
      }, 3800);
    };

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        setActive(index);
        resetTimer();
      });
    });

    carousel.addEventListener("mouseenter", () => window.clearInterval(timerId));
    carousel.addEventListener("mouseleave", resetTimer);
  });

  const fngCard = document.querySelector("[data-fng-card]");

  if (fngCard) {
    const valueNode = fngCard.querySelector("[data-fng-value]");
    const labelNode = fngCard.querySelector("[data-fng-label]");
    const meterNode = fngCard.querySelector("[data-fng-meter]");
    const copyNode = fngCard.querySelector("[data-fng-copy]");

    const classificationCopy = {
      "Extreme Fear": "Positioning is stressed. Panic usually means participants are trading emotion, not process.",
      Fear: "Risk appetite is cautious. Traders typically tighten exposure and wait for cleaner confirmation.",
      Neutral: "The tape is balanced. Sentiment is no longer panicked, but conviction is still selective.",
      Greed: "Risk appetite is warming up. Momentum expands faster when positioning starts leaning forward.",
      "Extreme Greed": "Positioning is crowded. That usually means upside still exists, but complacency becomes expensive."
    };

    fetch("https://api.alternative.me/fng/?limit=1&format=json")
      .then((response) => response.json())
      .then((payload) => {
        const reading = payload?.data?.[0];
        const value = Number(reading?.value);
        const label = reading?.value_classification || "Live";

        if (!Number.isFinite(value)) {
          throw new Error("Missing fear and greed value");
        }

        if (valueNode) {
          valueNode.textContent = String(value);
        }

        if (labelNode) {
          labelNode.textContent = label;
        }

        if (meterNode) {
          meterNode.style.width = `${Math.max(6, Math.min(100, value))}%`;
        }

        if (copyNode) {
          copyNode.textContent = classificationCopy[label]
            || "The latest sentiment print is live. Use it as context, not as a trade signal on its own.";
        }
      })
      .catch(() => {
        if (labelNode) {
          labelNode.textContent = "Live source";
        }

        if (copyNode) {
          copyNode.textContent = "Live sentiment can be checked directly on Alternative.me if the feed does not load here.";
        }
      });
  }
})();
