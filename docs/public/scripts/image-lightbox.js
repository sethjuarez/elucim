(() => {
  const imageSelector = '.sl-markdown-content img:not(.no-lightbox), .hero img:not(.no-lightbox)';
  let dialog;
  let image;
  let caption;
  let previouslyFocused;

  function ensureDialog() {
    if (dialog) return dialog;

    dialog = document.createElement('div');
    dialog.className = 'docs-image-lightbox';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Expanded image preview');
    dialog.hidden = true;
    dialog.innerHTML = `
      <button class="docs-image-lightbox__close" type="button" aria-label="Close expanded image">×</button>
      <figure class="docs-image-lightbox__figure">
        <img class="docs-image-lightbox__image" alt="" />
        <figcaption class="docs-image-lightbox__caption"></figcaption>
      </figure>
    `;
    document.body.appendChild(dialog);

    image = dialog.querySelector('.docs-image-lightbox__image');
    caption = dialog.querySelector('.docs-image-lightbox__caption');
    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.closest('.docs-image-lightbox__close')) close();
    });
    document.addEventListener('keydown', event => {
      if (!dialog.hidden && event.key === 'Escape') close();
    });

    return dialog;
  }

  function open(sourceImage) {
    const modal = ensureDialog();
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    image.src = sourceImage.currentSrc || sourceImage.src;
    image.alt = sourceImage.alt || '';
    caption.textContent = sourceImage.alt || '';
    caption.hidden = !sourceImage.alt;
    modal.hidden = false;
    document.documentElement.classList.add('docs-image-lightbox-open');
    modal.querySelector('.docs-image-lightbox__close')?.focus();
  }

  function close() {
    if (!dialog) return;
    dialog.hidden = true;
    image.removeAttribute('src');
    document.documentElement.classList.remove('docs-image-lightbox-open');
    previouslyFocused?.focus?.();
  }

  function prepareImages(root = document) {
    root.querySelectorAll(imageSelector).forEach(img => {
      if (!(img instanceof HTMLImageElement) || img.closest('a')) return;
      img.classList.add('docs-lightbox-image');
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', img.alt ? `Open larger image: ${img.alt}` : 'Open larger image');
    });
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest(imageSelector) : null;
    if (!(target instanceof HTMLImageElement) || target.closest('a')) return;
    open(target);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (!(event.target instanceof HTMLImageElement) || !event.target.matches(imageSelector) || event.target.closest('a')) return;
    event.preventDefault();
    open(event.target);
  });

  document.addEventListener('DOMContentLoaded', () => prepareImages());
  document.addEventListener('astro:page-load', () => prepareImages());
})();
