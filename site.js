'use strict';
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const labels = {
  photography: 'Photography', events: 'Events', design: 'Design & print',
  social: 'Social media', video: 'Film', live: 'Live streaming'
};
const items = window.rootsCollection;
const byId = new Map(items.map(item => [item.id, item]));
const pad = value => String(value).padStart(2, '0');
const motion = matchMedia('(prefers-reduced-motion: no-preference)');
const contactSheetReveal = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    contactSheetReveal.unobserve(entry.target);
    if (motion.matches) {
      entry.target.animate([{opacity: .15, transform: 'translateY(20px)'}, {opacity: 1, transform: 'none'}],
        {duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)'});
    }
  }
}, {threshold: .08});
const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
function photograph(item, lazy = true) {
  const img = new Image();
  img.alt = item.description || item.name;
  img.decoding = 'async';
  if (lazy) img.loading = 'lazy';
  img.src = item.src;
  return img;
}
const covers = ['photography-03', 'photography-07', 'photography-01'].map(id => byId.get(id));
let activeCover = 0;
covers.forEach((item, index) => {
  const img = photograph(item, false);
  if (index === 0) img.fetchPriority = 'high';
  $('.hero-images').append(img);
});
function showCover(position) {
  activeCover = (position + covers.length) % covers.length;
  const item = covers[activeCover];
  $$('.hero-images img').forEach((img, i) => img.classList.toggle('is-current', i === activeCover));
  $('#hero-caption').textContent = item.name;
  $('#frame-current').textContent = pad(activeCover + 1);
  $('#hero-type').textContent = labels[item.category];
  $('.hero-frame').setAttribute('aria-description', item.description || item.name);
}
$('#hero-prev').addEventListener('click', () => showCover(activeCover - 1));
$('#hero-next').addEventListener('click', () => showCover(activeCover + 1));
showCover(0);

const stories = window.rootsStories;
const storyItems = stories.map(story => byId.get(story.id));
stories.forEach((story, index) => {
  const item = storyItems[index];
  const article = make('article', 'story-card');
  const button = make('button');
  button.setAttribute('aria-label', 'Open ' + story.title);
  const picture = make('div', 'story-picture');
  picture.append(photograph(item));
  button.append(picture);
  button.addEventListener('click', () => openViewer(storyItems, index, button));
  const caption = make('div', 'story-caption');
  const heading = make('div');
  heading.append(make('span', 'eyebrow', labels[item.category]), make('h3', '', story.title));
  caption.append(heading, make('p', '', story.text));
  article.append(button, caption);
  $('.rail').append(article);
});
const stage = $('.rail-window');
const rail = $('.rail');
let railTween = null;
const travel = () => Math.max(0, rail.scrollWidth - stage.clientWidth);
const storyPositions = () => $$('.story-card').map(card => Math.min(travel(), card.offsetLeft - rail.firstElementChild.offsetLeft));
let currentStory = 0;
function railStatus(distance) {
  const stops = storyPositions();
  currentStory = stops.reduce((best, stop, i) => Math.abs(stop - distance) < Math.abs(stops[best] - distance) ? i : best, 0);
  $('.rail-status').textContent = pad(currentStory + 1) + ' / ' + pad(stories.length);
  $('.rail-meter i').style.transform = 'scaleX(' + ((currentStory + 1) / stories.length) + ')';
  $('#project-prev').disabled = currentStory === 0;
  $('#project-next').disabled = currentStory === stories.length - 1;
}
function goToStory(index) {
  const distance = storyPositions()[Math.max(0, Math.min(stories.length - 1, index))];
  const behavior = motion.matches ? 'smooth' : 'instant';
  if (railTween) {
    const trigger = railTween.scrollTrigger;
    window.scrollTo({top: trigger.start + (trigger.end - trigger.start) * distance / Math.max(1, travel()), behavior});
  } else stage.scrollTo({left: distance, behavior});
}
$('#project-prev').addEventListener('click', () => goToStory(currentStory - 1));
$('#project-next').addEventListener('click', () => goToStory(currentStory + 1));
stage.addEventListener('scroll', () => { if (!railTween) railStatus(stage.scrollLeft); }, {passive: true});
let touchStart = null;
stage.addEventListener('touchstart', event => {
  const point = event.touches[0];
  touchStart = {x: point.clientX, y: point.clientY};
}, {passive: true});
stage.addEventListener('touchend', event => {
  if (!railTween || !touchStart) return;
  const point = event.changedTouches[0];
  const dx = point.clientX - touchStart.x;
  const dy = point.clientY - touchStart.y;
  if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) goToStory(currentStory + (dx < 0 ? 1 : -1));
  touchStart = null;
}, {passive: true});
stage.addEventListener('keydown', event => {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  event.preventDefault();
  goToStory(currentStory + (event.key === 'ArrowRight' ? 1 : -1));
});
rail.addEventListener('focusin', event => {
  if (!railTween || !event.target.matches(':focus-visible')) return;
  const index = $$('.story-card').indexOf(event.target.closest('.story-card'));
  stage.scrollLeft = 0;
  if (index >= 0 && index !== currentStory) goToStory(index);
});
railStatus(0);

let filtered = items;
let shown = 0;
let currentCategory = 'all';
function renderMore() {
  const batch = filtered.slice(shown, shown + 9);
  const fragment = document.createDocumentFragment();
  batch.forEach((item, offset) => {
    const index = shown + offset;
    const button = make('button', 'archive-card');
    button.setAttribute('aria-label', 'Open ' + item.name + ', ' + labels[item.category]);
    const picture = make('div', 'archive-picture');
    picture.append(photograph(item));
    const caption = make('div', 'archive-info');
    caption.append(make('strong', '', item.name), make('small', '', labels[item.category]));
    button.append(picture, caption);
    button.addEventListener('click', () => openViewer(filtered, index, button));
    fragment.append(button);
    contactSheetReveal.observe(button);
  });
  $('.archive-grid').append(fragment);
  shown += batch.length;
  $('#archive-count').textContent = shown + ' of ' + filtered.length;
  $('#load-more').hidden = shown === filtered.length;
  $('#filter-summary').textContent = 'Showing ' + shown + ' of ' + filtered.length + ' archive items.';
  window.ScrollTrigger?.refresh();
}
function selectCategory(category) {
  currentCategory = category;
  filtered = category === 'all' ? items : items.filter(item => item.category === category);
  shown = 0;
  $$('.filter-bar button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === currentCategory)));
  contactSheetReveal.disconnect();
  $('.archive-grid').replaceChildren();
  renderMore();
}
for (const [id, label] of Object.entries({all: 'All work', ...labels})) {
  const button = make('button', '', label);
  button.dataset.category = id;
  button.addEventListener('click', () => selectCategory(id));
  $('.filter-bar').append(button);
}
$('#load-more').addEventListener('click', () => {
  const firstNew = shown;
  renderMore();
  $$('.archive-card')[firstNew]?.focus({preventScroll: true});
});
selectCategory('all');

const viewer = $('#viewer');
let viewing = [];
let viewingIndex = 0;
let opener;
function displayItem(index) {
  viewingIndex = (index + viewing.length) % viewing.length;
  const item = viewing[viewingIndex];
  $('#viewer-image').src = item.src;
  $('#viewer-image').alt = item.description || item.name;
  $('#viewer-title').textContent = item.name;
  $('#viewer-type').textContent = labels[item.category];
  $('#viewer-count').textContent = pad(viewingIndex + 1) + ' / ' + pad(viewing.length);
  $('#film-link').hidden = !item.video;
  if (item.video) $('#film-link').href = item.video;
  else $('#film-link').removeAttribute('href');
}
function openViewer(list, index, button) {
  viewing = list;
  opener = button;
  displayItem(index);
  viewer.showModal();
  document.body.classList.add('has-dialog');
  $('#viewer-close').focus();
}
$('#viewer-next').addEventListener('click', () => displayItem(viewingIndex + 1));
$('#viewer-prev').addEventListener('click', () => displayItem(viewingIndex - 1));
$('#viewer-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
viewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    displayItem(viewingIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
viewer.addEventListener('close', () => {
  document.body.classList.remove('has-dialog');
  opener?.focus({preventScroll: true});
});
const studioItem = byId.get('photography-14');
$('#studio-image').src = studioItem.src;
$('#studio-image').alt = studioItem.description || studioItem.name;

if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.hero-intro > *', {y: 24, opacity: 0, stagger: .12, duration: .75, ease: 'power3.out', clearProps: 'all'});
    gsap.fromTo('.hero-images', {scale: 1.09, yPercent: -3}, {yPercent: 3, scale: 1.09, ease: 'none', scrollTrigger: {trigger: '.hero-frame', start: 'top bottom', end: 'bottom top', scrub: true}});
    gsap.to('.reading-progress', {scaleX: 1, ease: 'none', scrollTrigger: {start: 0, end: 'max', scrub: true}});
    for (const node of $$('.archive .section-top, .studio-copy, .footer h2')) {
      gsap.from(node, {y: 32, opacity: 0, duration: .85, ease: 'power3.out', scrollTrigger: {trigger: node, start: 'top 96%', once: true}, clearProps: 'all'});
    }
    gsap.fromTo('#studio-image', {scale: 1.13, yPercent: -4}, {scale: 1.13, yPercent: 4, ease: 'none', scrollTrigger: {trigger: '.studio-photo', start: 'top bottom', end: 'bottom top', scrub: true}});
  });
  mm.add('(min-height: 680px) and (prefers-reduced-motion: no-preference)', () => {
    const section = $('.selected');
    section.classList.add('is-pinned');
    stage.scrollLeft = 0;
    railTween = gsap.to(rail, {x: () => -travel(), ease: 'none', scrollTrigger: {
      trigger: '.rail-stage', start: 'center center', end: () => '+=' + travel(), pin: true,
      scrub: true, invalidateOnRefresh: true, anticipatePin: 1, onUpdate: self => railStatus(self.progress * travel())
    }});
    return () => {railTween = null; section.classList.remove('is-pinned'); railStatus(stage.scrollLeft);};
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
