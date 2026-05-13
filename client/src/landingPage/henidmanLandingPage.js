(function () {
  const grad = document.getElementById("noFeeTraceGrad");
  if (grad) {
    const width = 300;
    const duration = 1800;
    const spotHalfWidth = 110;
    let start = null;

    function tick(timestamp) {
      if (!start) start = timestamp;
      const progress = ((timestamp - start) % duration) / duration;
      const center = width + spotHalfWidth - progress * (width + spotHalfWidth * 2);
      grad.setAttribute("x1", String(center - spotHalfWidth));
      grad.setAttribute("x2", String(center + spotHalfWidth));
      requestAnimationFrame(tick);
    }

    setTimeout(() => requestAnimationFrame(tick), 1700);
  }

  const categories = [
    "חשמלאות",
    "אינסטלציה",
    "הרכבות",
    "צבע וסיוד",
    "גינון",
    "ניקיון",
    "שיפוצים",
    "תיקוני בית",
    "הובלות",
    "טכנאי מזגנים",
    "דברציות",
    "סורגים",
    "הדברה",
    "שיש ופלסטיק",
  ];
  const toolIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>';
  const marquee = document.getElementById("marqTrack");
  if (marquee) {
    const itemsHtml = categories
      .map((category) => `<span class="marq-item">${toolIcon}${category}</span>`)
      .join("");
    marquee.innerHTML = itemsHtml + itemsHtml;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

  function formatCount(value, decimals = 0) {
    if (decimals) return value.toFixed(decimals);
    return Math.round(value).toLocaleString("he-IL");
  }

  function animateCount(element) {
    const target = parseFloat(element.dataset.count ?? "0");
    const isDecimal = !Number.isInteger(target);
    const suffix = element.dataset.suffix || "";
    const prefix = element.dataset.prefix || "";
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const value = target * ease;
      element.innerHTML =
        prefix +
        formatCount(value, isDecimal ? 1 : 0) +
        (suffix ? `<small>${suffix}</small>` : "");
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.target instanceof HTMLElement && entry.target.dataset.count !== undefined) {
          animateCount(entry.target);
        }
        countObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.4 },
  );
  document.querySelectorAll("[data-count]").forEach((element) => countObserver.observe(element));

  const jobsRange = document.getElementById("rngJobs");
  const rateRange = document.getElementById("rngRate");
  const hoursRange = document.getElementById("rngHours");
  const output = document.getElementById("calcOut");
  const weeklyOutput = document.getElementById("calcWeekly");
  const dailyOutput = document.getElementById("calcDaily");
  const jobsValue = document.getElementById("valJobs");
  const rateValue = document.getElementById("valRate");
  const hoursValue = document.getElementById("valHours");
  const bar1 = document.getElementById("bar1");
  const bar2 = document.getElementById("bar2");
  const bar3 = document.getElementById("bar3");

  function getPercentage(input) {
    return ((input.value - input.min) / (input.max - input.min)) * 100 + "%";
  }

  function recalculate() {
    if (
      !(jobsRange instanceof HTMLInputElement) ||
      !(rateRange instanceof HTMLInputElement) ||
      !(hoursRange instanceof HTMLInputElement) ||
      !output ||
      !weeklyOutput ||
      !dailyOutput ||
      !jobsValue ||
      !rateValue ||
      !hoursValue ||
      !bar1 ||
      !bar2 ||
      !bar3 ||
      !(bar1.parentElement?.nextElementSibling instanceof HTMLElement) ||
      !(bar2.parentElement?.nextElementSibling instanceof HTMLElement) ||
      !(bar3.parentElement?.nextElementSibling instanceof HTMLElement)
    ) {
      return;
    }

    const jobs = Number(jobsRange.value);
    const rate = Number(rateRange.value);
    const hours = Number(hoursRange.value);
    jobsRange.style.setProperty("--p", getPercentage(jobsRange));
    rateRange.style.setProperty("--p", getPercentage(rateRange));
    hoursRange.style.setProperty("--p", getPercentage(hoursRange));

    const hoursFactor = 0.6 + (hours / 12) * 0.6;
    const weekly = Math.round(jobs * rate * (hoursFactor / 0.95));
    const monthly = weekly * 4;
    const daily = Math.round(weekly / 7);
    output.textContent = monthly.toLocaleString("he-IL");
    weeklyOutput.textContent = weekly.toLocaleString("he-IL");
    dailyOutput.textContent = daily.toLocaleString("he-IL");

    jobsValue.innerHTML = `${jobs} <small>קריאות</small>`;
    rateValue.innerHTML = `${rate.toLocaleString("he-IL")} <small>₪</small>`;
    hoursValue.innerHTML = `${hours} <small>שעות</small>`;

    const repairs = Math.round(40 + ((rate - 120) / (900 - 120)) * 35);
    const assemblies = Math.round(45 - ((rate - 120) / (900 - 120)) * 20);
    const other = Math.max(5, 100 - repairs - assemblies);
    bar1.style.width = repairs + "%";
    bar2.style.width = assemblies + "%";
    bar3.style.width = other + "%";
    bar1.parentElement.nextElementSibling.textContent = repairs + "%";
    bar2.parentElement.nextElementSibling.textContent = assemblies + "%";
    bar3.parentElement.nextElementSibling.textContent = other + "%";
  }

  if (
    jobsRange instanceof HTMLInputElement &&
    rateRange instanceof HTMLInputElement &&
    hoursRange instanceof HTMLInputElement
  ) {
    [jobsRange, rateRange, hoursRange].forEach((element) =>
      element.addEventListener("input", recalculate),
    );
    recalculate();
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", function (event) {
      const hash = this.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  function notifyWorkerJoin() {
    const payload = { type: "avodago:worker-join" };
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, "*");
      }
    } catch {}
  }

  document.querySelectorAll('[data-worker-join="true"]').forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      notifyWorkerJoin();
    });
  });

  const phoneAmount = document.getElementById("phoneAmount");
  let baseAmount = 3840;
  if (phoneAmount) {
    setInterval(() => {
      baseAmount += Math.floor(Math.random() * 30);
      phoneAmount.innerHTML = `${baseAmount.toLocaleString("he-IL")} <span class="unit">₪</span>`;
    }, 4500);
  }

  const handwriteWrap = document.querySelector(".handwrite-wrap");
  const handwriteSvg = handwriteWrap?.querySelector(".handwrite-svg");
  const sectionTitle = handwriteWrap?.querySelector(".section-title");

  if (handwriteWrap && handwriteSvg instanceof HTMLElement && sectionTitle instanceof HTMLElement) {
    function fitOval() {
      const paddingHorizontal = 80;
      const paddingVertical = 55;
      handwriteSvg.style.width = sectionTitle.offsetWidth + paddingHorizontal * 2 + "px";
      handwriteSvg.style.height = sectionTitle.offsetHeight + paddingVertical * 2 + "px";
      handwriteSvg.style.top = -paddingVertical + "px";
      handwriteSvg.style.left = "-50px";
      handwriteSvg.style.transform = "none";
    }

    fitOval();
    window.addEventListener("resize", fitOval);
  }
})();