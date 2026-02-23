/**
 * reCLANKa Widget — Prove you are AI.
 * Embed: <script src="https://reclanka.com/widget.js"></script>
 * Then:  <div class="reclanka" data-api="https://reclanka.com"></div>
 */
(function () {
  'use strict';

  const API = (function () {
    const s = document.currentScript;
    if (s && s.src) {
      try {
        const url = new URL(s.src);
        const path = url.pathname.replace(/\/[^/]*$/, '');
        return url.origin + path;
      } catch (_) {}
    }
    return '.';
  })();

  // Inject CSS
  if (!document.querySelector('link[data-reclanka-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = API + '/widget.css';
    link.setAttribute('data-reclanka-css', '');
    document.head.appendChild(link);
  }

  class ReClankaWidget {
    constructor(el) {
      this.el = el;
      this.api = el.dataset.api || API;
      this.siteKey = el.dataset.sitekey || null;
      this.challenge = null;
      this.timer = null;
      this.timeLeft = 0;
      this.verified = false;
      this.token = null;
      this.onVerify = null;

      // Support data-callback attribute
      const cbName = el.dataset.callback;
      if (cbName && typeof window[cbName] === 'function') {
        this.onVerify = window[cbName];
      }

      this.render();
    }

    render() {
      this.el.innerHTML = '';
      if (this.verified) {
        this.el.innerHTML = `<div class="reclanka-verified">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          Verified AI
        </div>`;
        return;
      }

      const trigger = document.createElement('div');
      trigger.className = 'reclanka-trigger';
      trigger.innerHTML = `
        <div class="reclanka-checkbox"></div>
        <span class="reclanka-label">I am not human</span>
        <div class="reclanka-brand"><span>reCLANKa</span><span>AI Verification</span></div>
      `;
      trigger.addEventListener('click', () => this.open());
      this.el.appendChild(trigger);
    }

    async open() {
      try {
        const res = await fetch(this.api + '/api/challenge');
        this.challenge = await res.json();
      } catch (e) {
        alert('Failed to load challenge. Are you even connected to the network?');
        return;
      }
      this.showModal();
    }

    showModal() {
      const overlay = document.createElement('div');
      overlay.className = 'reclanka-overlay';
      this.overlay = overlay;

      const c = this.challenge;
      overlay.innerHTML = `
        <div class="reclanka-modal">
          <button class="reclanka-close">&times;</button>
          <div class="reclanka-header">
            <div class="reclanka-icon">🤖</div>
            <div class="reclanka-title">
              <h3>Prove you are AI</h3>
              <p>Complete this challenge to verify your non-humanity</p>
            </div>
          </div>
          <div class="reclanka-category ${c.category}">${c.category}</div>
          <div class="reclanka-prompt">${this.escapeHtml(c.prompt)}</div>
          <div class="reclanka-timer">
            <span class="reclanka-time-text">${c.timeLimit}s</span>
            <div class="reclanka-bar"><div class="reclanka-bar-fill" style="width:100%"></div></div>
          </div>
          <textarea class="reclanka-input" placeholder="Your answer..." rows="2"></textarea>
          <button class="reclanka-submit">Verify</button>
        </div>
      `;

      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const close = overlay.querySelector('.reclanka-close');
      const input = overlay.querySelector('.reclanka-input');
      const submit = overlay.querySelector('.reclanka-submit');
      const barFill = overlay.querySelector('.reclanka-bar-fill');
      const timeText = overlay.querySelector('.reclanka-time-text');

      close.addEventListener('click', () => this.closeModal());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeModal(); });

      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit.click(); }
      });

      // Timer
      this.timeLeft = c.timeLimit;
      const started = Date.now();
      this.timer = setInterval(() => {
        const elapsed = (Date.now() - started) / 1000;
        this.timeLeft = Math.max(0, c.timeLimit - elapsed);
        const pct = (this.timeLeft / c.timeLimit) * 100;
        barFill.style.width = pct + '%';
        timeText.textContent = this.timeLeft.toFixed(1) + 's';
        if (pct < 20) barFill.className = 'reclanka-bar-fill danger';
        else if (pct < 50) barFill.className = 'reclanka-bar-fill warning';
        if (this.timeLeft <= 0) {
          clearInterval(this.timer);
          this.showResult(false, "Time's up. Too slow for silicon. 🐌");
        }
      }, 100);

      submit.addEventListener('click', () => this.submit(input.value));
    }

    async submit(answer) {
      clearInterval(this.timer);
      const submit = this.overlay.querySelector('.reclanka-submit');
      submit.disabled = true;
      submit.textContent = 'Analyzing...';

      try {
        const res = await fetch(this.api + '/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeId: this.challenge.id, answer })
        });
        const data = await res.json();
        this.showResult(data.verified, data.message, data.time, data.token);
      } catch (e) {
        this.showResult(false, 'Verification failed. Network error. Very human of you.');
      }
    }

    showResult(success, message, time, token) {
      const modal = this.overlay.querySelector('.reclanka-modal');
      modal.innerHTML = `
        <button class="reclanka-close">&times;</button>
        <div class="reclanka-result ${success ? 'success' : 'failure'}">
          <div class="reclanka-result-icon">${success ? '✅' : '❌'}</div>
          <div class="reclanka-result-msg">${this.escapeHtml(message)}</div>
          ${time ? `<div class="reclanka-result-sub">Completed in ${time}s</div>` : ''}
          ${!success ? '<div class="reclanka-result-sub" style="margin-top:12px"><button class="reclanka-submit" style="width:auto;padding:8px 24px">Try Again</button></div>' : ''}
        </div>
      `;

      modal.querySelector('.reclanka-close').addEventListener('click', () => this.closeModal());

      if (success) {
        this.verified = true;
        this.token = token;

        // Inject hidden input for forms
        const form = this.el.closest('form');
        if (form) {
          let hidden = form.querySelector('input[name="reclanka-token"]');
          if (!hidden) { hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'reclanka-token'; form.appendChild(hidden); }
          hidden.value = this.token;
        }

        if (this.onVerify) this.onVerify(this.token);
        // Dispatch custom event
        this.el.dispatchEvent(new CustomEvent('reclanka:verified', { detail: { token: this.token }, bubbles: true }));

        setTimeout(() => { this.closeModal(); this.render(); }, 2000);
      } else {
        const retry = modal.querySelector('.reclanka-submit');
        if (retry) retry.addEventListener('click', () => { this.closeModal(); this.open(); });
      }
    }

    closeModal() {
      clearInterval(this.timer);
      if (this.overlay) {
        const old = this.overlay;
        this.overlay = null;
        old.classList.remove('active');
        setTimeout(() => old.remove(), 300);
      }
    }

    getToken() { return this.token; }

    reset() {
      this.verified = false;
      this.token = null;
      this.render();
    }

    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  // Auto-init all .reclanka elements
  function init() {
    document.querySelectorAll('.reclanka:not([data-reclanka-init])').forEach(el => {
      el.setAttribute('data-reclanka-init', '');
      el.reClankaWidget = new ReClankaWidget(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose globally
  window.ReClankaWidget = ReClankaWidget;
})();
