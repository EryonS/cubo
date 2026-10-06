// Picks French or English: the visitor's choice (kept in localStorage), else the browser language.
(function () {
  var root = document.documentElement;
  function stored() { try { return localStorage.getItem('lang'); } catch (e) { return null; } }
  function set(l) {
    root.lang = l;
    try { localStorage.setItem('lang', l); } catch (e) { /* private mode */ }
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === l)); });
    var title = document.querySelector('meta[name="title-' + l + '"]');
    if (title) document.title = title.content;
  }
  var pick = stored() || ((navigator.language || 'en').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en');
  root.lang = pick;
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.lang); }); });
    set(pick);
  });
})();
