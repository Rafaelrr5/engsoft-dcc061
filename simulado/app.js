(function () {
  'use strict';
  var D = window.DATA;
  var app = document.getElementById('app');
  var $title = document.getElementById('title');
  var $back = document.getElementById('back');
  var $res = document.getElementById('res');

  function key(p) { return 'engsoft:' + p; }
  function load(p) { try { return JSON.parse(localStorage.getItem(key(p))) || {}; } catch (e) { return {}; } }
  function save(p, s) { localStorage.setItem(key(p), JSON.stringify(s)); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function go(h) { location.hash = h; }
  function qs(p) { return D[p].q; }
  function units(p) {
    var u = []; qs(p).forEach(function (q) { if (u.indexOf(q.unit) < 0) u.push(q.unit); });
    function k(x) { var m = x.match(/(\d+)/); return m ? +m[1] : 99; }
    return u.sort(function (a, b) { return k(a) - k(b); });
  }
  function short(u) { var m = u.match(/^Unidade (\d+)( \(parte 2\))?/); return m ? 'U' + m[1] + (m[2] ? '·2' : '') : u; }

  // A corrected answer scores the share of key points the student ticked.
  function frac(Q, st) { return st && st.done ? (st.hit || []).length / Q.pontos.length : null; }
  function grade(f) { return f === null ? '' : f >= 0.75 ? 'ok' : f >= 0.4 ? 'mid' : 'bad'; }
  var GL = { ok: 'Certa', mid: 'Parcial', bad: 'Errada' };

  function score(p, unit) {
    var s = load(p), r = { total: 0, done: 0, ok: 0, mid: 0, bad: 0, pts: 0 };
    qs(p).forEach(function (Q) {
      if (unit && Q.unit !== unit) return;
      r.total++;
      var f = frac(Q, s[Q.n]);
      if (f === null) return;
      r.done++; r.pts += f; r[grade(f)]++;
    });
    return r;
  }
  function pct(r) { return r.done ? Math.round(100 * r.pts / r.done) : 0; }

  function home() {
    $title.textContent = 'Simulados · Engenharia de Software';
    $back.classList.add('hide'); $res.classList.add('hide');
    var h = '<div class="grid">';
    Object.keys(D).forEach(function (p) {
      var r = score(p);
      h += '<button class="ed" data-p="' + p + '"><b>' + esc(D[p].name) + '</b><span class="sub">' + esc(D[p].sub) + '</span><small>' +
        r.done + '/' + r.total + ' corrigidas' + (r.done ? ' · ' + pct(r) + '% dos pontos' : '') +
        '</small><div class="bar"><i style="width:' + (100 * r.done / r.total) + '%"></i></div></button>';
    });
    h += '</div><p class="note">Escolha a prova, escreva sua resposta e toque em <b>Corrigir</b>. Aparece a resposta esperada e a lista ' +
      'de pontos que o professor procura: marque os que você cobriu. Cobriu 75% ou mais, a questão conta como certa; de 40% a 74%, ' +
      'parcial. O progresso fica salvo neste aparelho.</p>';
    app.innerHTML = h;
    app.querySelectorAll('.ed').forEach(function (b) { b.onclick = function () { go('#/' + b.dataset.p + '/' + firstOpen(b.dataset.p)); }; });
  }

  function firstOpen(p) { var s = load(p), L = qs(p); for (var i = 0; i < L.length; i++) if (!(s[L[i].n] && s[L[i].n].done)) return L[i].n; return L[0].n; }
  function byN(p, n) { var L = qs(p); for (var i = 0; i < L.length; i++) if (L[i].n === n) return i; return -1; }

  function quiz(p, n) {
    var P = D[p]; if (!P) return home();
    var L = P.q, i = byN(p, n); if (i < 0) i = 0;
    var Q = L[i], s = load(p), st = s[Q.n] || {}, f = frac(Q, st), g = grade(f);
    $title.textContent = P.name + ' · ' + short(Q.unit);
    $back.classList.remove('hide'); $res.classList.remove('hide');
    $res.onclick = function () { go('#/' + p + '/res'); };

    var h = '<div class="secs">';
    units(p).forEach(function (u) {
      var r = score(p, u), first = L.filter(function (q) { return q.unit === u; })[0].n;
      h += '<button data-n="' + first + '"' + (u === Q.unit ? ' class="on"' : '') + ' title="' + esc(u) + '">' + short(u) + ' ' + r.done + '/' + r.total + '</button>';
    });
    h += '</div><div class="panel"><div class="qh"><h2>Questão ' + Q.n + '</h2><span class="unit">' + esc(Q.unit) + '</span></div>' +
      '<div class="enun">' + Q.enun + '</div>';
    if (!st.done) {
      h += '<label class="lbl" for="ans">Sua resposta</label><textarea id="ans" rows="7" placeholder="Escreva como escreveria na prova. Pode deixar em branco e só conferir."></textarea>' +
        '<div class="nav2"><button id="fix" class="pri">Corrigir</button></div>';
    } else {
      if (st.txt) h += '<div class="lbl">Sua resposta</div><div class="mine">' + esc(st.txt).replace(/\n/g, '<br>') + '</div>';
      h += '<div class="fb ' + g + '"><strong>' + GL[g] + ' · ' + (st.hit || []).length + ' de ' + Q.pontos.length + ' pontos</strong>' +
        '<div class="lbl">O que o professor procura (marque o que você cobriu)</div><ul class="chk">';
      Q.pontos.forEach(function (pt, k) {
        var on = (st.hit || []).indexOf(k) >= 0;
        h += '<li><label><input type="checkbox" data-k="' + k + '"' + (on ? ' checked' : '') + '> ' + esc(pt) + '</label></li>';
      });
      h += '</ul></div><details class="model" open><summary>Resposta esperada' + (Q.of ? ' (gabarito do professor)' : ' (resposta-modelo, não oficial)') +
        '</summary>' + Q.resp + '</details>';
    }
    h += '<div class="nav2"><button id="prev">‹ Anterior</button><button id="next" class="pri">Próxima ›</button></div><div class="dots">';
    L.forEach(function (q) {
      if (q.unit !== Q.unit) return;
      h += '<button data-n="' + q.n + '" class="' + grade(frac(q, s[q.n])) + (q.n === Q.n ? ' cur' : '') + '">' + q.n + '</button>';
    });
    var r = score(p, Q.unit);
    h += '</div><div class="stats">' + esc(short(Q.unit)) + ': ' + r.ok + ' certas, ' + r.mid + ' parciais, ' + r.bad + ' erradas de ' + r.done + ' corrigidas</div>' +
      (st.done ? '<div class="nav2"><button id="redo">Refazer esta questão</button></div>' : '') + '</div>';
    app.innerHTML = h;

    var ta = document.getElementById('ans');
    if (ta) {
      ta.value = st.txt || '';
      ta.oninput = function () { var x = load(p); x[Q.n] = { txt: ta.value }; save(p, x); };
      document.getElementById('fix').onclick = function () { var x = load(p); x[Q.n] = { txt: ta.value, done: true, hit: [] }; save(p, x); quiz(p, Q.n); };
    }
    app.querySelectorAll('.chk input').forEach(function (c) {
      c.onchange = function () {
        var x = load(p), e = x[Q.n], k = +c.dataset.k;
        e.hit = (e.hit || []).filter(function (v) { return v !== k; });
        if (c.checked) e.hit.push(k);
        save(p, x);
        var y = document.scrollingElement.scrollTop; quiz(p, Q.n); document.scrollingElement.scrollTop = y;
      };
    });
    document.getElementById('prev').onclick = function () { if (i > 0) go('#/' + p + '/' + L[i - 1].n); };
    document.getElementById('next').onclick = function () { go(i < L.length - 1 ? '#/' + p + '/' + L[i + 1].n : '#/' + p + '/res'); };
    app.querySelectorAll('.secs button, .dots button').forEach(function (b) { b.onclick = function () { go('#/' + p + '/' + b.dataset.n); }; });
    var redo = document.getElementById('redo');
    if (redo) redo.onclick = function () { var x = load(p); x[Q.n] = { txt: (x[Q.n] || {}).txt || '' }; save(p, x); quiz(p, Q.n); };
  }

  function result(p) {
    var P = D[p]; if (!P) return home();
    $title.textContent = P.name + ' · Resultado';
    $back.classList.remove('hide'); $res.classList.add('hide');
    var s = load(p), t = score(p);
    var h = '<table><tr><th>Unidade</th><th>Corrigidas</th><th>Certas</th><th>Parciais</th><th>% pontos</th></tr>';
    units(p).forEach(function (u) {
      var r = score(p, u);
      h += '<tr><td>' + esc(u) + '</td><td>' + r.done + '/' + r.total + '</td><td>' + r.ok + '</td><td>' + r.mid + '</td><td>' + pct(r) + '%</td></tr>';
    });
    h += '<tr><th>Total</th><th>' + t.done + '/' + t.total + '</th><th>' + t.ok + '</th><th>' + t.mid + '</th><th>' + pct(t) + '%</th></tr></table>';
    var rev = P.q.filter(function (q) { var g = grade(frac(q, s[q.n])); return g === 'bad' || g === 'mid'; });
    h += '<h3>Para revisar (' + rev.length + ')</h3><div class="dots">' + rev.map(function (q) {
      return '<button class="' + grade(frac(q, s[q.n])) + '" data-n="' + q.n + '">' + q.n + '</button>';
    }).join('') + '</div><div class="nav2"><button id="wipe">Apagar respostas deste simulado</button></div>';
    app.innerHTML = h;
    app.querySelectorAll('.dots button').forEach(function (b) { b.onclick = function () { go('#/' + p + '/' + b.dataset.n); }; });
    document.getElementById('wipe').onclick = function () { if (confirm('Apagar todas as respostas de ' + P.name + '?')) { localStorage.removeItem(key(p)); home(); } };
  }

  $back.onclick = function () { go('#/'); };
  function route() {
    var m = location.hash.match(/^#\/(\w+)\/(\w+)/);
    if (!m || !D[m[1]]) return home();
    if (m[2] === 'res') return result(m[1]);
    quiz(m[1], parseInt(m[2], 10));
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
