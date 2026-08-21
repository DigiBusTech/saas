/**
 * SabiBio embeddable web chat widget.
 * Usage: <script src="https://www.sabibio.link/widget.js" data-workspace-id="..." data-button-color="#4f46e5" defer></script>
 * Vanilla JS, no dependencies. Renders inside a Shadow DOM so host page CSS never leaks in or out.
 */
(function () {
  'use strict';

  var currentScript = document.currentScript;
  if (!currentScript) return;

  var workspaceId = currentScript.getAttribute('data-workspace-id');
  if (!workspaceId) {
    console.error('[SabiBio widget] Missing required data-workspace-id attribute.');
    return;
  }
  var buttonColor = currentScript.getAttribute('data-button-color') || '#4f46e5';
  var apiBase = (function () {
    try { return new URL(currentScript.src).origin; } catch (e) { return ''; }
  })();

  var sessionKey = 'sabibio_session_' + workspaceId;
  var visitorKey = 'sabibio_visitor_' + workspaceId;

  function getSessionId() {
    var existing = window.localStorage.getItem(sessionKey);
    if (existing) return existing;
    var id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    window.localStorage.setItem(sessionKey, id);
    return id;
  }

  function getVisitor() {
    var raw = window.localStorage.getItem(visitorKey);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function saveVisitor(visitor) {
    window.localStorage.setItem(visitorKey, JSON.stringify(visitor));
  }

  function init() {
    var host = document.createElement('div');
    host.setAttribute('id', 'sabibio-widget-root');
    document.body.appendChild(host);
    var shadow = host.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
    style.textContent = [
      ':host, *{ box-sizing: border-box; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }',
      '.sb-launcher { position: fixed; bottom: 20px; right: 20px; z-index: 2147483000; width: 56px; height: 56px; border-radius: 9999px; background: ' + buttonColor + '; box-shadow: 0 8px 24px rgba(0,0,0,0.25); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }',
      '.sb-launcher svg { width: 26px; height: 26px; fill: #fff; }',
      '.sb-panel { position: fixed; bottom: 88px; right: 20px; z-index: 2147483000; width: min(360px, calc(100vw - 32px)); height: min(560px, calc(100vh - 120px)); background: #0b1620; border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,0.35); display: none; flex-direction: column; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }',
      '.sb-panel.sb-open { display: flex; }',
      '.sb-header { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; }',
      '.sb-header h1 { margin: 0; font-size: 14px; font-weight: 600; color: #fff; }',
      '.sb-header p { margin: 2px 0 0; font-size: 10px; color: rgba(255,255,255,0.4); }',
      '.sb-close { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 16px; line-height: 1; }',
      '.sb-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }',
      '.sb-msg { max-width: 85%; padding: 8px 12px; border-radius: 12px; font-size: 12px; line-height: 1.5; word-wrap: break-word; }',
      '.sb-msg.sb-user { align-self: flex-end; background: ' + buttonColor + '; color: #fff; }',
      '.sb-msg.sb-bot { align-self: flex-start; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); }',
      '.sb-form { padding: 16px; display: flex; flex-direction: column; gap: 10px; }',
      '.sb-form p { margin: 0; font-size: 11px; color: rgba(255,255,255,0.55); line-height: 1.5; }',
      '.sb-field { width: 100%; padding: 9px 10px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 12px; outline: none; }',
      '.sb-btn { width: 100%; padding: 10px; border-radius: 8px; border: none; background: ' + buttonColor + '; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }',
      '.sb-error { color: #fca5a5; font-size: 10px; margin: 0; }',
      '.sb-composer { border-top: 1px solid rgba(255,255,255,0.08); padding: 10px; display: flex; gap: 8px; }',
      '.sb-input { flex: 1; padding: 9px 12px; border-radius: 9999px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 12px; outline: none; }',
      '.sb-send { width: 36px; height: 36px; border-radius: 9999px; border: none; background: ' + buttonColor + '; color: #fff; cursor: pointer; flex-shrink: 0; }',
    ].join('\n');
    shadow.appendChild(style);

    var launcher = document.createElement('button');
    launcher.className = 'sb-launcher';
    launcher.setAttribute('aria-label', 'Chat with us');
    launcher.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 4h16a1 1 0 011 1v11a1 1 0 01-1 1H8l-4 4V6a1 1 0 011-1z"/></svg>';
    shadow.appendChild(launcher);

    var panel = document.createElement('div');
    panel.className = 'sb-panel';
    panel.innerHTML =
      '<div class="sb-header"><div><h1>Chat with our team</h1><p>Powered by SabiBio</p></div><button class="sb-close" aria-label="Close">\u2715</button></div>' +
      '<div class="sb-form" data-role="identity-form">' +
      '<p>Before we begin, tell us where to send a follow-up.</p>' +
      '<input class="sb-field" data-role="name" placeholder="Your name" />' +
      '<input class="sb-field" data-role="email" type="email" placeholder="Email address" />' +
      '<p class="sb-error" data-role="identity-error"></p>' +
      '<button class="sb-btn" data-role="start">Start chat</button>' +
      '</div>' +
      '<div class="sb-body" data-role="messages" style="display:none;"></div>' +
      '<div class="sb-composer" data-role="composer" style="display:none;">' +
      '<input class="sb-input" data-role="text-input" placeholder="Write a message..." />' +
      '<button class="sb-send" data-role="send" aria-label="Send">\u27A4</button>' +
      '</div>';
    shadow.appendChild(panel);

    var messagesEl = panel.querySelector('[data-role="messages"]');
    var composerEl = panel.querySelector('[data-role="composer"]');
    var formEl = panel.querySelector('[data-role="identity-form"]');
    var textInput = panel.querySelector('[data-role="text-input"]');
    var sessionId = getSessionId();
    var sending = false;

    function open(prefill) {
      panel.classList.add('sb-open');
      var visitor = getVisitor();
      if (visitor) {
        formEl.style.display = 'none';
        messagesEl.style.display = 'flex';
        composerEl.style.display = 'flex';
        if (!messagesEl.childElementCount) appendMessage('bot', 'Hi there! How can I help you today?');
      }
      if (prefill) textInput.value = prefill;
    }

    launcher.addEventListener('click', function () { open(); });
    panel.querySelector('.sb-close').addEventListener('click', function () { panel.classList.remove('sb-open'); });

    panel.querySelector('[data-role="start"]').addEventListener('click', function () {
      var name = panel.querySelector('[data-role="name"]').value.trim();
      var email = panel.querySelector('[data-role="email"]').value.trim();
      var errorEl = panel.querySelector('[data-role="identity-error"]');
      if (name.length < 2 || email.indexOf('@') === -1) {
        errorEl.textContent = 'Enter your name and a valid email address.';
        return;
      }
      errorEl.textContent = '';
      saveVisitor({ name: name, email: email });
      formEl.style.display = 'none';
      messagesEl.style.display = 'flex';
      composerEl.style.display = 'flex';
      appendMessage('bot', 'Hi there! How can I help you today?');
    });

    function appendMessage(role, content) {
      var el = document.createElement('div');
      el.className = 'sb-msg ' + (role === 'user' ? 'sb-user' : 'sb-bot');
      // PHASE 2: Fix markdown rendering - preserve line breaks
      el.innerHTML = content.replace(/\n/g, '<br>');
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return el;
    }

    function pollForReply(since, bubble) {
      var attempt = 0;
      var timer = setInterval(function () {
        attempt += 1;
        if (attempt > 20) { clearInterval(timer); return; }
        fetch(apiBase + '/api/chat/web?workspaceId=' + encodeURIComponent(workspaceId) + '&sessionId=' + encodeURIComponent(sessionId) + '&since=' + encodeURIComponent(since))
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data && data.status === 'complete' && data.reply) {
              // PHASE 2: Fix markdown rendering - preserve line breaks
              bubble.innerHTML = data.reply.replace(/\n/g, '<br>');
              clearInterval(timer);
            }
          })
          .catch(function () {});
      }, 1000);
    }

    function sendMessage() {
      var content = textInput.value.trim();
      var visitor = getVisitor();
      if (!content || !visitor || sending) return;
      textInput.value = '';
      appendMessage('user', content);
      sending = true;

      fetch(apiBase + '/api/chat/web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workspaceId: workspaceId, 
          sessionId: sessionId, 
          content: content, 
          visitorName: visitor.name, 
          visitorEmail: visitor.email,
          // PHASE 2: Session tracking
          userAgent: navigator.userAgent,
        }),
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok) throw new Error(result.data && result.data.error ? result.data.error : 'The chat service is unavailable.');
          var bubble = appendMessage('bot', result.data.reply || 'Thanks for your message.');
          if (result.data.queued && result.data.since) pollForReply(result.data.since, bubble);
        })
        .catch(function (err) {
          appendMessage('bot', err && err.message ? err.message : 'The chat service is unavailable.');
        })
        .finally(function () { sending = false; });
    }

    panel.querySelector('[data-role="send"]').addEventListener('click', sendMessage);
    textInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });

    // Let the host page trigger the widget: data-sabibio-trigger="chat" opens
    // it plainly; data-sabibio-item="CODE" opens it with a prefilled inquiry.
    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-sabibio-trigger], [data-sabibio-item]') : null;
      if (!el) return;
      var itemCode = el.getAttribute('data-sabibio-item');
      open(itemCode ? ('I\'m interested in ' + itemCode) : undefined);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
