/*
 * Gridlock — rewarded ads. The web prototype fakes one; the React Native port
 * replaces showRewarded() with a real rewarded ad (e.g. AdMob) behind the same promise.
 * Resolves true when the reward is earned, false if the player bails out.
 */
(function (root) {
  'use strict';

  const DURATION = 3;

  function showRewarded() {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'ad-overlay';
      el.innerHTML = `
        <div class="ad-box">
          <div class="ad-tag">Publicité · simulation</div>
          <div class="ad-count">${DURATION}</div>
          <div class="ad-text">Ta pub ici</div>
          <button class="ad-close" aria-label="Fermer">✕</button>
        </div>`;
      document.body.appendChild(el);
      const count = el.querySelector('.ad-count');
      let left = DURATION;
      const done = (ok) => {
        clearInterval(timer);
        el.remove();
        resolve(ok);
      };
      const timer = setInterval(() => {
        left -= 1;
        if (left <= 0) done(true);
        else count.textContent = left;
      }, 1000);
      el.querySelector('.ad-close').addEventListener('click', () => done(false));
    });
  }

  root.GridlockAds = { showRewarded };
})(window);
