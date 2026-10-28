// Presentational refinements. Existing links, controls, catalogue data and order stay intact.
(() => {
  const script = document.currentScript;
  const assetRoot = new URL('.', script.src);
  document.querySelectorAll('.logo').forEach(logo => {
    if (!logo.querySelector('span')) {
      const wordmark = document.createElement('span');
      while (logo.firstChild) wordmark.appendChild(logo.firstChild);
      logo.appendChild(wordmark);
    }
    if (!logo.querySelector('img')) {
      const image = document.createElement('img');
      image.alt = '';
      logo.prepend(image);
    }
  });
  document.querySelectorAll('.logo img').forEach(image => {
    image.src = new URL('lumio-mark.svg', assetRoot).href;
    image.alt = 'Lumio ruby bridge mark';
  });

  function refineTitle(title) {
    if (title.querySelector('.watch-reference')) return;
    const split = title.querySelector('br');
    if (!split) return;
    const reference = document.createElement('span');
    reference.className = 'watch-reference';
    while (split.nextSibling) reference.appendChild(split.nextSibling);
    split.replaceWith(reference);
  }
  if (document.body.classList.contains('lumio-home')) {
    document.querySelectorAll('.grid .card h3').forEach(refineTitle);
  }
  if (document.body.classList.contains('lumio-guide')) {
    document.querySelectorAll('.hero h1').forEach(refineTitle);
    document.querySelectorAll('.buy>div[style]').forEach(element => {
      if (/^(C\$|CAD\s*\d)/.test(element.textContent.trim())) element.classList.add('lumio-guide-price');
    });
  }
})();
