(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var app = $('#app'), titulo = $('#titulo'), sub = $('#sub'), voltar = $('#voltar');
  var playerEl = $('#player'), pIt = $('#p-it'), pPt = $('#p-pt'), pPlay = $('#p-play'), pVel = $('#p-vel'), pProg = $('#p-prog');
  var audio = new Audio(); audio.preload = 'auto';

  var DATA = [], ok = {}, modo = 'n'; // modo: n = normal, l = lento, b = lento + normal
  try { ok = JSON.parse(localStorage.getItem('ouca-fr-ok') || '{}'); modo = localStorage.getItem('ouca-fr-modo') || 'n'; } catch (e) {}
  var fila = [], idx = -1, tema = -1, passo = 0, auto = false, timer = null, deferredInstall = null;

  function salvar() { try { localStorage.setItem('ouca-fr-ok', JSON.stringify(ok)); localStorage.setItem('ouca-fr-modo', modo); } catch (e) {} }
  function aviso(t) { var a = $('#aviso'); a.textContent = t; a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.hidden = true; }, 2600); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function totalOk() { return Object.keys(ok).length; }
  function totalFrases() { return DATA.reduce(function (a, t) { return a + t.frases.length; }, 0); }
  function okTema(t) { return DATA[t].frases.filter(function (f) { return ok[f.id]; }).length; }
  function nomeModo() { return modo === 'n' ? 'Normal' : modo === 'l' ? 'Lento' : 'Lento + Normal'; }

  /* ---------- telas ---------- */
  function home() {
    tema = -1; voltar.hidden = true; titulo.textContent = 'Ouça e Repita'; sub.textContent = 'Francês na Prática';
    var pct = Math.round(100 * totalOk() / totalFrases());
    var h = '<div class="intro"><b>Como usar:</b> escolha um tema, toque em <b>Lento</b> para ouvir devagar e em <b>Normal</b> para ouvir na velocidade natural. Repita em voz alta. Marque <b>"Já sei"</b> nas frases que você dominou.</div>';
    h += '<div class="geral"><span>' + totalOk() + ' de ' + totalFrases() + ' frases</span><div class="barra"><i style="width:' + pct + '%"></i></div><span>' + pct + '%</span></div><div class="grade">';
    DATA.forEach(function (t, i) {
      var o = okTema(i), p = Math.round(100 * o / t.frases.length);
      h += '<button class="tema" data-t="' + i + '"><span class="em">' + t.emoji + '</span><strong>' + esc(t.titulo) + '</strong><small>' + o + '/' + t.frases.length + ' frases</small><div class="barra"><i style="width:' + p + '%"></i></div></button>';
    });
    h += '</div>';
    if (deferredInstall) h += '<div class="acoes" style="margin-top:16px"><button class="btn" id="instalar">📲 Instalar o app no celular</button></div>';
    else if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone) h += '<div class="intro" style="margin-top:14px">📲 <b>Para instalar no iPhone:</b> toque em Compartilhar (□↑) e depois em <b>Adicionar à Tela de Início</b>.</div>';
    app.innerHTML = h;
  }

  function telaTema(i) {
    tema = i; var t = DATA[i];
    voltar.hidden = false; titulo.textContent = t.emoji + ' ' + t.titulo; sub.textContent = t.frases.length + ' frases · velocidade: ' + nomeModo();
    var h = '<div class="acoes"><button class="btn" id="tocar-tema">▶ Tocar o tema todo</button><button class="btn alt" id="offline">⬇ Salvar para ouvir offline</button></div><div class="lista">';
    t.frases.forEach(function (f, k) {
      h += '<div class="frase' + (ok[f.id] ? ' ok' : '') + '" data-k="' + k + '" id="f-' + f.id + '"><div><div class="it">' + esc(f.it) + '</div><div class="pt">' + esc(f.pt) + '</div><div class="pr">🗣 ' + esc(f.pr) + '</div></div>' +
        '<div class="bt"><button data-a="n" data-k="' + k + '">▶ Normal</button><button class="l" data-a="l" data-k="' + k + '">🐢 Lento</button></div>' +
        '<div class="ft"><span>#' + f.id + '</span><button data-a="ok" data-k="' + k + '">' + (ok[f.id] ? '✓ Já sei' : 'Marcar "Já sei"') + '</button></div></div>';
    });
    h += '</div>';
    app.innerHTML = h; window.scrollTo(0, 0);
    marca();
  }

  function rota() {
    var m = location.hash.match(/^#\/t\/(\d+)/);
    if (m && DATA[+m[1]]) telaTema(+m[1]); else home();
  }

  /* ---------- player ---------- */
  function url(f, v) { return 'audio/' + f.id + '-' + v + '.mp3'; }
  function marca() {
    document.querySelectorAll('.frase.tocando').forEach(function (e) { e.classList.remove('tocando'); });
    if (idx >= 0 && fila[idx]) { var el = document.getElementById('f-' + fila[idx].id); if (el) el.classList.add('tocando'); }
  }
  function tocar(k, v, continuo) {
    clearTimeout(timer);
    if (tema < 0 || !DATA[tema]) return;
    fila = DATA[tema].frases; idx = k; auto = !!continuo;
    var f = fila[k];
    if (v) { passo = 0; } else { v = modo === 'b' ? 'l' : modo; passo = modo === 'b' ? 1 : 0; }
    audio.src = url(f, v);
    audio.playbackRate = 1;
    var p = audio.play(); if (p && p.catch) p.catch(function () { aviso('Toque em ▶ para ouvir'); });
    playerEl.hidden = false; document.body.classList.add('com-player');
    pIt.textContent = f.it; pPt.textContent = f.pt + ' · ' + (v === 'l' ? 'lento' : 'normal');
    pVel.textContent = nomeModo();
    marca();
    var el = document.getElementById('f-' + f.id); if (el && auto) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: f.it, artist: 'Ouça e Repita', album: DATA[tema].titulo });
      navigator.mediaSession.setActionHandler('previoustrack', anterior);
      navigator.mediaSession.setActionHandler('nexttrack', proxima);
      navigator.mediaSession.setActionHandler('play', function () { audio.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
    }
  }
  function proxima() { if (idx < fila.length - 1) tocar(idx + 1, null, auto); else parar(); }
  function anterior() { if (idx > 0) tocar(idx - 1, null, auto); else tocar(0, null, auto); }
  function parar() { audio.pause(); auto = false; clearTimeout(timer); }

  audio.addEventListener('play', function () { pPlay.textContent = '⏸'; });
  audio.addEventListener('pause', function () { pPlay.textContent = '▶'; });
  audio.addEventListener('timeupdate', function () { if (audio.duration) pProg.style.width = (100 * audio.currentTime / audio.duration) + '%'; });
  audio.addEventListener('error', function () { aviso('Não foi possível carregar o áudio. Verifique a conexão.'); });
  audio.addEventListener('ended', function () {
    var f = fila[idx]; if (!f) return;
    // modo "lento + normal": depois do lento, toca o normal da mesma frase
    if (modo === 'b' && passo === 1) {
      passo = 2; var gap = Math.max(1200, (audio.duration || 2) * 1000);
      if (auto) { timer = setTimeout(function () { audio.src = url(f, 'n'); audio.play(); pPt.textContent = f.pt + ' · normal'; }, gap); }
      else { audio.src = url(f, 'n'); audio.play(); pPt.textContent = f.pt + ' · normal'; }
      return;
    }
    if (auto) { // pausa para o aluno repetir em voz alta
      var espera = Math.max(1500, (audio.duration || 2) * 1000 + 600);
      timer = setTimeout(proxima, espera);
    }
  });

  /* ---------- eventos ---------- */
  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t !== undefined) { location.hash = '#/t/' + b.dataset.t; return; }
    if (b.id === 'instalar') { deferredInstall.prompt(); deferredInstall = null; return; }
    if (b.id === 'tocar-tema') { tocar(0, null, true); return; }
    if (b.id === 'offline') { offline(); return; }
    var k = +b.dataset.k, a = b.dataset.a, f = DATA[tema] && DATA[tema].frases[k];
    if (!f) return;
    if (a === 'n' || a === 'l') { tocar(k, a, false); }
    if (a === 'ok') { if (ok[f.id]) delete ok[f.id]; else ok[f.id] = 1; salvar(); b.textContent = ok[f.id] ? '✓ Já sei' : 'Marcar "Já sei"'; document.getElementById('f-' + f.id).classList.toggle('ok', !!ok[f.id]); }
  });
  voltar.addEventListener('click', function () { location.hash = '#/'; });
  window.addEventListener('hashchange', function () { parar(); playerEl.hidden = true; document.body.classList.remove('com-player'); rota(); });
  pPlay.addEventListener('click', function () { if (audio.src && !audio.ended) { audio.paused ? audio.play() : audio.pause(); } else if (idx >= 0) tocar(idx, null, auto); });
  $('#p-next').addEventListener('click', proxima);
  $('#p-prev').addEventListener('click', anterior);
  pVel.addEventListener('click', function () {
    modo = modo === 'n' ? 'l' : modo === 'l' ? 'b' : 'n'; salvar(); pVel.textContent = nomeModo();
    if (tema >= 0) sub.textContent = DATA[tema].frases.length + ' frases · velocidade: ' + nomeModo();
    aviso('Velocidade: ' + nomeModo());
  });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; if (tema < 0) home(); });

  function offline() {
    if (!('caches' in window)) { aviso('Seu navegador não permite salvar offline.'); return; }
    var urls = []; DATA[tema].frases.forEach(function (f) { urls.push(url(f, 'n'), url(f, 'l')); });
    aviso('Salvando ' + urls.length + ' áudios…');
    caches.open('ouca-fr-audio-v1').then(function (c) { return Promise.all(urls.map(function (u) { return c.match(u).then(function (r) { return r || fetch(u).then(function (x) { return c.put(u, x); }); }); })); })
      .then(function () { aviso('✓ Tema salvo! Funciona sem internet.'); })
      .catch(function () { aviso('Falha ao salvar. Tente de novo com internet.'); });
  }

  /* ---------- início ---------- */
  fetch('data.json').then(function (r) { return r.json(); }).then(function (d) { DATA = d; rota(); }).catch(function () { app.innerHTML = '<div class="intro">Não foi possível carregar o conteúdo. Verifique sua conexão e abra de novo.</div>'; });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
