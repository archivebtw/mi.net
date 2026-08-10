// Startup loading animation for mi.net
(() => {
  const loader = document.getElementById('siteLoader');
  const counter = document.getElementById('loaderCounter');

  if (!loader || !counter) {
    document.body.classList.remove('is-loading');
    document.body.classList.add('loader-finished');
    return;
  }

  const progress = loader.querySelector('.site-loader__progress');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minimumDuration = reducedMotion ? 120 : 1450;
  const start = performance.now();
  let displayedProgress = 0;
  let targetProgress = 8;
  let finished = false;

  function setProgress(value) {
    displayedProgress = Math.max(displayedProgress, Math.min(100, value));
    counter.textContent = String(Math.round(displayedProgress)).padStart(2, '0');
    if (progress) {
      progress.style.width = displayedProgress + '%';
    }
  }

  function tick(now) {
    if (finished) return;

    const elapsed = now - start;

    // The curve intentionally slows down near the end until the page is ready.
    if (elapsed < minimumDuration * 0.28) {
      targetProgress = 38;
    } else if (elapsed < minimumDuration * 0.58) {
      targetProgress = 68;
    } else if (elapsed < minimumDuration * 0.82) {
      targetProgress = 86;
    } else {
      targetProgress = 94;
    }

    const delta = targetProgress - displayedProgress;
    setProgress(displayedProgress + Math.max(0.25, delta * 0.07));
    requestAnimationFrame(tick);
  }

  function leave() {
    if (finished) return;
    finished = true;

    const elapsed = performance.now() - start;
    const remaining = Math.max(0, minimumDuration - elapsed);

    window.setTimeout(() => {
      setProgress(100);

      window.setTimeout(() => {
        loader.classList.add('is-leaving');

        document.body.classList.remove('is-loading');
        document.body.classList.add('loader-finished');

        window.setTimeout(() => {
          loader.remove();
        }, reducedMotion ? 140 : 560);
      }, reducedMotion ? 10 : 180);
    }, remaining);
  }

  requestAnimationFrame(tick);

  if (document.readyState === 'complete') {
    leave();
  } else {
    window.addEventListener('load', leave, { once: true });
  }

  // Safety fallback: the interface should never remain blocked.
  window.setTimeout(leave, reducedMotion ? 500 : 3500);
})();
