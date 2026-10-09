// Lumio's editorial promise: a clear first step into serious watch ownership.
(() => {
  const hero = document.querySelector('.hero');
  const copy = hero?.querySelector('.hero-copy');
  if (!hero || !copy || document.documentElement.dataset.lumioFirstWatch) return;
  document.documentElement.dataset.lumioFirstWatch = 'true';

  const eyebrow = copy.querySelector('.eyebrow');
  const title = copy.querySelector('h1');
  const lead = copy.querySelector('p');
  const primary = copy.querySelector('.cta');
  const footerLine = copy.querySelector('div:last-child');
  const emblem = hero.querySelector('.lumio-emblem');

  if (eyebrow) eyebrow.textContent = 'Canada’s guide to your first serious watch';
  if (title) title.innerHTML = 'Your first<br>serious watch.';
  if (lead) lead.textContent = 'From Seiko to Rolex: clear context, real Canadian prices and better questions before you choose a watch that will mean something.';
  if (primary) {
    primary.href = 'watch-finder.html';
    primary.textContent = 'Find your starting point →';
  }
  if (footerLine) footerLine.textContent = 'LEARN THE LANGUAGE → CHOOSE WITH CONFIDENCE → MAKE IT YOURS';
  if (emblem) {
    emblem.src = 'academy-assets/lumio-ruby-mark-v1.png';
    emblem.alt = 'Lumio ruby mark with carved L';
    emblem.style.objectFit = 'contain';
  }

  const brand = document.querySelector('.logo');
  if (brand && !brand.querySelector('img')) {
    const mark = document.createElement('img');
    mark.src = 'academy-assets/lumio-ruby-mark-v1.png';
    mark.alt = '';
    mark.width = 38;
    mark.height = 38;
    mark.style.cssText = 'width:38px;height:38px;object-fit:cover;border-radius:50%;vertical-align:middle;margin-right:10px;box-shadow:0 0 0 1px #b9915360';
    brand.prepend(mark);
  }

  const nav = document.querySelector('.nav');
  if (nav) {
    const links = [...nav.querySelectorAll('a')];
    if (links[0]) links[0].textContent = 'Start here';
    if (links[1]) { links[1].textContent = 'Find a watch'; links[1].href = 'watch-finder.html'; }
    if (links[2]) links[2].textContent = 'Learn watches';
  }
})();
