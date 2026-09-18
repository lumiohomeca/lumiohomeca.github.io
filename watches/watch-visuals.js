(() => {
  const path = location.pathname.toLowerCase();
  const visual = path.includes('gshock') || path.includes('marine-star') || path.includes('seiko')
    ? '../watch-assets/mechanism-balance-v1.png'
    : path.includes('corso') || path.includes('pr-100') || path.includes('lunar') || path.includes('gmc')
      ? '../watch-assets/mechanism-plate-v1.png'
      : '../watch-assets/mechanism-gear-train-v1.png';
  const style = document.createElement('style');
  style.textContent = `.mechanism-visual{position:relative!important;display:grid!important;place-items:center!important;overflow:hidden!important;width:260px!important;height:260px!important;min-height:260px!important;margin:auto!important;padding:0!important;border:0!important;border-radius:0!important;background:#181511!important;box-shadow:0 18px 30px #0002!important}.mechanism-visual img{display:block!important;width:100%!important;height:100%!important;object-fit:cover!important}.mechanism-visual small{position:absolute!important;left:12px!important;bottom:12px!important;z-index:1!important;padding:5px 7px!important;background:#10100fcc!important;color:#eee9dfe6!important;font:8px/1.2 Arial!important;letter-spacing:.12em!important;text-transform:uppercase!important}`;
  document.head.append(style);
  document.querySelectorAll('.reference,.watch').forEach((element) => {
    element.classList.add('mechanism-visual');
    element.setAttribute('aria-label', 'Original watchmaking mechanism visual, not an exact product image');
    element.innerHTML = `<img src="${visual}" alt="Original watchmaking mechanism visual"><small>Watchmaking visual · not exact model</small>`;
  });
})();
