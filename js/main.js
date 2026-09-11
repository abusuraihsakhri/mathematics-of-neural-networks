/* ==========================================================================
   Mathematics of Neural Networks — shared site script

   Every block below is guarded by an existence check, because this one file
   is loaded by every page and each page contains only some of the widgets.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* Re-typeset a subtree after we inject LaTeX into it. */
  function typeset(el) {
    if (el && window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([el]).catch(function () {});
    }
  }
  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  /* --- Theme System with Multi-callback support ------------------------ */
  var themeCallbacks = [];
  function registerThemeCallback(fn) {
    if (typeof fn === 'function') themeCallbacks.push(fn);
  }
  window.redrawTheme = function () {
    themeCallbacks.forEach(function (cb) {
      try { cb(); } catch (e) {}
    });
  };

  (function () {
    var btn = $('#theme-btn');
    if (!btn) return;
    var sync = function () {
      btn.textContent = document.documentElement.dataset.theme === 'dark' ? '\u2600' : '\u263E';
    };
    btn.addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('nnmath-theme', next); } catch (e) {}
      sync();
      window.redrawTheme();
    });
    sync();
  }());

  /* --- Reading progress ------------------------------------------------- */
  (function () {
    var bar = $('#progress');
    if (!bar) return;
    var update = function () {
      var d = document.documentElement;
      var span = d.scrollHeight - window.innerHeight;
      bar.style.width = (span > 0 ? (window.scrollY / span) * 100 : 0) + '%';
    };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  }());

  /* --- Sidebar drawer (narrow screens) ---------------------------------- */
  (function () {
    var btn = $('#menu-btn'), bar = $('.sidebar');
    if (!btn || !bar) return;
    btn.addEventListener('click', function () {
      var open = bar.dataset.open === 'true';
      bar.dataset.open = String(!open);
      btn.setAttribute('aria-expanded', String(!open));
    });
    bar.addEventListener('click', function (e) {
      if (e.target.closest('a')) bar.dataset.open = 'false';
    });
  }());

  /* --- "On this page" list + scrollspy ---------------------------------- */
  (function () {
    var host = $('#onthispage');
    if (!host) return;
    var heads = $$('.prose h2[id]');
    if (!heads.length) { var wrap = host.closest('section'); if (wrap) wrap.hidden = true; return; }

    heads.forEach(function (h) {
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      host.appendChild(a);
    });

    var links = $$('a', host);
    var spy = function () {
      var best = 0;
      heads.forEach(function (h, i) {
        if (h.getBoundingClientRect().top < window.innerHeight * 0.35) best = i;
      });
      links.forEach(function (a, i) { a.classList.toggle('active', i === best); });
    };
    addEventListener('scroll', spy, { passive: true });
    spy();
  }());

  /* ========================================================================
     LANDING PAGE: The 60-Second Neural Sandbox
     ======================================================================== */
  (function () {
    var wrap = $('#mini-net-widget');
    if (!wrap) return;
    var x1El = $('#mn-x1'), x2El = $('#mn-x2'), w1El = $('#mn-w1'), w2El = $('#mn-w2'), bEl = $('#mn-b'), yEl = $('#mn-y');
    var actEl = $('#mn-act'), lrEl = $('#mn-lr'), stepBtn = $('#mn-step'), resetBtn = $('#mn-reset');
    var outEl = $('#mn-output');
    if (!x1El || !outEl) return;

    function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
    function dSigmoid(a) { return a * (1 - a); }

    function render() {
      var x1 = +x1El.value, x2 = +x2El.value;
      var w1 = +w1El.value, w2 = +w2El.value, b = +bEl.value, y = +yEl.value;
      var act = actEl ? actEl.value : 'relu';
      var z = w1 * x1 + w2 * x2 + b;
      var a = act === 'relu' ? Math.max(0, z) : sigmoid(z);
      var err = a - y;
      var cost = 0.5 * err * err;
      var da_dz = act === 'relu' ? (z > 0 ? 1 : 0) : dSigmoid(a);
      var delta = err * da_dz;
      var dC_dw1 = delta * x1;
      var dC_dw2 = delta * x2;
      var dC_db = delta;

      if ($('#mn-x1-val')) $('#mn-x1-val').textContent = x1.toFixed(1);
      if ($('#mn-x2-val')) $('#mn-x2-val').textContent = x2.toFixed(1);
      if ($('#mn-w1-val')) $('#mn-w1-val').textContent = w1.toFixed(2);
      if ($('#mn-w2-val')) $('#mn-w2-val').textContent = w2.toFixed(2);
      if ($('#mn-b-val')) $('#mn-b-val').textContent = b.toFixed(2);
      if ($('#mn-y-val')) $('#mn-y-val').textContent = y.toFixed(1);

      outEl.innerHTML =
        '<div class="metrics">' +
          '<div><span>Weighted Sum (z)</span><b>' + z.toFixed(3) + '</b></div>' +
          '<div><span>Activation (a)</span><b>' + a.toFixed(3) + '</b></div>' +
          '<div><span>Target (y)</span><b>' + y.toFixed(1) + '</b></div>' +
          '<div><span>Cost &frac12;(a-y)&sup2;</span><b>' + cost.toFixed(4) + '</b></div>' +
        '</div>' +
        '<div class="readout">' +
          '<b>Local Sensitivities (Gradients):</b> ' +
          '&part;C/&part;w\u2081 = <code>' + dC_dw1.toFixed(3) + '</code> &middot; ' +
          '&part;C/&part;w\u2082 = <code>' + dC_dw2.toFixed(3) + '</code> &middot; ' +
          '&part;C/&part;b = <code>' + dC_db.toFixed(3) + '</code><br>' +
          (Math.abs(delta) < 0.005 ? '<span style="color:var(--emerald)">&#10003; Target matched! Cost is minimal.</span>' :
          (act === 'relu' && z <= 0 ? '<span style="color:var(--rose)">&#9888; Dying ReLU: z &le; 0. Local derivative is 0, so weight updates are completely frozen!</span>' :
          'Click <b>Step 1 Gradient Descent Step</b> to nudge weights against the gradient and watch error drop.')) +
        '</div>';
    }

    function step() {
      var x1 = +x1El.value, x2 = +x2El.value;
      var w1 = +w1El.value, w2 = +w2El.value, b = +bEl.value, y = +yEl.value;
      var act = actEl ? actEl.value : 'relu', lr = lrEl ? +lrEl.value : 0.2;
      var z = w1 * x1 + w2 * x2 + b;
      var a = act === 'relu' ? Math.max(0, z) : sigmoid(z);
      var err = a - y;
      var da_dz = act === 'relu' ? (z > 0 ? 1 : 0) : dSigmoid(a);
      var delta = err * da_dz;
      w1El.value = (w1 - lr * delta * x1).toFixed(2);
      w2El.value = (w2 - lr * delta * x2).toFixed(2);
      bEl.value = (b - lr * delta).toFixed(2);
      render();
    }

    function reset() {
      w1El.value = '0.50'; w2El.value = '-0.30'; bEl.value = '0.10';
      x1El.value = '1.0'; x2El.value = '2.0'; yEl.value = '1.0';
      render();
    }

    [x1El, x2El, w1El, w2El, bEl, yEl, actEl, lrEl].forEach(function (el) {
      if (el) el.addEventListener('input', render);
    });
    if (stepBtn) stepBtn.addEventListener('click', step);
    if (resetBtn) resetBtn.addEventListener('click', reset);
    render();
  }());

  /* ========================================================================
     CHAPTER 1: Interactive Network Architecture & Notation Explorer
     ======================================================================== */
  (function () {
    var wrap = $('#arch-builder');
    if (!wrap) return;
    var inEl = $('#arch-in'), h1El = $('#arch-h1'), h2El = $('#arch-h2'), outEl = $('#arch-out');
    var pulseBtn = $('#arch-pulse'), svgHost = $('#arch-svg'), infoHost = $('#arch-info');
    if (!inEl || !svgHost) return;

    function render() {
      var n0 = +inEl.value, n1 = +h1El.value, n2 = +h2El.value, n3 = +outEl.value;
      if ($('#arch-in-val')) $('#arch-in-val').textContent = n0;
      if ($('#arch-h1-val')) $('#arch-h1-val').textContent = n1;
      if ($('#arch-h2-val')) $('#arch-h2-val').textContent = n2;
      if ($('#arch-out-val')) $('#arch-out-val').textContent = n3;

      var layers = [n0, n1, n2, n3];
      var W = 620, H = 260;
      var colX = [60, 220, 390, 550];
      var layerNodes = [];

      for (var l = 0; l < layers.length; l++) {
        var count = layers[l];
        var nodes = [];
        var spacing = H / (count + 1);
        for (var i = 0; i < count; i++) {
          nodes.push({ x: colX[l], y: spacing * (i + 1), layer: l, idx: i + 1 });
        }
        layerNodes.push(nodes);
      }

      var edgeSvg = '';
      for (var l = 1; l < layers.length; l++) {
        var prev = layerNodes[l - 1];
        var curr = layerNodes[l];
        for (var j = 0; j < curr.length; j++) {
          for (var k = 0; k < prev.length; k++) {
            edgeSvg += '<line x1="' + prev[k].x + '" y1="' + prev[k].y +
              '" x2="' + curr[j].x + '" y2="' + curr[j].y +
              '" stroke="' + css('--rule-firm') + '" stroke-width="1.3" opacity="0.6"/>';
          }
        }
      }

      var nodeSvg = '';
      for (var l = 0; l < layerNodes.length; l++) {
        for (var i = 0; i < layerNodes[l].length; i++) {
          var nd = layerNodes[l][i];
          var lbl = l === 0 ? 'x' + nd.idx : (l === 3 ? (layers[3] > 1 ? '\u0177' + nd.idx : '\u0177') : 'a' + l + '_' + nd.idx);
          nodeSvg += '<g class="arch-node">' +
            '<circle cx="' + nd.x + '" cy="' + nd.y + '" r="16" fill="' + css('--surface') + '" stroke="' +
            (l === 0 ? css('--accent') : (l === 3 ? css('--emerald') : css('--rule-firm'))) + '" stroke-width="2"/>' +
            '<text x="' + nd.x + '" y="' + (nd.y + 4) + '" text-anchor="middle" font-size="11" fill="' +
            css('--ink') + '" font-family="ui-monospace, monospace">' + lbl + '</text>' +
            '</g>';
        }
      }

      svgHost.innerHTML =
        '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img">' +
        edgeSvg + nodeSvg +
        '</svg>';

      var totalParams = (n1 * n0 + n1) + (n2 * n1 + n2) + (n3 * n2 + n3);
      if (infoHost) {
        infoHost.innerHTML =
          '<div class="metrics">' +
            '<div><span>Weight Matrix W&sup1;</span><b>' + n1 + ' &times; ' + n0 + '</b></div>' +
            '<div><span>Weight Matrix W&sup2;</span><b>' + n2 + ' &times; ' + n1 + '</b></div>' +
            '<div><span>Weight Matrix W&sup3;</span><b>' + n3 + ' &times; ' + n2 + '</b></div>' +
            '<div><span>Total Parameters (&theta;)</span><b>' + totalParams + '</b></div>' +
          '</div>' +
          '<div class="note shape" style="margin-top:0.8rem">' +
            '<span class="label">Destination-First Shape Check</span>' +
            'Weight matrix <b>W<sup>l</sup></b> has shape <code>' +
            'n_dest &times; n_src = (n_l &times; n_{l-1})' +
            '</code>. Notice: W&sup1; has <b>' + n1 + ' rows</b> (destinations in layer 1) and <b>' + n0 +
            ' columns</b> (sources in input). This convention ensures <code>z&sup1; = W&sup1;x + b&sup1;</code> without transposing!' +
          '</div>';
      }
    }

    [inEl, h1El, h2El, outEl].forEach(function (el) {
      if (el) el.addEventListener('input', render);
    });
    if (pulseBtn) pulseBtn.addEventListener('click', function () {
      var svg = $('svg', svgHost);
      if (!svg) return;
      svg.style.transition = 'filter 0.25s';
      svg.style.filter = 'drop-shadow(0 0 10px var(--accent))';
      setTimeout(function () { svg.style.filter = 'none'; }, 400);
    });

    registerThemeCallback(render);
    render();
  }());

  /* --- Chapter 2: gradient explorer ------------------------------------- */
  (function () {
    var gx = $('#gx'), gy = $('#gy'), out = $('#grad-out');
    if (!gx || !gy || !out) return;

    var render = function () {
      var x = +gx.value, y = +gy.value;
      $('#gx-val').value = x.toFixed(2);
      $('#gy-val').value = y.toFixed(2);
      var f = x * x + Math.cos(y), dx = 2 * x, dy = -Math.sin(y);
      var norm = Math.hypot(dx, dy);
      out.innerHTML =
        '<div class="eq">\\[f(' + x.toFixed(2) + ',' + y.toFixed(2) + ')=' + f.toFixed(3) +
        ',\\qquad \\nabla f=\\begin{bmatrix}' + dx.toFixed(3) + '\\\\' + dy.toFixed(3) +
        '\\end{bmatrix},\\qquad \\lVert\\nabla f\\rVert=' + norm.toFixed(3) + '\\]</div>' +
        '<p>Steepest ascent points along \\(\\nabla f\\); a descent step moves along \\(-\\nabla f\\). ' +
        'Notice that the \\(x\\) component grows without bound while the \\(y\\) component never ' +
        'leaves \\([-1,1]\\) — the two inputs are not equally influential.</p>';
      typeset(out);
    };
    gx.addEventListener('input', render);
    gy.addEventListener('input', render);
    render();
  }());

  /* --- Chapter 2: 2D Contour & Gradient Vector Field Canvas --- */
  (function () {
    var canvas = $('#ch2-contour-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var readEl = $('#ch2-contour-readout');
    var curX = 1.6, curY = 0.8;
    var isDragging = false;

    function f(x, y) { return 0.5 * (x * x + 2.5 * y * y) - 0.25 * Math.cos(2 * x); }
    function grad(x, y) { return [x + 0.5 * Math.sin(2 * x), 2.5 * y]; }

    function toScreen(x, y, w, h) {
      return [(x + 3) / 6 * w, (3 - y) / 6 * h];
    }
    function toWorld(px, py, w, h) {
      return [(px / w) * 6 - 3, 3 - (py / h) * 6];
    }

    function draw() {
      var w = canvas.width = canvas.parentElement.clientWidth || 580;
      var h = canvas.height = 280;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = css('--surface-2');
      ctx.fillRect(0, 0, w, h);

      var levels = [0.3, 0.9, 1.8, 3.2, 5.2, 7.8];
      ctx.lineWidth = 1;
      for (var li = 0; li < levels.length; li++) {
        var lev = levels[li];
        ctx.strokeStyle = css('--rule-firm');
        ctx.beginPath();
        for (var a = 0; a <= 360; a += 5) {
          var rad = a * Math.PI / 180;
          var rx = Math.cos(rad) * Math.sqrt(2 * lev);
          var ry = Math.sin(rad) * Math.sqrt(2 * lev / 2.5);
          var p = toScreen(rx, ry, w, h);
          if (a === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = css('--rule');
      for (var gx = -2.5; gx <= 2.5; gx += 0.8) {
        for (var gy = -2.5; gy <= 2.5; gy += 0.8) {
          var g = grad(gx, gy);
          var len = Math.hypot(g[0], g[1]);
          if (len < 0.05) continue;
          var p1 = toScreen(gx, gy, w, h);
          var p2 = [p1[0] + (g[0] / len) * 11, p1[1] - (g[1] / len) * 11];
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
        }
      }

      var p = toScreen(curX, curY, w, h);
      var g = grad(curX, curY);
      var gLen = Math.hypot(g[0], g[1]);
      var scale = 26 / (gLen || 1);

      // Gradient vector (purple)
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = css('--accent');
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[0] + g[0] * scale, p[1] - g[1] * scale);
      ctx.stroke();

      // Negative gradient vector (green)
      ctx.lineWidth = 2;
      ctx.strokeStyle = css('--emerald');
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[0] - g[0] * scale, p[1] + g[1] * scale);
      ctx.stroke();

      // Evaluation puck
      ctx.fillStyle = css('--accent');
      ctx.beginPath();
      ctx.arc(p[0], p[1], 6, 0, 2 * Math.PI);
      ctx.fill();

      if (readEl) {
        readEl.innerHTML =
          '<div class="metrics">' +
            '<div><span>Point (x, y)</span><b>(' + curX.toFixed(2) + ', ' + curY.toFixed(2) + ')</b></div>' +
            '<div><span>Height f(x, y)</span><b>' + f(curX, curY).toFixed(3) + '</b></div>' +
            '<div><span>Gradient &nabla;f</span><b>[' + g[0].toFixed(2) + ', ' + g[1].toFixed(2) + ']\u1D40</b></div>' +
            '<div><span>Slope ||&nabla;f||</span><b>' + gLen.toFixed(3) + '</b></div>' +
          '</div>' +
          '<p style="font-size:0.86rem;margin-top:0.4rem">' +
            '<span style="color:var(--accent);font-weight:600">&rarr; Purple Arrow: &nabla;f</span> (Steepest uphill) &nbsp;|&nbsp; ' +
            '<span style="color:var(--emerald);font-weight:600">&rarr; Green Arrow: -&nabla;f</span> (Downhill descent direction). Drag puck to test any coordinate!' +
          '</p>';
      }
    }

    function handlePointer(e) {
      var rect = canvas.getBoundingClientRect();
      var px = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      var py = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
      var world = toWorld(px, py, canvas.width, canvas.height);
      curX = Math.max(-2.8, Math.min(2.8, world[0]));
      curY = Math.max(-2.8, Math.min(2.8, world[1]));
      draw();
    }

    canvas.addEventListener('pointerdown', function (e) { isDragging = true; handlePointer(e); });
    window.addEventListener('pointermove', function (e) { if (isDragging) handlePointer(e); });
    window.addEventListener('pointerup', function () { isDragging = false; });
    window.addEventListener('resize', draw);
    registerThemeCallback(draw);
    draw();
  }());

  /* --- Chapter 2: Jacobian Space Deformer Canvas --- */
  (function () {
    var canvas = $('#jacobian-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var aEl = $('#jac-a'), bEl = $('#jac-b'), cEl = $('#jac-c'), dEl = $('#jac-d');
    var outEl = $('#jac-out');
    if (!aEl || !outEl) return;

    function draw() {
      var a = +aEl.value, b = +bEl.value, c = +cEl.value, d = +dEl.value;
      if ($('#jac-a-val')) $('#jac-a-val').textContent = a.toFixed(1);
      if ($('#jac-b-val')) $('#jac-b-val').textContent = b.toFixed(1);
      if ($('#jac-c-val')) $('#jac-c-val').textContent = c.toFixed(1);
      if ($('#jac-d-val')) $('#jac-d-val').textContent = d.toFixed(1);

      var w = canvas.width = canvas.parentElement.clientWidth || 580;
      var h = canvas.height = 240;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = css('--surface-2');
      ctx.fillRect(0, 0, w, h);

      var leftCX = w * 0.28, rightCX = w * 0.72, cy = h * 0.5, R = 55;

      // Left: Original Circle
      ctx.strokeStyle = css('--rule-firm');
      ctx.lineWidth = 1;
      ctx.strokeRect(leftCX - R, cy - R, 2 * R, 2 * R);
      ctx.beginPath();
      ctx.arc(leftCX, cy, R, 0, 2 * Math.PI);
      ctx.strokeStyle = css('--ink-muted');
      ctx.stroke();

      // Basis vectors
      ctx.lineWidth = 2;
      ctx.strokeStyle = css('--accent');
      ctx.beginPath(); ctx.moveTo(leftCX, cy); ctx.lineTo(leftCX + R, cy); ctx.stroke();
      ctx.strokeStyle = css('--emerald');
      ctx.beginPath(); ctx.moveTo(leftCX, cy); ctx.lineTo(leftCX, cy - R); ctx.stroke();

      // Middle arrow
      ctx.fillStyle = css('--ink-muted');
      ctx.font = '15px ui-monospace, monospace';
      ctx.fillText('\u27F6  J\u1D65  \u27F6', w * 0.48 - 22, cy + 5);

      // Right: Transformed Ellipse
      var t1 = [a * R, -c * R];
      var t2 = [b * R, -d * R];

      // Skewed bounding box
      ctx.lineWidth = 1;
      ctx.strokeStyle = css('--rule-firm');
      ctx.beginPath();
      ctx.moveTo(rightCX - t1[0] - t2[0], cy + t1[1] + t2[1]);
      ctx.lineTo(rightCX + t1[0] - t2[0], cy - t1[1] + t2[1]);
      ctx.lineTo(rightCX + t1[0] + t2[0], cy - t1[1] - t2[1]);
      ctx.lineTo(rightCX - t1[0] + t2[0], cy + t1[1] - t2[1]);
      ctx.closePath();
      ctx.stroke();

      // Deformed Ellipse
      ctx.lineWidth = 2;
      ctx.strokeStyle = css('--accent');
      ctx.beginPath();
      for (var deg = 0; deg <= 360; deg += 3) {
        var rad = deg * Math.PI / 180;
        var ox = Math.cos(rad), oy = Math.sin(rad);
        var tx = rightCX + (a * ox + b * oy) * R;
        var ty = cy - (c * ox + d * oy) * R;
        if (deg === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
      }
      ctx.stroke();

      // Transformed vectors
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = css('--accent');
      ctx.beginPath(); ctx.moveTo(rightCX, cy); ctx.lineTo(rightCX + t1[0], cy + t1[1]); ctx.stroke();
      ctx.strokeStyle = css('--emerald');
      ctx.beginPath(); ctx.moveTo(rightCX, cy); ctx.lineTo(rightCX + t2[0], cy + t2[1]); ctx.stroke();

      var det = a * d - b * c;
      outEl.innerHTML =
        '<div class="metrics">' +
          '<div><span>Jacobian Matrix J</span><b>[' + a.toFixed(1) + ', ' + b.toFixed(1) + ' ; ' + c.toFixed(1) + ', ' + d.toFixed(1) + ']</b></div>' +
          '<div><span>Determinant det(J)</span><b>' + det.toFixed(2) + '</b></div>' +
          '<div><span>Local Area Scale</span><b>' + Math.abs(det).toFixed(2) + '&times;</b></div>' +
        '</div>' +
        '<p style="font-size:0.86rem;margin-top:0.4rem">' +
          '<b>Physical Intuition:</b> A Jacobian is a <i>local elastic stretch</i>. ' +
          'It maps an infinitesimal circle into an ellipse. The determinant det(J) measures how much local volume expands or contracts.' +
        '</p>';
    }

    [aEl, bEl, cEl, dEl].forEach(function (el) { el.addEventListener('input', draw); });
    window.addEventListener('resize', draw);
    registerThemeCallback(draw);
    draw();
  }());

  /* --- Chapter 3: single-neuron sandbox --------------------------------- */
  (function () {
    var out = $('#neuron-out');
    if (!out) return;
    var ids = ['nx1', 'nx2', 'nw1', 'nw2', 'nb'];
    var fields = ids.map(function (id) { return $('#' + id); });
    if (fields.some(function (f) { return !f; })) return;

    var render = function () {
      var v = fields.map(function (f) { return +f.value; });
      var x1 = v[0], x2 = v[1], w1 = v[2], w2 = v[3], b = v[4];
      var z = x1 * w1 + x2 * w2 + b;
      var a = Math.max(0, z);
      var d = z > 0 ? 1 : 0;
      out.innerHTML =
        '<div class="eq">\\[z=w_1x_1+w_2x_2+b=' + z.toFixed(3) +
        ',\\qquad a=\\operatorname{ReLU}(z)=' + a.toFixed(3) + '\\]</div>' +
        '<div class="eq">\\[\\frac{\\partial a}{\\partial \\mathbf w}=' +
        (d ? '\\mathbf x^{T}=\\begin{bmatrix}' + x1.toFixed(2) + '&' + x2.toFixed(2) + '\\end{bmatrix}'
           : '\\mathbf 0^{T}=\\begin{bmatrix}0&0\\end{bmatrix}') +
        ',\\qquad \\frac{\\partial a}{\\partial b}=' + d + '\\]</div>' +
        '<p>' + (d
          ? 'The unit is active. Each weight\u2019s sensitivity equals its own input, so \\(x_1\\) and \\(x_2\\) set how much each weight matters.'
          : 'The unit is dead for this input. ReLU zeroes the local derivative, so every weight gradient through this neuron is zero.') +
        '</p>';
      typeset(out);
    };
    fields.forEach(function (f) { f.addEventListener('input', render); });
    render();
  }());

  /* --- Chapter 3: Activation Function & Slope Explorer --- */
  (function () {
    var canvas = $('#act-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var zEl = $('#act-z-slider'), outEl = $('#act-details');
    var btns = $$('.act-btn');
    var currentAct = 'relu';

    var funcs = {
      relu: {
        name: 'ReLU',
        f: function (z) { return Math.max(0, z); },
        df: function (z) { return z > 0 ? 1 : 0; },
        note: 'Derivative is 1 for z > 0 and 0 for z < 0. No gradient saturation for positive inputs, but negative inputs cause dying neurons.'
      },
      sigmoid: {
        name: 'Sigmoid \u03C3(z)',
        f: function (z) { return 1 / (1 + Math.exp(-z)); },
        df: function (z) { var s = 1 / (1 + Math.exp(-z)); return s * (1 - s); },
        note: 'Compresses output into (0, 1). Maximum slope is only 0.25 at z=0. In deep networks, multiplying these 0.25 factors causes vanishing gradients!'
      },
      tanh: {
        name: 'Tanh',
        f: function (z) { return Math.tanh(z); },
        df: function (z) { var t = Math.tanh(z); return 1 - t * t; },
        note: 'Zero-centred in (-1, 1). Maximum slope is 1.0 at z=0, providing stronger gradient signals than sigmoid, but still flattens at extremes.'
      },
      leaky: {
        name: 'Leaky ReLU',
        f: function (z) { return z > 0 ? z : 0.1 * z; },
        df: function (z) { return z > 0 ? 1 : 0.1; },
        note: 'Small slope (0.1) for negative inputs guarantees that the gradient is never zero, preventing permanent dead neurons.'
      }
    };

    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (btn) { btn.classList.remove('active'); });
        b.classList.add('active');
        currentAct = b.dataset.act;
        draw();
      });
    });

    function draw() {
      var fn = funcs[currentAct];
      var z = zEl ? +zEl.value : 1.5;
      if ($('#act-z-val')) $('#act-z-val').textContent = z.toFixed(2);

      var w = canvas.width = canvas.parentElement.clientWidth || 580;
      var h = canvas.height = 240;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = css('--surface-2');
      ctx.fillRect(0, 0, w, h);

      var cx = w * 0.5, cy = h * 0.55;
      var scaleX = w / 10, scaleY = 48;

      // Axes
      ctx.strokeStyle = css('--rule-firm');
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

      // Activation curve phi(z)
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = css('--accent');
      ctx.beginPath();
      for (var px = 0; px <= w; px += 2) {
        var xVal = (px - cx) / scaleX;
        var yVal = fn.f(xVal);
        var py = cy - yVal * scaleY;
        if (px === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Derivative curve phi'(z) (dashed green)
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = css('--emerald');
      ctx.beginPath();
      for (var px = 0; px <= w; px += 2) {
        var xVal = (px - cx) / scaleX;
        var yVal = fn.df(xVal);
        var py = cy - yVal * scaleY;
        if (px === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Tangent line at z
      var curPZ = cx + z * scaleX;
      var curPA = cy - fn.f(z) * scaleY;
      var slope = fn.df(z);

      ctx.strokeStyle = css('--rose');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(curPZ - 42, curPA + 42 * slope * (scaleY / scaleX));
      ctx.lineTo(curPZ + 42, curPA - 42 * slope * (scaleY / scaleX));
      ctx.stroke();

      // Point dot
      ctx.fillStyle = css('--accent');
      ctx.beginPath(); ctx.arc(curPZ, curPA, 5, 0, 2 * Math.PI); ctx.fill();

      if (outEl) {
        outEl.innerHTML =
          '<div class="metrics">' +
            '<div><span>Pre-activation (z)</span><b>' + z.toFixed(2) + '</b></div>' +
            '<div><span>Activation &phi;(z)</span><b>' + fn.f(z).toFixed(3) + '</b></div>' +
            '<div><span>Local Slope &phi;\'(z)</span><b>' + slope.toFixed(3) + '</b></div>' +
          '</div>' +
          '<div class="note def" style="margin-top:0.6rem">' +
            '<span class="label">' + fn.name + ' Mathematical Insight</span>' +
            '<p>' + fn.note + '</p>' +
            '<p style="font-size:0.86rem;margin-bottom:0">' +
              '<span style="color:var(--accent);font-weight:600">&mdash; Solid Purple: &phi;(z)</span> &nbsp;|&nbsp; ' +
              '<span style="color:var(--emerald);font-weight:600">-- Dashed Green: Derivative &phi;\'(z)</span> &nbsp;|&nbsp; ' +
              '<span style="color:var(--rose);font-weight:600">&mdash; Pink Line: Tangent Slope</span>' +
            '</p>' +
          '</div>';
      }
    }

    if (zEl) zEl.addEventListener('input', draw);
    window.addEventListener('resize', draw);
    registerThemeCallback(draw);
    draw();
  }());

  /* --- Chapter 4: Single-Neuron Chain Rule & Sensitivity Microscope --- */
  (function () {
    var wrap = $('#ch4-chain-scope');
    if (!wrap) return;
    var w1El = $('#ch4-w1'), x1El = $('#ch4-x1'), bEl = $('#ch4-b'), yEl = $('#ch4-y');
    var perturbBtn = $('#ch4-perturb'), killBtn = $('#ch4-kill'), outEl = $('#ch4-out');
    if (!w1El || !outEl) return;

    function render(perturbDelta) {
      var w1 = +w1El.value, x1 = +x1El.value, b = +bEl.value, y = +yEl.value;
      if ($('#ch4-w1-val')) $('#ch4-w1-val').textContent = w1.toFixed(2);
      if ($('#ch4-x1-val')) $('#ch4-x1-val').textContent = x1.toFixed(2);
      if ($('#ch4-b-val')) $('#ch4-b-val').textContent = b.toFixed(2);
      if ($('#ch4-y-val')) $('#ch4-y-val').textContent = y.toFixed(2);

      var h = w1 * x1;
      var s = h;
      var z = s + b;
      var a = Math.max(0, z);
      var err = a - y;
      var C = 0.5 * err * err;

      var dC_da = err;
      var da_dz = z > 0 ? 1 : 0;
      var dz_ds = 1;
      var ds_dh = 1;
      var dh_dw1 = x1;

      var dC_dw1 = dC_da * da_dz * dz_ds * ds_dh * dh_dw1;
      var dC_db = dC_da * da_dz;

      var perturbHtml = '';
      if (perturbDelta) {
        var w1New = w1 + perturbDelta;
        var zNew = w1New * x1 + b;
        var aNew = Math.max(0, zNew);
        var CNew = 0.5 * (aNew - y) * (aNew - y);
        var actualDeltaC = CNew - C;
        var predictedDeltaC = dC_dw1 * perturbDelta;
        perturbHtml =
          '<div class="note beyond" style="margin-top:0.8rem">' +
            '<span class="label">Gradient Checking in Action</span>' +
            'Perturbed w\u2081 by &Delta;w\u2081 = +' + perturbDelta + ':<br>' +
            '<b>Calculus Prediction (&part;C/&part;w\u2081 &middot; &Delta;w\u2081):</b> ' + predictedDeltaC.toFixed(5) + '<br>' +
            '<b>True Finite Difference (C(w+&Delta;w) - C(w)):</b> ' + actualDeltaC.toFixed(5) + '<br>' +
            '<i>' + (Math.abs(predictedDeltaC - actualDeltaC) < 0.001 ? '&#10003; Perfect first-order Taylor agreement!' : 'Accurate local linear approximation.') + '</i>' +
          '</div>';
      }

      outEl.innerHTML =
        '<div class="metrics">' +
          '<div><span>Pre-activation (z)</span><b>' + z.toFixed(3) + '</b></div>' +
          '<div><span>Activation (a)</span><b>' + a.toFixed(3) + '</b></div>' +
          '<div><span>Cost (C)</span><b>' + C.toFixed(4) + '</b></div>' +
          '<div><span>Gradient &part;C/&part;w\u2081</span><b>' + dC_dw1.toFixed(4) + '</b></div>' +
        '</div>' +
        '<div class="readout">' +
          '<b>Chain Rule Multiplication Links:</b><br>' +
          '&part;C/&part;w\u2081 = (&part;C/&part;a) &middot; (&part;a/&part;z) &middot; (&part;z/&part;s) &middot; (&part;s/&part;h) &middot; (&part;h/&part;w\u2081)<br>' +
          '&part;C/&part;w\u2081 = (' + dC_da.toFixed(2) + ') &middot; (' + da_dz + ') &middot; (1) &middot; (1) &middot; (' + x1.toFixed(2) + ') = <b>' + dC_dw1.toFixed(4) + '</b><br>' +
          (da_dz === 0 ? '<span style="color:var(--rose)">&#9888; <b>Dying ReLU Gate:</b> z &le; 0 breaks the chain (&part;a/&part;z = 0), stopping all gradient flow to w\u2081!</span>' :
          '<span style="color:var(--emerald)">&#10003; <b>Gate Open:</b> Sensitivity to weight is directly proportional to incoming input x\u2081.</span>') +
        '</div>' + perturbHtml;
    }

    [w1El, x1El, bEl, yEl].forEach(function (el) { el.addEventListener('input', function () { render(); }); });
    if (perturbBtn) perturbBtn.addEventListener('click', function () { render(0.01); });
    if (killBtn) killBtn.addEventListener('click', function () {
      bEl.value = '-4.0';
      render();
    });
    render();
  }());

  /* --- Chapter 5: 1-D gradient descent ---------------------------------- */
  (function () {
    var plot = $('#gd-plot');
    if (!plot) return;
    var startEl = $('#gd-start'), lrEl = $('#gd-lr'), info = $('#gd-info');
    var w, trail;

    var cost = function (v) { return (v - 2) * (v - 2) + 0.5; };
    var grad = function (v) { return 2 * (v - 2); };

    var reset = function () { w = +startEl.value; trail = [w]; draw(); };

    function draw() {
      var W = 620, H = 240, lo = -3, hi = 9, cMax = 30;
      var px = function (v) { return 26 + (W - 46) * (v - lo) / (hi - lo); };
      var py = function (c) { return 16 + (H - 44) * (1 - Math.min(1, c / cMax)); };

      var curve = [];
      for (var i = 0; i <= 120; i++) {
        var v = lo + (hi - lo) * i / 120;
        curve.push(px(v).toFixed(1) + ',' + py(cost(v)).toFixed(1));
      }
      var marks = trail.slice(-40).map(function (v, i, arr) {
        var fresh = i === arr.length - 1;
        return '<circle cx="' + px(v).toFixed(1) + '" cy="' + py(cost(v)).toFixed(1) +
               '" r="' + (fresh ? 6 : 3) + '" fill="' + (fresh ? css('--accent') : css('--emerald')) +
               '" opacity="' + (fresh ? 1 : 0.35 + 0.6 * i / arr.length) + '"/>';
      }).join('');

      plot.innerHTML =
        '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" ' +
        'aria-label="Cost curve with the current gradient-descent iterate marked">' +
        '<polyline fill="none" stroke="' + css('--rule-firm') + '" stroke-width="2.5" points="' + curve.join(' ') + '"/>' +
        '<line x1="' + px(2).toFixed(1) + '" x2="' + px(2).toFixed(1) + '" y1="14" y2="' + (H - 26) +
        '" stroke="' + css('--rule') + '" stroke-dasharray="4 5"/>' +
        marks +
        '<text x="26" y="' + (H - 6) + '" font-size="12" fill="' + css('--ink-muted') + '">w = -3</text>' +
        '<text x="' + (W - 70) + '" y="' + (H - 6) + '" font-size="12" fill="' + css('--ink-muted') + '">w = 9</text>' +
        '<text x="' + (px(2) + 8).toFixed(1) + '" y="26" font-size="12" fill="' + css('--ink-muted') + '">minimum</text>' +
        '</svg>';

      var diverging = !isFinite(w) || Math.abs(w) > 1e4;
      info.innerHTML =
        '<b>steps</b> ' + (trail.length - 1) + '<br>' +
        '<b>w</b> ' + (isFinite(w) ? w.toFixed(4) : '\u221e') + '<br>' +
        '<b>C(w)</b> ' + (isFinite(w) ? cost(w).toFixed(4) : '\u221e') + '<br>' +
        '<b>dC/dw</b> ' + (isFinite(w) ? grad(w).toFixed(4) : '\u221e') +
        (diverging ? '<br><br>Diverging. The step \u03B7\u00B7dC/dw overshoots the minimum by more than it started away from it. Try \u03B7 &lt; 1.' : '');
    }

    $('#gd-step').addEventListener('click', function () {
      w = w - (+lrEl.value) * grad(w);
      trail.push(w);
      draw();
    });
    $('#gd-run').addEventListener('click', function () {
      for (var i = 0; i < 20; i++) { w = w - (+lrEl.value) * grad(w); trail.push(w); }
      draw();
    });
    $('#gd-reset').addEventListener('click', reset);
    startEl.addEventListener('change', reset);
    window.addEventListener('resize', draw);
    registerThemeCallback(draw);
    reset();
  }());

  /* --- Chapter 5: 2D Loss Surface & Physics Optimization Arena --- */
  (function () {
    var canvas = $('#loss-arena-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var lrEl = $('#arena-lr'), momEl = $('#arena-mom'), noiseEl = $('#arena-noise');
    var stepBtn = $('#arena-step'), playBtn = $('#arena-play'), resetBtn = $('#arena-reset');
    var infoEl = $('#arena-info');
    var presets = $$('.arena-preset');

    var pos = [2.2, 1.8];
    var vel = [0, 0];
    var trail = [[pos[0], pos[1]]];
    var isPlaying = false;
    var animFrame = null;

    function cost(x, y) { return 0.5 * (x * x + 8 * y * y); }
    function grad(x, y) { return [x, 8 * y]; }

    function toScreen(x, y, w, h) {
      return [(x + 3) / 6 * w, (3 - y) / 6 * h];
    }
    function toWorld(px, py, w, h) {
      return [(px / w) * 6 - 3, 3 - (py / h) * 6];
    }

    function stepPhysics() {
      var lr = lrEl ? +lrEl.value : 0.08, beta = momEl ? +momEl.value : 0.7, noise = noiseEl ? +noiseEl.value : 0;
      var g = grad(pos[0], pos[1]);
      if (noise > 0) {
        g[0] += (Math.random() * 2 - 1) * noise * 2;
        g[1] += (Math.random() * 2 - 1) * noise * 2;
      }

      vel[0] = beta * vel[0] - lr * g[0];
      vel[1] = beta * vel[1] - lr * g[1];

      pos[0] += vel[0];
      pos[1] += vel[1];
      trail.push([pos[0], pos[1]]);
      if (trail.length > 250) trail.shift();
    }

    function draw() {
      var w = canvas.width = canvas.parentElement.clientWidth || 580;
      var h = canvas.height = 300;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = css('--surface-2');
      ctx.fillRect(0, 0, w, h);

      // Draw elliptical contour lines
      var levels = [0.2, 0.8, 1.8, 3.5, 6.0, 10.0, 16.0];
      ctx.lineWidth = 1;
      for (var i = 0; i < levels.length; i++) {
        var lev = levels[i];
        ctx.strokeStyle = css('--rule-firm');
        ctx.beginPath();
        for (var a = 0; a <= 360; a += 5) {
          var rad = a * Math.PI / 180;
          var rx = Math.cos(rad) * Math.sqrt(2 * lev);
          var ry = Math.sin(rad) * Math.sqrt(2 * lev / 8);
          var p = toScreen(rx, ry, w, h);
          if (a === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
      }

      // Draw trail
      if (trail.length > 1) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = css('--accent');
        ctx.beginPath();
        var start = toScreen(trail[0][0], trail[0][1], w, h);
        ctx.moveTo(start[0], start[1]);
        for (var t = 1; t < trail.length; t++) {
          var pt = toScreen(trail[t][0], trail[t][1], w, h);
          ctx.lineTo(pt[0], pt[1]);
        }
        ctx.stroke();
      }

      // Draw marble
      var curP = toScreen(pos[0], pos[1], w, h);
      ctx.fillStyle = css('--rose');
      ctx.beginPath();
      ctx.arc(curP[0], curP[1], 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Minimum target marker at (0, 0)
      var centerP = toScreen(0, 0, w, h);
      ctx.strokeStyle = css('--emerald');
      ctx.lineWidth = 2;
      ctx.strokeRect(centerP[0] - 4, centerP[1] - 4, 8, 8);

      var cVal = cost(pos[0], pos[1]);
      var diverging = !isFinite(pos[0]) || Math.abs(pos[0]) > 20;
      if (infoEl) {
        infoEl.innerHTML =
          '<div class="metrics">' +
            '<div><span>Position (w\u2081, w\u2082)</span><b>(' + (isFinite(pos[0]) ? pos[0].toFixed(2) : '\u221E') + ', ' + (isFinite(pos[1]) ? pos[1].toFixed(2) : '\u221E') + ')</b></div>' +
            '<div><span>Loss C</span><b>' + (isFinite(cVal) ? cVal.toFixed(4) : '\u221E') + '</b></div>' +
            '<div><span>Velocity ||v||</span><b>' + Math.hypot(vel[0], vel[1]).toFixed(3) + '</b></div>' +
            '<div><span>Steps Taken</span><b>' + (trail.length - 1) + '</b></div>' +
          '</div>' +
          (diverging ? '<p style="color:var(--rose);font-weight:600">&#9888; Diverged! Learning rate is too high. Reset to restart.</p>' :
          '<p style="font-size:0.86rem;margin-top:0.4rem">Click anywhere on the map to drop the marble. Notice how momentum glides cleanly through the elongated valley!</p>');
      }
    }

    function loop() {
      if (isPlaying) {
        stepPhysics();
        draw();
        animFrame = requestAnimationFrame(loop);
      }
    }

    if (stepBtn) stepBtn.addEventListener('click', function () {
      stepPhysics(); draw();
    });
    if (playBtn) playBtn.addEventListener('click', function () {
      isPlaying = !isPlaying;
      playBtn.textContent = isPlaying ? 'Pause' : 'Simulate Roll';
      if (isPlaying) loop();
    });
    if (resetBtn) resetBtn.addEventListener('click', function () {
      isPlaying = false;
      if (playBtn) playBtn.textContent = 'Simulate Roll';
      pos = [2.2, 1.8]; vel = [0, 0]; trail = [[pos[0], pos[1]]];
      draw();
    });

    presets.forEach(function (b) {
      b.addEventListener('click', function () {
        var type = b.dataset.preset;
        if (type === 'optimal') { lrEl.value = '0.08'; momEl.value = '0.7'; noiseEl.value = '0'; }
        else if (type === 'small') { lrEl.value = '0.01'; momEl.value = '0.0'; noiseEl.value = '0'; }
        else if (type === 'oscillate') { lrEl.value = '0.24'; momEl.value = '0.0'; noiseEl.value = '0'; }
        else if (type === 'diverge') { lrEl.value = '0.35'; momEl.value = '0.5'; noiseEl.value = '0'; }
        pos = [2.2, 1.8]; vel = [0, 0]; trail = [[pos[0], pos[1]]];
        draw();
      });
    });

    canvas.addEventListener('pointerdown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var px = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      var py = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
      var world = toWorld(px, py, canvas.width, canvas.height);
      pos = [world[0], world[1]];
      vel = [0, 0];
      trail = [[pos[0], pos[1]]];
      draw();
    });

    window.addEventListener('resize', draw);
    registerThemeCallback(draw);
    draw();
  }());

  /* ========================================================================
     CHAPTER 6: Step-by-Step Backprop Simulator & XOR Laboratory
     ======================================================================== */
  /* --- Chapter 6: Step-by-Step Backprop Walkthrough Simulator --- */
  (function () {
    var wrap = $('#bp-stepper');
    if (!wrap) return;
    var stepBtn = $('#bp-next-step'), resetBtn = $('#bp-reset-step');
    var pillEl = $('#bp-step-pill'), descEl = $('#bp-step-desc'), svgHost = $('#bp-step-svg');
    if (!stepBtn || !svgHost) return;
    var curStep = 0;

    var steps = [
      {
        name: 'Step 0: Initial State',
        desc: 'We have a 2-2-1 network with input x = [1, 0]\u1D40 and target y = 1. Weights and biases are initialized.',
        activeNodes: [], activeEdges: []
      },
      {
        name: 'Step 1: Forward Pass (Evaluate z and a)',
        desc: 'Compute z&sup1; = W&sup1;x + b&sup1;, then a&sup1; = &phi;(z&sup1;). Next compute z&sup2; = W&sup2;a&sup1; + b&sup2;, and a&sup2; = &phi;(z&sup2;). Loss is computed as C = &frac12;(a&sup2; - y)&sup2;.',
        activeNodes: ['x1', 'x2', 'a1_1', 'a1_2', 'yhat'], activeEdges: ['w1', 'w2']
      },
      {
        name: 'Step 2: Output Error &delta;&sup2; (BP1)',
        desc: 'Compute output error &delta;&sup2; = &part;C/&part;z&sup2; = (a&sup2; - y) &odot; &phi;\'(z&sup2;). This is the seed of backpropagation: how much the pre-activation at the output is to blame for the total cost.',
        activeNodes: ['yhat'], activeEdges: []
      },
      {
        name: 'Step 3: Propagate Error to Hidden Layer &delta;&sup1; (BP2)',
        desc: 'Pull error backward through transposed weights: &delta;&sup1; = ((W&sup2;)ᵀ &delta;&sup2;) &odot; &phi;\'(z&sup1;). Each hidden neuron receives blame in proportion to its connection strength to the output!',
        activeNodes: ['a1_1', 'a1_2'], activeEdges: ['w2']
      },
      {
        name: 'Step 4: Compute Parameter Gradients (BP4 & BP3)',
        desc: 'Form outer products: &nabla;_{W&sup2;} C = &delta;&sup2; (a&sup1;)ᵀ and &nabla;_{W&sup1;} C = &delta;&sup1; xᵀ. Biases get &nabla;_b C = &delta;. We now have exact partial derivatives for all parameters at once!',
        activeNodes: [], activeEdges: ['w1', 'w2']
      },
      {
        name: 'Step 5: Gradient Descent Parameter Update',
        desc: 'Nudge every parameter against its gradient: W &larr; W - &eta;&nabla;_W C, b &larr; b - &eta;&nabla;_b C. The network takes a step toward minimizing error. Repeat for next batch!',
        activeNodes: ['x1', 'x2', 'a1_1', 'a1_2', 'yhat'], activeEdges: ['w1', 'w2']
      }
    ];

    function render() {
      var s = steps[curStep];
      if (pillEl) pillEl.textContent = s.name;
      if (descEl) descEl.innerHTML = s.desc;

      var W = 540, H = 180;
      var xN = [[60, 50], [60, 130]];
      var hN = [[270, 50], [270, 130]];
      var oN = [[480, 90]];

      var edgeColor1 = s.activeEdges.indexOf('w1') >= 0 ? css('--accent') : css('--rule-firm');
      var edgeColor2 = s.activeEdges.indexOf('w2') >= 0 ? css('--accent') : css('--rule-firm');
      var edgeWidth1 = s.activeEdges.indexOf('w1') >= 0 ? '2.5' : '1.2';
      var edgeWidth2 = s.activeEdges.indexOf('w2') >= 0 ? '2.5' : '1.2';

      var edgeSvg = '';
      for (var j = 0; j < 2; j++) {
        for (var k = 0; k < 2; k++) {
          edgeSvg += '<line x1="' + xN[k][0] + '" y1="' + xN[k][1] + '" x2="' + hN[j][0] + '" y2="' + hN[j][1] +
            '" stroke="' + edgeColor1 + '" stroke-width="' + edgeWidth1 + '"/>';
        }
        edgeSvg += '<line x1="' + hN[j][0] + '" y1="' + hN[j][1] + '" x2="' + oN[0][0] + '" y2="' + oN[0][1] +
          '" stroke="' + edgeColor2 + '" stroke-width="' + edgeWidth2 + '"/>';
      }

      var node = function (p, label, active) {
        return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="18" fill="' +
          (active ? css('--accent-soft') : css('--surface')) + '" stroke="' +
          (active ? css('--accent') : css('--rule-firm')) + '" stroke-width="' + (active ? '2.5' : '1.5') + '"/>' +
          '<text x="' + p[0] + '" y="' + (p[1] + 4) + '" text-anchor="middle" font-size="11" fill="' +
          (active ? css('--accent-ink') : css('--ink')) + '" font-family="ui-monospace, monospace">' + label + '</text>';
      };

      svgHost.innerHTML =
        '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img">' +
        edgeSvg +
        node(xN[0], 'x\u2081', s.activeNodes.indexOf('x1') >= 0) +
        node(xN[1], 'x\u2082', s.activeNodes.indexOf('x2') >= 0) +
        node(hN[0], 'a\u00B9\u2081', s.activeNodes.indexOf('a1_1') >= 0) +
        node(hN[1], 'a\u00B9\u2082', s.activeNodes.indexOf('a1_2') >= 0) +
        node(oN[0], '\u0177', s.activeNodes.indexOf('yhat') >= 0) +
        '</svg>';
    }

    stepBtn.addEventListener('click', function () {
      curStep = (curStep + 1) % steps.length;
      render();
    });
    if (resetBtn) resetBtn.addEventListener('click', function () {
      curStep = 0;
      render();
    });

    registerThemeCallback(render);
    render();
  }());

  /* --- Chapter 6: XOR backpropagation laboratory (Enhanced) --- */
  (function () {
    var diagram = $('#lab-network');
    if (!diagram) return;

    var X = [[0, 0], [0, 1], [1, 0], [1, 1]];
    var Y = [0, 1, 1, 0];
    var net, iteration, history;

    var sigmoid = function (z) { return 1 / (1 + Math.exp(-z)); };
    var rand = function () { return (Math.random() * 2 - 1) * 0.9; };

    function init() {
      net = {
        W1: [[rand(), rand()], [rand(), rand()]],
        b1: [rand(), rand()],
        W2: [rand(), rand()],
        b2: rand()
      };
      iteration = 0;
      history = [];
      render();
    }

    function forward(x) {
      var z1 = [
        net.W1[0][0] * x[0] + net.W1[0][1] * x[1] + net.b1[0],
        net.W1[1][0] * x[0] + net.W1[1][1] * x[1] + net.b1[1]
      ];
      var a1 = [sigmoid(z1[0]), sigmoid(z1[1])];
      var z2 = net.W2[0] * a1[0] + net.W2[1] * a1[1] + net.b2;
      return { z1: z1, a1: a1, z2: z2, a2: sigmoid(z2) };
    }

    function step() {
      var lr = +$('#lab-lr').value;
      var gW1 = [[0, 0], [0, 0]], gb1 = [0, 0], gW2 = [0, 0], gb2 = 0, total = 0;

      for (var n = 0; n < X.length; n++) {
        var x = X[n], f = forward(x);
        var err = f.a2 - Y[n];
        total += 0.5 * err * err;

        var d2 = err * f.a2 * (1 - f.a2);                                  // BP1
        var d1 = [
          net.W2[0] * d2 * f.a1[0] * (1 - f.a1[0]),                        // BP2
          net.W2[1] * d2 * f.a1[1] * (1 - f.a1[1])
        ];

        gW2[0] += d2 * f.a1[0]; gW2[1] += d2 * f.a1[1]; gb2 += d2;         // BP4, BP3
        gW1[0][0] += d1[0] * x[0]; gW1[0][1] += d1[0] * x[1]; gb1[0] += d1[0];
        gW1[1][0] += d1[1] * x[0]; gW1[1][1] += d1[1] * x[1]; gb1[1] += d1[1];
      }

      var m = X.length;
      net.W2[0] -= lr * gW2[0] / m; net.W2[1] -= lr * gW2[1] / m; net.b2 -= lr * gb2 / m;
      net.W1[0][0] -= lr * gW1[0][0] / m; net.W1[0][1] -= lr * gW1[0][1] / m; net.b1[0] -= lr * gb1[0] / m;
      net.W1[1][0] -= lr * gW1[1][0] / m; net.W1[1][1] -= lr * gW1[1][1] / m; net.b1[1] -= lr * gb1[1] / m;

      iteration++;
      history.push(total / m);
    }

    function train(n) { for (var i = 0; i < n; i++) step(); render(); }

    function drawNetwork() {
      var pos = {
        in: [[62, 58], [62, 142]],
        hid: [[215, 58], [215, 142]],
        out: [[368, 100]]
      };
      var edges = '';
      var edge = function (from, to, w) {
        var stroke = w >= 0 ? css('--accent') : css('--rose');
        var width = Math.min(7, 0.7 + Math.abs(w) * 1.1);
        return '<line x1="' + from[0] + '" y1="' + from[1] + '" x2="' + to[0] + '" y2="' + to[1] +
               '" stroke="' + stroke + '" stroke-width="' + width.toFixed(2) + '" opacity=".75"/>';
      };
      for (var j = 0; j < 2; j++) {
        for (var k = 0; k < 2; k++) edges += edge(pos.in[k], pos.hid[j], net.W1[j][k]);
        edges += edge(pos.hid[j], pos.out[0], net.W2[j]);
      }
      var node = function (p, label) {
        return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="20" fill="' + css('--surface') +
               '" stroke="' + css('--rule-firm') + '" stroke-width="1.5"/>' +
               '<text x="' + p[0] + '" y="' + (p[1] + 4) + '" text-anchor="middle" font-size="13" fill="' +
               css('--ink') + '" font-family="ui-monospace, monospace">' + label + '</text>';
      };
      diagram.innerHTML =
        '<svg viewBox="0 0 430 200" width="100%" role="img" ' +
        'aria-label="Two-two-one network; edge colour shows weight sign and thickness shows magnitude">' +
        edges +
        node(pos.in[0], 'x\u2081') + node(pos.in[1], 'x\u2082') +
        node(pos.hid[0], 'a\u00B9\u2081') + node(pos.hid[1], 'a\u00B9\u2082') +
        node(pos.out[0], '\u0177') +
        '</svg>';
    }

    function drawLoss() {
      var c = $('#lab-loss');
      if (!c) return;
      var ctx = c.getContext('2d'), w = c.width, h = c.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = css('--surface-2'); ctx.fillRect(0, 0, w, h);
      ctx.font = '13px ui-monospace, monospace';
      if (!history.length) {
        ctx.fillStyle = css('--ink-muted');
        ctx.fillText('Train the network to plot the loss.', 18, 30);
        return;
      }
      var max = Math.max.apply(null, history.concat([0.3])), min = 0;
      ctx.beginPath();
      history.forEach(function (v, i) {
        var x = 18 + (w - 36) * (i / Math.max(1, history.length - 1));
        var y = h - 22 - (h - 44) * (v - min) / (max - min || 1);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = css('--accent'); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = css('--ink-muted');
      ctx.fillText('loss ' + history[history.length - 1].toFixed(5), 18, 22);
      ctx.fillText('step ' + iteration, w - 90, h - 8);
    }

    function drawBoundary() {
      var c = $('#lab-boundary');
      if (!c) return;
      var ctx = c.getContext('2d'), w = c.width, h = c.height;
      var res = 30;
      var cellW = w / res, cellH = h / res;

      for (var py = 0; py < res; py++) {
        var yVal = 1 - py / res;
        for (var px = 0; px < res; px++) {
          var xVal = px / res;
          var pred = forward([xVal, yVal]).a2;
          var t = Math.max(0, Math.min(1, pred));
          ctx.fillStyle = 'rgba(' + Math.round(67 * (1 - t) + 165 * t) + ',' +
                                    Math.round(56 * (1 - t) + 160 * t) + ',' +
                                    Math.round(202 * (1 - t) + 255 * t) + ', 0.85)';
          ctx.fillRect(px * cellW, py * cellH, cellW + 0.5, cellH + 0.5);
        }
      }

      X.forEach(function (pt, i) {
        var sx = pt[0] * (w - 24) + 12;
        var sy = (1 - pt[1]) * (h - 24) + 12;
        ctx.fillStyle = Y[i] === 1 ? '#ffffff' : '#111111';
        ctx.strokeStyle = css('--ink');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      });
    }

    function render() {
      var preds = X.map(function (x) { return forward(x).a2; });
      var loss = preds.reduce(function (s, p, i) { return s + 0.5 * (p - Y[i]) * (p - Y[i]); }, 0) / X.length;
      $('#lab-iter').textContent = iteration;
      $('#lab-loss-val').textContent = loss.toFixed(5);
      $('#lab-data').innerHTML = X.map(function (x, i) {
        return '<span class="point">(' + x.join(', ') + ') \u2192 ' + preds[i].toFixed(3) +
               '<span style="color:var(--ink-muted)"> / ' + Y[i] + '</span></span>';
      }).join('');
      drawNetwork();
      drawLoss();
      drawBoundary();
    }

    $('#lab-10').addEventListener('click', function () { train(10); });
    $('#lab-100').addEventListener('click', function () { train(100); });
    $('#lab-2000').addEventListener('click', function () { train(2000); });
    $('#lab-reset').addEventListener('click', init);
    registerThemeCallback(render);
    init();
  }());

  /* ========================================================================
     CHAPTER 7: Interactive Tensor Shape & Matrix Calculator
     ======================================================================== */
  (function () {
    var wrap = $('#shape-calc');
    if (!wrap) return;
    var inEl = $('#sc-in'), h1El = $('#sc-h1'), h2El = $('#sc-h2'), outEl = $('#sc-out');
    var resEl = $('#sc-res');
    if (!inEl || !resEl) return;

    function render() {
      var n0 = +inEl.value, n1 = +h1El.value, n2 = +h2El.value, n3 = +outEl.value;
      if ($('#sc-in-val')) $('#sc-in-val').textContent = n0;
      if ($('#sc-h1-val')) $('#sc-h1-val').textContent = n1;
      if ($('#sc-h2-val')) $('#sc-h2-val').textContent = n2;
      if ($('#sc-out-val')) $('#sc-out-val').textContent = n3;

      var p1 = n1 * n0 + n1;
      var p2 = n2 * n1 + n2;
      var p3 = n3 * n2 + n3;
      var total = p1 + p2 + p3;

      resEl.innerHTML =
        '<div class="metrics">' +
          '<div><span>Weight W&sup1;</span><b>' + n1 + ' &times; ' + n0 + '</b></div>' +
          '<div><span>Bias b&sup1;</span><b>' + n1 + ' &times; 1</b></div>' +
          '<div><span>Weight W&sup2;</span><b>' + n2 + ' &times; ' + n1 + '</b></div>' +
          '<div><span>Bias b&sup2;</span><b>' + n2 + ' &times; 1</b></div>' +
          '<div><span>Weight W&sup3;</span><b>' + n3 + ' &times; ' + n2 + '</b></div>' +
          '<div><span>Total Parameters</span><b>' + total + '</b></div>' +
        '</div>' +
        '<div class="table-wrap" style="margin-top:0.8rem">' +
        '<table>' +
          '<thead><tr><th>Equation Step</th><th>Dimension Formula</th><th>Computed Dimensions</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>Layer 1 Forward: z&sup1; = W&sup1;x + b&sup1;</td><td>(n\u2081 &times; n\u2080)(n\u2080 &times; 1) + (n\u2081 &times; 1)</td><td><code>(' + n1 + '&times;' + n0 + ')(' + n0 + '&times;1) + (' + n1 + '&times;1) = (' + n1 + '&times;1)</code></td></tr>' +
            '<tr><td>Layer 2 Forward: z&sup2; = W&sup2;a&sup1; + b&sup2;</td><td>(n\u2082 &times; n\u2081)(n\u2081 &times; 1) + (n\u2082 &times; 1)</td><td><code>(' + n2 + '&times;' + n1 + ')(' + n1 + '&times;1) + (' + n2 + '&times;1) = (' + n2 + '&times;1)</code></td></tr>' +
            '<tr><td>Layer 3 Forward: z&sup3; = W&sup3;a&sup2; + b&sup3;</td><td>(n\u2083 &times; n\u2082)(n\u2082 &times; 1) + (n\u2083 &times; 1)</td><td><code>(' + n3 + '&times;' + n2 + ')(' + n2 + '&times;1) + (' + n3 + '&times;1) = (' + n3 + '&times;1)</code></td></tr>' +
            '<tr><td>BP2 Pullback: (W&sup3;)ᵀ&delta;&sup3;</td><td>(n\u2082 &times; n\u2083)(n\u2083 &times; 1)</td><td><code>(' + n2 + '&times;' + n3 + ')(' + n3 + '&times;1) = (' + n2 + '&times;1)</code> (matches &delta;&sup2;)</td></tr>' +
            '<tr><td>BP4 Weight Grad: &delta;&sup3;(a&sup2;)ᵀ</td><td>(n\u2083 &times; 1)(1 &times; n\u2082)</td><td><code>(' + n3 + '&times;1)(1&times;' + n2 + ') = (' + n3 + '&times;' + n2 + ')</code> (matches W&sup3;)</td></tr>' +
          '</tbody>' +
        '</table>' +
        '</div>';
    }

    [inEl, h1El, h2El, outEl].forEach(function (el) { el.addEventListener('input', render); });
    render();
  }());

  /* ========================================================================
     PHYSICAL SIMULATOR 1 (Chapter 1): Audio Mixing Console
     ======================================================================== */
  (function () {
    var wrap = $('#audio-mixer-widget');
    if (!wrap) return;
    var x1 = $('#mix-x1'), x2 = $('#mix-x2'), x3 = $('#mix-x3');
    var w1 = $('#mix-w1'), w2 = $('#mix-w2'), w3 = $('#mix-w3');
    var bEl = $('#mix-b'), limEl = $('#mix-limiter');
    var vuEl = $('#mix-vu'), outEl = $('#mix-readout');
    if (!x1 || !outEl) return;

    function render() {
      var vx1 = +x1.value, vx2 = +x2.value, vx3 = +x3.value;
      var vw1 = +w1.value, vw2 = +w2.value, vw3 = +w3.value;
      var vb = +bEl.value, mode = limEl ? limEl.value : 'relu';

      if ($('#mix-x1-val')) $('#mix-x1-val').textContent = vx1.toFixed(1);
      if ($('#mix-x2-val')) $('#mix-x2-val').textContent = vx2.toFixed(1);
      if ($('#mix-x3-val')) $('#mix-x3-val').textContent = vx3.toFixed(1);
      if ($('#mix-w1-val')) $('#mix-w1-val').textContent = vw1.toFixed(2);
      if ($('#mix-w2-val')) $('#mix-w2-val').textContent = vw2.toFixed(2);
      if ($('#mix-w3-val')) $('#mix-w3-val').textContent = vw3.toFixed(2);
      if ($('#mix-b-val')) $('#mix-b-val').textContent = vb.toFixed(2);

      var sum = vx1 * vw1 + vx2 * vw2 + vx3 * vw3 + vb;
      var out = mode === 'relu' ? Math.max(0, sum) : (mode === 'sigmoid' ? 1 / (1 + Math.exp(-sum)) : sum);

      // Render 16 LED segments in VU meter
      if (vuEl) {
        var numLeds = 16;
        var fraction = Math.min(1, Math.max(0, out / 5));
        var litCount = Math.round(fraction * numLeds);
        var ledsHtml = '';
        for (var i = 0; i < numLeds; i++) {
          var cls = 'vu-segment';
          if (i < litCount) {
            cls += (i >= 13 ? ' lit-red' : (i >= 9 ? ' lit-yellow' : ' lit-green'));
          }
          ledsHtml += '<div class="' + cls + '"></div>';
        }
        vuEl.innerHTML = ledsHtml;
      }

      outEl.innerHTML =
        '<div class="metrics">' +
          '<div><span>Acoustic Inputs</span><b>[' + vx1.toFixed(1) + ', ' + vx2.toFixed(1) + ', ' + vx3.toFixed(1) + ']</b></div>' +
          '<div><span>Mixer Sum (z)</span><b>' + sum.toFixed(3) + ' V</b></div>' +
          '<div><span>Limiter Output (a)</span><b>' + out.toFixed(3) + ' V</b></div>' +
        '</div>' +
        '<p style="font-size:.88rem;margin:.4rem 0 0;color:var(--ink-soft)">' +
          (mode === 'relu' && sum <= 0 ? '<span style="color:var(--rose)">&#9888; <b>Noise Gate Closed:</b> Weighted sum z &le; 0 V. The gate clamps the output to zero sound.</span>' :
          '<span style="color:var(--emerald)">&#10003; <b>Audio Signal Active:</b> Summing bus output is ' + out.toFixed(3) + ' V. The weights control individual instrument loudness, bias sets ground noise floor!</span>') +
        '</p>';
    }

    [x1, x2, x3, w1, w2, w3, bEl, limEl].forEach(function (el) {
      if (el) el.addEventListener('input', render);
    });
    render();
  }());

  /* ========================================================================
     PHYSICAL SIMULATOR 2 (Chapter 2): Interlocking Mechanical Gear Train
     ======================================================================== */
  (function () {
    var canvas = $('#gears-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var n1El = $('#gear-n1'), n2El = $('#gear-n2'), n3El = $('#gear-n3');
    var angleEl = $('#gear-angle'), playBtn = $('#gear-play-btn'), outEl = $('#gear-readout');
    var isSpinning = false, animFrame = null, angle = 0;

    function drawGear(cx, cy, r, teeth, rot, color) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Pitch body
      ctx.fillStyle = color;
      ctx.strokeStyle = css('--ink');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var i = 0; i < teeth; i++) {
        var a = (i / teeth) * 2 * Math.PI;
        var da = Math.PI / teeth;
        var rOuter = r + 7;
        var rInner = r - 5;
        if (i === 0) ctx.moveTo(rInner * Math.cos(a), rInner * Math.sin(a));
        ctx.lineTo(rOuter * Math.cos(a + da * 0.25), rOuter * Math.sin(a + da * 0.25));
        ctx.lineTo(rOuter * Math.cos(a + da * 0.75), rOuter * Math.sin(a + da * 0.75));
        ctx.lineTo(rInner * Math.cos(a + da), rInner * Math.sin(a + da));
        ctx.lineTo(rInner * Math.cos(a + da * 1.5), rInner * Math.sin(a + da * 1.5));
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Axle center
      ctx.fillStyle = css('--surface');
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r - 8, 0); ctx.strokeStyle = css('--ink'); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }

    function render() {
      var w = canvas.width = canvas.parentElement.clientWidth || 580;
      var h = canvas.height = 200;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = css('--surface-2');
      ctx.fillRect(0, 0, w, h);

      var n1 = n1El ? +n1El.value : 12;
      var n2 = n2El ? +n2El.value : 24;
      var n3 = n3El ? +n3El.value : 16;

      if ($('#gear-n1-val')) $('#gear-n1-val').textContent = n1;
      if ($('#gear-n2-val')) $('#gear-n2-val').textContent = n2;
      if ($('#gear-n3-val')) $('#gear-n3-val').textContent = n3;

      var scale = 2.4;
      var r1 = n1 * scale, r2 = n2 * scale, r3 = n3 * scale;
      var totalSpan = (r1 + r2) + (r2 + r3);
      var cx1 = 70 + r1;
      var cy1 = h * 0.5;
      var cx2 = cx1 + (r1 + r2) + 2;
      var cy2 = cy1;
      var cx3 = cx2 + (r2 + r3) + 2;
      var cy3 = cy1;

      var a1 = angle;
      var a2 = -a1 * (n1 / n2);
      var a3 = -a2 * (n2 / n3); // = +a1 * (n1 / n3)

      drawGear(cx1, cy1, r1, n1, a1, css('--accent-soft'));
      drawGear(cx2, cy2, r2, n2, a2, css('--amber-soft'));
      drawGear(cx3, cy3, r3, n3, a3, css('--emerald-soft'));

      // Labels
      ctx.fillStyle = css('--ink');
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('Gear X (n=' + n1 + ')', cx1 - 32, cy1 - r1 - 12);
      ctx.fillText('Gear Y (n=' + n2 + ')', cx2 - 32, cy2 - r2 - 12);
      ctx.fillText('Gear Z (n=' + n3 + ')', cx3 - 32, cy3 - r3 - 12);

      var ratioXY = -(n1 / n2);
      var ratioYZ = -(n2 / n3);
      var totalRatio = ratioXY * ratioYZ;

      if (outEl) {
        outEl.innerHTML =
          '<div class="metrics">' +
            '<div><span>Link 1 Ratio &part;y/&part;x</span><b>' + ratioXY.toFixed(3) + ' (&minus;' + n1 + '/' + n2 + ')</b></div>' +
            '<div><span>Link 2 Ratio &part;z/&part;y</span><b>' + ratioYZ.toFixed(3) + ' (&minus;' + n2 + '/' + n3 + ')</b></div>' +
            '<div><span>Chain Product &part;z/&part;x</span><b style="color:var(--emerald)">' + totalRatio.toFixed(3) + ' (+' + n1 + '/' + n3 + ')</b></div>' +
          '</div>' +
          '<div class="note def" style="margin-top:0.6rem">' +
            '<span class="label">The Mechanical Proof of the Chain Rule</span>' +
            'Notice that <b>n&#8322; (' + n2 + ') appears in both the denominator of Link 1 and the numerator of Link 2, completely cancelling out</b>:<br>' +
            '<code>&part;z/&part;x = (&part;z/&part;y) &middot; (&part;y/&part;x) = (&minus;' + n2 + '/' + n3 + ') &times; (&minus;' + n1 + '/' + n2 + ') = +' + n1 + '/' + n3 + ' = ' + totalRatio.toFixed(3) + '</code>.<br>' +
            'The middle gear transmits force, but its size has zero effect on the final ratio!' +
          '</div>';
      }
    }

    function loop() {
      if (isSpinning) {
        angle += 0.03;
        if (angleEl) angleEl.value = (angle % (2 * Math.PI)).toFixed(2);
        render();
        animFrame = requestAnimationFrame(loop);
      }
    }

    if (playBtn) playBtn.addEventListener('click', function () {
      isSpinning = !isSpinning;
      playBtn.textContent = isSpinning ? 'Pause Rotation' : 'Spin Gears';
      if (isSpinning) loop();
    });

    if (angleEl) angleEl.addEventListener('input', function () {
      angle = +angleEl.value;
      render();
    });

    [n1El, n2El, n3El].forEach(function (el) {
      if (el) el.addEventListener('input', render);
    });

    window.addEventListener('resize', render);
    registerThemeCallback(render);
    render();
  }());

  /* ========================================================================
     PHYSICAL SIMULATOR 3 (Chapter 3): Hydraulic Water Pipe & Valve Simulator
     ======================================================================== */
  (function () {
    var canvas = $('#hydraulic-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var x1El = $('#hyd-x1'), x2El = $('#hyd-x2');
    var w1El = $('#hyd-w1'), w2El = $('#hyd-w2');
    var bEl = $('#hyd-b'), valveEl = $('#hyd-valve-type'), outEl = $('#hyd-readout');

    function render() {
      var w = canvas.width = canvas.parentElement.clientWidth || 580;
      var h = canvas.height = 220;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = css('--surface-2');
      ctx.fillRect(0, 0, w, h);

      var x1 = x1El ? +x1El.value : 2.5;
      var x2 = x2El ? +x2El.value : 1.5;
      var w1 = w1El ? +w1El.value : 1.0;
      var w2 = w2El ? +w2El.value : -0.5;
      var b = bEl ? +bEl.value : -0.8;
      var mode = valveEl ? valveEl.value : 'relu';

      if ($('#hyd-x1-val')) $('#hyd-x1-val').textContent = x1.toFixed(1);
      if ($('#hyd-x2-val')) $('#hyd-x2-val').textContent = x2.toFixed(1);
      if ($('#hyd-w1-val')) $('#hyd-w1-val').textContent = w1.toFixed(2);
      if ($('#hyd-w2-val')) $('#hyd-w2-val').textContent = w2.toFixed(2);
      if ($('#hyd-b-val')) $('#hyd-b-val').textContent = b.toFixed(2);

      var z = w1 * x1 + w2 * x2 + b;
      var a = mode === 'relu' ? Math.max(0, z) : (1 / (1 + Math.exp(-z)));

      // Draw Pipe 1 (Top left)
      ctx.fillStyle = css('--surface');
      ctx.strokeStyle = css('--rule-firm');
      ctx.lineWidth = 2;
      ctx.fillRect(20, 35, 160, 35);
      ctx.strokeRect(20, 35, 160, 35);

      // Draw Pipe 2 (Bottom left)
      ctx.fillRect(20, 140, 160, 35);
      ctx.strokeRect(20, 140, 160, 35);

      // Water fluid inside incoming pipes
      ctx.fillStyle = 'rgba(2, 132, 199, 0.45)';
      ctx.fillRect(22, 37, 156 * Math.min(1, x1 / 4), 31);
      ctx.fillRect(22, 142, 156 * Math.min(1, x2 / 4), 31);

      // Constriction valves (w1, w2)
      var vH1 = Math.max(2, Math.min(32, 16 * (1 - Math.abs(w1))));
      ctx.fillStyle = css('--accent');
      ctx.fillRect(140, 36, 12, vH1);
      ctx.fillRect(140, 68 - vH1, 12, vH1);

      var vH2 = Math.max(2, Math.min(32, 16 * (1 - Math.abs(w2))));
      ctx.fillRect(140, 141, 12, vH2);
      ctx.fillRect(140, 173 - vH2, 12, vH2);

      // Mixing Chamber (Center)
      ctx.fillStyle = css('--surface');
      ctx.fillRect(180, 20, 160, 170);
      ctx.strokeRect(180, 20, 160, 170);

      // Water level in chamber based on z
      var waterH = Math.max(4, Math.min(166, 80 + z * 24));
      ctx.fillStyle = z > 0 ? 'rgba(2, 132, 199, 0.55)' : 'rgba(190, 18, 60, 0.25)';
      ctx.fillRect(182, 188 - waterH, 156, waterH);

      // Spring-loaded gate / flap valve (ReLU)
      var gateOpen = mode === 'relu' ? (z > 0 ? Math.min(45, z * 10) : 0) : Math.min(45, a * 45);
      ctx.save();
      ctx.translate(340, 105);
      ctx.rotate(-gateOpen * Math.PI / 180);
      ctx.fillStyle = gateOpen > 0 ? css('--emerald') : css('--rose');
      ctx.fillRect(0, -25, 10, 50);
      ctx.restore();

      // Outlet pipe (Right)
      ctx.fillStyle = css('--surface');
      ctx.fillRect(340, 80, 200, 50);
      ctx.strokeRect(340, 80, 200, 50);

      // Water exiting outlet
      if (a > 0.05) {
        ctx.fillStyle = 'rgba(4, 120, 87, 0.6)';
        ctx.fillRect(342, 82, 196 * Math.min(1, a / 3), 46);
      }

      // Labels on canvas
      ctx.fillStyle = css('--ink');
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Pipe 1 (x₁=' + x1.toFixed(1) + ')', 26, 30);
      ctx.fillText('Pipe 2 (x₂=' + x2.toFixed(1) + ')', 26, 135);
      ctx.fillText('Chamber Pressure z = ' + z.toFixed(2) + ' psi', 190, 40);
      ctx.fillText('Spring Valve (ϕ)', 320, 70);
      ctx.fillText('Flow a = ' + a.toFixed(2) + ' L/s', 420, 75);

      if (outEl) {
        outEl.innerHTML =
          '<div class="metrics">' +
            '<div><span>Pipe 1 Flow w\u2081x\u2081</span><b>' + (w1 * x1).toFixed(2) + '</b></div>' +
            '<div><span>Pipe 2 Flow w\u2082x\u2082</span><b>' + (w2 * x2).toFixed(2) + '</b></div>' +
            '<div><span>Bias Pressure b</span><b>' + b.toFixed(2) + '</b></div>' +
            '<div><span>Total Pressure z</span><b style="color:' + (z > 0 ? 'var(--cyan)' : 'var(--rose)') + '">' + z.toFixed(2) + '</b></div>' +
            '<div><span>Discharged Flow a</span><b style="color:' + (a > 0 ? 'var(--emerald)' : 'var(--rose)') + '">' + a.toFixed(3) + '</b></div>' +
          '</div>' +
          '<div class="readout">' +
            (mode === 'relu' && z <= 0 ?
              '<span style="color:var(--rose)">&#9888; <b>Valve Held Shut:</b> Chamber pressure (' + z.toFixed(2) + ') &le; 0. Spring force holds the valve clamped tight. Zero water discharged (a = 0). Local derivative &phi;\'(z) is 0!</span>' :
              '<span style="color:var(--emerald)">&#10003; <b>Valve Open:</b> Chamber pressure overcomes the spring! Discharged water flow equals ' + a.toFixed(3) + ' L/s with full sensitivity &phi;\'(z) = 1.</span>') +
          '</div>';
      }
    }

    [x1El, x2El, w1El, w2El, bEl, valveEl].forEach(function (el) {
      if (el) el.addEventListener('input', render);
    });

    window.addEventListener('resize', render);
    registerThemeCallback(render);
    render();
  }());

  /* --- Interactive Physical Metaphors Explorer ---------------------------- */
  (function () {
    var tabs = document.querySelectorAll('.metaphor-tab');
    var panes = document.querySelectorAll('.metaphor-pane');
    if (!tabs.length || !panes.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var targetId = tab.getAttribute('data-target');
        if (typeof window.switchMetaphorTab === 'function') {
          window.switchMetaphorTab(targetId, tab);
        } else {
          tabs.forEach(function (t) { t.classList.remove('active'); });
          panes.forEach(function (p) { p.style.display = 'none'; });
          tab.classList.add('active');
          var targetPane = document.getElementById(targetId);
          if (targetPane) {
            targetPane.style.display = 'block';
            if (window.MathJax && window.MathJax.typesetPromise) {
              window.MathJax.typesetPromise([targetPane]).catch(function () {});
            }
          }
        }
      });
    });
  }());
}());

