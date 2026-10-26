(() => {
  const data = window.LumioStoreSightings || {};
  const feed = document.querySelector('#ig-feed');
  const summary = document.querySelector('#summary');
  const records = Object.entries(data).map(([slug, item]) => ({slug, item}));
  const postedKey = 'lumio-instagram-posted-v1';
  const postedSlugs = new Set(JSON.parse(localStorage.getItem(postedKey) || '[]'));

  const trackFor = item => {
    const text = `${item.status} ${item.price} ${item.note}`.toLowerCase();
    if (/pending|visual identification|verification required/.test(text)) return 'research';
    if (/legacy|discontinued|current official canadian price unavailable|canadian availability pending/.test(text)) return 'archive';
    return 'current';
  };
  const trackCopy = {
    current: ['New & current collection', 'A current reference with documented Canadian retail context.'],
    archive: ['Archive & pre-owned context', 'Explain the reference and condition factors; do not present a generic resale price.'],
    research: ['Store sighting · research in progress', 'Use as an honest identification story, never as a purchase or authenticity claim.']
  };
  const priorityFor = item => ({current: 0, archive: 1, research: 2}[trackFor(item)]);
  const queue = [...records].sort((a, b) => {
    const byTrack = priorityFor(a.item) - priorityFor(b.item);
    return byTrack || a.item.name.localeCompare(b.item.name) || a.item.reference.localeCompare(b.item.reference);
  });
  const savePosted = () => localStorage.setItem(postedKey, JSON.stringify([...postedSlugs]));
  const hashtags = item => {
    const type = item.type.toLowerCase();
    if (type.includes('diver')) return '#DiveWatch #WatchDiscovery #CanadianWatches';
    if (type.includes('chronograph')) return '#Chronograph #WatchDiscovery #CanadianWatches';
    if (type.includes('automatic')) return '#AutomaticWatch #WatchDiscovery #CanadianWatches';
    return '#WatchDiscovery #CanadianWatches #WristCheck';
  };
  const captionFor = (item, track) => {
    const [label, guidance] = trackCopy[track];
    const facts = item.facts.map(([value, description]) => `${value} ${description}`).join(' · ');
    const priceLine = track === 'current'
      ? `Canada price context: ${item.price}. Check the brand or authorized seller for live availability.`
      : track === 'archive'
        ? 'There is no current verified Canadian retail price for this reference. Market value depends on condition, completeness and seller.'
        : 'Reference, provenance and authenticity are not confirmed from a photograph alone.';
    return `${label.toUpperCase()}\n\n${item.name} · ${item.reference}\n\n${item.lead}\n\nKey details: ${facts}.\n\n${guidance}\n${priceLine}\n\n${hashtags(item)} #LumioWatches`;
  };
  const detailUrl = slug => `watches/store-sighting.html?watch=${encodeURIComponent(slug)}`;
  const render = active => {
    const eligible = queue.filter(({item}) => active === 'all' || trackFor(item) === active);
    const ready = eligible.filter(({slug}) => !postedSlugs.has(slug)).length;
    summary.textContent = `${ready} of ${eligible.length} post${eligible.length === 1 ? '' : 's'} ready in this view. Queue order is locked: one model, one original Lumio photo, no repeat. Nothing is published to Instagram automatically.`;
    feed.innerHTML = eligible.map(({slug, item}) => {
      const track = trackFor(item);
      const [label] = trackCopy[track];
      const image = item.image.replace(/^\.\.\//, '');
      const caption = captionFor(item, track);
      const position = queue.findIndex(entry => entry.slug === slug) + 1;
      const posted = postedSlugs.has(slug);
      return `<article class="card${posted ? ' posted' : ''}" data-track="${track}">
        <img src="${image}" alt="${item.name} ${item.reference} photographed by Lumio">
        <div class="card-body">
          <div class="queue-row"><div class="track ${track}">${label}</div><div class="queue-number">Post ${String(position).padStart(2, '0')} / ${queue.length}</div></div>
          <div><h2>${item.name}</h2><div class="reference">${item.reference}</div></div>
          <p class="facts">${item.facts.map(([value, description]) => `<b>${value}</b> ${description}`).join(' · ')}</p>
          <div class="price">${item.price}</div>
          <div class="source-lock">${posted ? 'Marked published locally' : 'Source locked · one model · one original photo'}</div>
          <div class="caption">${caption}</div>
          <div class="actions"><button class="button" type="button" data-copy="${slug}">Copy caption</button><button class="button status-button" type="button" data-status="${slug}">${posted ? 'Undo published mark' : 'Mark published'}</button><a class="button" href="${detailUrl(slug)}">Open full guide</a></div>
        </div>
      </article>`;
    }).join('');
    feed.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
      const entry = data[button.dataset.copy];
      try {
        await navigator.clipboard.writeText(captionFor(entry, trackFor(entry)));
        button.textContent = 'Caption copied';
      } catch {
        button.textContent = 'Copy unavailable';
      }
    }));
    feed.querySelectorAll('[data-status]').forEach(button => button.addEventListener('click', () => {
      const slug = button.dataset.status;
      if (postedSlugs.has(slug)) postedSlugs.delete(slug);
      else postedSlugs.add(slug);
      savePosted();
      render(active);
    }));
  };
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button));
    render(button.dataset.filter);
  }));
  render('all');
})();
