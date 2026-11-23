/* ==========================================================================
   lab.js —— 实验台：信号选择 → 性质变换链 → 时域/幅度谱/相位谱/附加谱
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML, C = FT.COLORS;
  var PI = Math.PI, TAU = 2 * Math.PI;
  var Lab = FT.Lab = {};

  var NT = 800, NW = 1600;

  // HTML 转义函数，防止 XSS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  Lab.state = {
    sigId: 'exp1s',
    params: {},
    chain: [],
    opts: { overlay: true, impulses: true, unwrap: false, piTicks: true, hz: false, wmax: 30, tmax: 14, extra: 'reim' },
    custom: { expr: 'exp(-3*t)*u(t)', window: 24, params: 'a=2' }
  };

  var charts = {};
  var lastRender = null, lastBase = null;

  /* ------------------------------------------------------------ 变量哨兵
     \Tv = 运行时间变量 t，\Wv = 运行频率变量 ω；
     参数（\omega_0、T_1…）保持原样，替换时只动哨兵，公式就能正确逐层复合。
  ---------------------------------------------------------------- */
  function sub(tok, repl, latex) { return String(latex).split(tok).join(repl); }
  function wrap(inner, tpl, vars) {
    Object.keys(vars).forEach(function (k) { tpl = tpl.split('{' + k + '}').join(vars[k]); });
    return tpl.replace(/\{IN\}/g, inner);
  }

  /* --------------------------------------------------------- 构造基础层 */
  function buildBase(st) {
    if (st.sigId === 'custom') return buildCustomLayer(st);
    var sig = FT.getSignal(st.sigId);
    if (!sig) return null;
    var p = st.params;
    (sig.params || []).forEach(function (d) { if (p[d.key] === undefined) p[d.key] = d.def; });
    return FT.buildBaseLayer(sig, p);
  }

  function buildCustomLayer(st) {
    var c = st.custom;
    var fn;
    try { fn = FT.compile(c.expr); } catch (e) { return { error: e.message }; }
    var pv = {};
    (c.params || '').split(',').forEach(function (kv) {
      var m = /^\s*([A-Za-z_]\w*)\s*=\s*(-?\d*\.?\d+(?:e[-+]?\d+)?)\s*$/i.exec(kv);
      if (m) pv[m[1]] = parseFloat(m[2]);
    });
    var Wt = c.window;
    var n = 4001;
    var tg = FT.linspace(-Wt, Wt, n);
    var xre = new Float64Array(n), xim = new Float64Array(n);
    var env = { t: 0, p: pv };
    for (var i = 0; i < n; i++) {
      env.t = tg[i];
      var v = fn(env);
      xre[i] = isFinite(v.re) ? v.re : 0;
      xim[i] = isFinite(v.im) ? v.im : 0;
    }
    var wcalc = FT.linspace(-Math.max(40, st.opts.wmax * 1.6), Math.max(40, st.opts.wmax * 1.6), 1401);
    var X = FT.forwardFT(xre, xim, tg, wcalc);

    function interp(arrX, arrR, arrI, x) {
      var out = [0, 0];
      if (x < arrX[0] || x > arrX[arrX.length - 1]) return out;
      var h = arrX[1] - arrX[0];
      var k = (x - arrX[0]) / h;
      var i0 = Math.floor(k); if (i0 < 0) i0 = 0; if (i0 > arrX.length - 2) i0 = arrX.length - 2;
      var t = k - i0;
      out[0] = arrR[i0] + (arrR[i0 + 1] - arrR[i0]) * t;
      out[1] = arrI[i0] + (arrI[i0 + 1] - arrI[i0]) * t;
      return out;
    }

    var layer = FT.makeLayer(
      function (t, o) { env.t = t; var v = fn(env); o[0] = isFinite(v.re) ? v.re : 0; o[1] = isFinite(v.im) ? v.im : 0; },
      function (w, o) { var v = interp(wcalc, X.re, X.im, w); o[0] = v[0]; o[1] = v[1]; },
      [], function () { return []; },
      {
        name: '自定义 x(t)', sigId: 'custom', kind: 'energy',
        formulaT: c.expr,
        formulaX: '数值积分（截断窗 ' + UI.trim(Wt) + '）',
        notes: [{ cls: 'warn', text: '自定义信号走的是数值通道：时域在 [−' + UI.trim(Wt) + ', ' + UI.trim(Wt) + '] 上以 ' +
          UI.trim(tg[1] - tg[0]) + ' 步长采样，频谱由定义式数值积分得到。窗外的尾巴被截断，所以谱会有泄漏纹波；' +
          '不满足绝对可积的写法（如 u(t)、常数）只能近似。' }]
      }
    );
    return layer;
  }

  /* ------------------------------------------------------------- 应用链 */
  function applyChain(base, chain) {
    var L = base;
    var tExpr = base.meta.formulaT || '';
    var xExpr = base.meta.formulaX || '';
    var steps = [];
    var reconstruct = false;
    for (var i = 0; i < chain.length; i++) {
      var item = chain[i];
      var op = FT.propById(item.id);
      if (!op) continue;
      var p = item.params || {};
      L = op.apply(L, p);
      if (op.reconstructTime || (L.meta && L.meta.reconstruct)) reconstruct = true;
      var composed = op.compose({ tExpr: tExpr, xExpr: xExpr }, p);
      tExpr = composed.t; xExpr = composed.X;
      steps.push({ op: op, p: p, label: op.name });
    }
    return { layer: L, tExpr: tExpr, xExpr: xExpr, steps: steps, reconstruct: reconstruct };
  }

  /* 给算子补上公式复合规则 */
  function installCompose() {
    var P = FT.PROP;
    P.shift.compose = function (e, p) {
      return {
        t: sub('\\Tv', '(\\Tv-' + UI.trim(p.t0) + ')', e.tExpr),
        X: e.xExpr + '·e^{-jωt₀}'
      };
    };
    P.reverse.compose = function (e) {
      return { t: sub('\\Tv', '-\\Tv', e.tExpr), X: sub('ω', '-ω', e.xExpr) };
    };
    P.scale.compose = function (e, p) {
      var a = UI.trim(p.a);
      return {
        t: sub('\\Tv', a + '\\Tv', e.tExpr),
        X: '(1/' + Math.abs(p.a).toFixed(2) + ')[' + sub('ω', 'ω/' + a, e.xExpr) + ']'
      };
    };
    P.freqshift.compose = function (e, p) {
      var w = UI.trim(p.w0);
      return {
        t: e.tExpr + '·e^{jω₀t}',
        X: sub('ω', '(ω-' + w + ')', e.xExpr)
      };
    };
    P.conj.compose = function (e) {
      return { t: '[' + e.tExpr + ']*', X: '[' + sub('ω', '-ω', e.xExpr) + ']*' };
    };
    P.diff.compose = function (e) {
      return { t: 'd/dt[' + e.tExpr + ']', X: 'jω[' + e.xExpr + ']' };
    };
    P.integ.compose = function (e) {
      return {
        t: '∫_{-∞}^{t}[' + e.tExpr + ']dτ',
        X: '(1/jω)[' + e.xExpr + ']+πX(0)δ(ω)'
      };
    };
    P.fdiff.compose = function (e) {
      return { t: 't·[' + e.tExpr + ']', X: 'j·d/dω[' + e.xExpr + ']' };
    };
    P.modulate.compose = function (e, p) {
      var w = UI.trim(p.w0);
      return {
        t: 'cos(' + w + 't)·[' + e.tExpr + ']',
        X: '(1/2)[' + sub('ω', '(ω-' + w + ')', e.xExpr) + '+' + sub('ω', '(ω+' + w + ')', e.xExpr) + ']'
      };
    };
    P.sample.compose = function (e, p) {
      var T = UI.trim(p.T);
      return {
        t: 'x(' + T + 'n)δ(t-' + T + 'n)',
        X: '(1/' + T + ')ΣX[j(ω-2πk/' + T + ')]'
      };
    };
    P.dual.compose = function (e) {
      return {
        t: sub('ω', 't', e.xExpr),
        X: '2π[' + sub('t', '-ω', e.tExpr) + ']'
      };
    };
  }

  /* ------------------------------------------------------------- 派生量 */
  function derive(r) {
    var n = r.w.length;
    var mag = new Float64Array(n), ph = new Float64Array(n), re = r.Xre, im = r.Xim;
    var db = new Float64Array(n), en = new Float64Array(n);
    var maxMag = 0;
    for (var i = 0; i < n; i++) {
      var a = re[i], b = im[i];
      var m = Math.hypot(a, b);
      mag[i] = m;
      en[i] = m * m;
      if (m > maxMag) maxMag = m;
      ph[i] = (m < 1e-9 * Math.max(1, maxMag)) ? NaN : Math.atan2(b, a);
      db[i] = m > 1e-300 ? 20 * Math.log10(m) : NaN;
    }
    /* 冲激会让 maxMag 失真：用正则部分重新统计 */
    if (r.wimp && r.wimp.length) {
      var mm = 0, mx = 0;
      for (var k = 0; k < n; k++) {
        var line = 0;
        for (var q = 0; q < r.wimp.length; q++) if (Math.abs(r.w[k] - r.wimp[q].w) < (r.w[1] - r.w[0])) line = 1;
        if (line) continue;
        if (mag[k] > mm) mm = mag[k];
      }
      if (mm > 0) maxMag = mm;
    }
    if (r.opts && r.opts.unwrap) unwrapPhase(ph);
    return { mag: mag, ph: ph, db: db, en: en, maxMag: maxMag };
  }

  function unwrapPhase(ph) {
    var prev = ph[0];
    for (var i = 1; i < ph.length; i++) {
      if (!isFinite(ph[i]) || !isFinite(prev)) { prev = ph[i]; continue; }
      while (ph[i] - prev > PI) ph[i] -= TAU;
      while (ph[i] - prev < -PI) ph[i] += TAU;
      prev = ph[i];
    }
  }

  /* --------------------------------------------------------------- 指标 */
  function metrics(r, d) {
    var out = [];
    var w = r.w, Xre = r.Xre, Xim = r.Xim;
    var i0 = Math.floor((w.length - 1) / 2);
    var X0re = Xre[i0], X0im = Xim[i0];
    out.push({ k: 'X(j0) = ∫x(t)dt', v: UI.cplx(X0re, X0im) });
    out.push({ k: '|X| 峰值（正则部分）', v: UI.trim(d.maxMag) });

    /* 3 dB 带宽 */
    var half = d.maxMag / Math.SQRT2, bw = null;
    for (var i = i0; i < w.length - 1; i++) {
      if (d.mag[i] >= half && d.mag[i + 1] < half) {
        bw = w[i] + (w[i + 1] - w[i]) * (d.mag[i] - half) / (d.mag[i] - d.mag[i + 1]);
        break;
      }
    }
    out.push({ k: '3 dB 带宽 ω₃', v: bw === null ? '—（无单峰）' : UI.trim(bw) + ' rad/s' + (bw ? ' = ' + UI.trim(bw / TAU) + ' Hz' : '') });

    /* 第一过零点 */
    var z = null;
    for (var j = i0; j < w.length - 1; j++) {
      if (Xre[j] * Xre[j + 1] + Xim[j] * Xim[j + 1] < 0 || (Math.abs(d.mag[j]) < 1e-6)) {
        if (Math.abs(d.mag[j]) < 1e-6) { z = w[j]; break; }
      }
      if (d.mag[j] > 1e-9 && d.mag[j + 1] < d.mag[j] * 1e-3) { z = w[j + 1]; break; }
    }
    out.push({ k: '第一过零点', v: z === null ? '—' : UI.trim(z) + ' rad/s' });

    /* 能量 / 功率 */
    var eT = trapz(r.t, sq(r.xre, r.xim));
    var eW = trapz(w, sq(Xre, Xim)) / TAU;
    out.push({ k: '时域 ∫|x|²dt', v: UI.trim(eT) });
    out.push({ k: '频域 (1/2π)∫|X|²dω', v: UI.trim(eW) });

    /* 对称性检查 */
    var sym = symmetry(r, d);
    out.push({ k: '对称性', v: sym, mx: false });
    return out;
  }

  function sq(a, b) {
    var n = a.length, o = new Float64Array(n);
    for (var i = 0; i < n; i++) o[i] = a[i] * a[i] + b[i] * b[i];
    return o;
  }
  function trapz(x, y) {
    var s = 0;
    for (var i = 0; i < x.length - 1; i++) s += (y[i] + y[i + 1]) * (x[i + 1] - x[i]) / 2;
    return s;
  }

  function symmetry(r, d) {
    var n = r.w.length, i0 = Math.floor((n - 1) / 2);
    var magErr = 0, phErr = 0, reIm = 0, imIm = 0, cnt = 0;
    for (var k = 0; k < i0; k++) {
      var a = d.mag[k], b = d.mag[n - 1 - k];
      if (!isFinite(a) || !isFinite(b) || a + b < 1e-9) continue;
      magErr = Math.max(magErr, Math.abs(a - b) / Math.max(a, b));
      var pa = d.ph[k], pb = d.ph[n - 1 - k];
      if (isFinite(pa) && isFinite(pb)) phErr = Math.max(phErr, Math.abs(pa + pb) / PI);
      reIm = Math.max(reIm, Math.abs(r.xim[k] + r.xim[n - 1 - k]));
      imIm = Math.max(imIm, Math.abs(r.xre[k] + r.xre[n - 1 - k]));
      cnt++;
    }
    if (!cnt) return '样本不足';
    var s = [];
    s.push(magErr < 0.02 ? '|X| 偶 ✓' : '|X| 非偶');
    s.push(phErr < 0.05 ? '∠X 奇 ✓' : '∠X 非奇');
    var xIm = 0, xEven = 0, xOdd = 0;
    for (var i = 0; i < r.t.length; i++) xIm = Math.max(xIm, Math.abs(r.xim[i]));
    for (var j = 0; j < i0; j++) {
      xEven = Math.max(xEven, Math.abs(r.xre[j] - r.xre[r.t.length - 1 - j]));
      xOdd = Math.max(xOdd, Math.abs(r.xre[j] + r.xre[r.t.length - 1 - j]));
    }
    var scale = Math.max(1e-9, maxAbs(r.xre));
    if (xIm / scale < 1e-6) s.push('x 实');
    else s.push('x 复');
    if (xEven / scale < 1e-3) s.push('偶');
    else if (xOdd / scale < 1e-3) s.push('奇');
    return s.join('，');
  }
  function maxAbs(a) { var m = 0; for (var i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i])); return m; }

  /* --------------------------------------------------------------- 绘图 */
  function freqAxis(r) {
    var o = Lab.state.opts;
    if (o.hz) {
      var n = r.w.length, out = new Float64Array(n);
      for (var i = 0; i < n; i++) out[i] = r.w[i] / TAU;
      return out;
    }
    return r.w;
  }

  function impulseSeries(r, d, scaleTo) {
    var o = Lab.state.opts;
    if (!o.impulses || !r.wimp.length) return [];
    var list = [];
    var top = scaleTo === 'mag' ? Math.max(d.maxMag, 1e-9) : 1;
    var ref = Math.max(top, maxAbsOfImp(r.wimp));
    r.wimp.forEach(function (q) {
      var h = Math.hypot(q.re, q.im);
      var x = o.hz ? q.w / TAU : q.w;
      list.push({
        x: x, y: h,
        color: C.mag,
        label: h > 0 ? UI.trim(h) : '',
        width: 2
      });
    });
    return list;
  }
  function maxAbsOfImp(l) { var m = 0; l.forEach(function (q) { m = Math.max(m, Math.hypot(q.re, q.im)); }); return m; }

  function timeImpulses(r) {
    var o = Lab.state.opts;
    if (!o.impulses || !r.timp.length) return [];
    var peak = maxAbs(r.xre) || 1;
    var ref = Math.max(peak, maxAbsOfImp(r.timp));
    return r.timp.map(function (q) {
      var h = Math.hypot(q.re, q.im);
      return {
        x: q.t, y: h * (ref > 0 ? 1 : 1),
        color: q.order ? C.danger : C.x,
        label: q.order ? 'δ′' : '1',
        width: q.order ? 1.6 : 2
      };
    });
  }

  function drawAll() {
    console.log('[Lab] drawAll: lastRender=', lastRender ? 'ok' : 'null');
    if (!lastRender) {
      console.warn('[Lab] drawAll: lastRender is null, skipping');
      return;
    }
    var r = lastRender, d = r.derived, o = Lab.state.opts;
    var wAx = freqAxis(r);
    var xLabel = o.hz ? 'f (Hz)' : 'ω (rad/s)';
    var xLabT = 't (s)';

    /* 时域 */
    var tSeries = [];
    if (o.overlay && lastBase) {
      tSeries.push({ x: lastBase.t, y: lastBase.xre, color: C.ghost, width: 1.4, dash: [5, 4], alpha: .9, label: '原 x' });
    }
    tSeries.push({ x: r.t, y: r.xre, color: C.x, width: 2, label: 'Re x' });
    if (maxAbs(r.xim) > 1e-9) tSeries.push({ x: r.t, y: r.xim, color: C.accent, width: 1.5, dash: [4, 3], label: 'Im x' });
    charts.time.setDomain(-o.tmax, o.tmax);
    charts.time.setSeries(tSeries);
    charts.time.setImpulses(timeImpulses(r));
    charts.time.setVLine([]);
    charts.time.o.xlabel = xLabT;
    charts.time.draw();

    /* 幅度谱 */
    var mSeries = [];
    if (o.overlay && lastBase.derived) {
      mSeries.push({ x: freqAxis(lastBase), y: lastBase.derived.mag, color: C.ghost, width: 1.3, dash: [5, 4], alpha: .85, label: '原|X|' });
    }
    mSeries.push({ x: wAx, y: d.mag, color: C.mag, width: 2, fill: C.fillMag, label: '|X|' });
    charts.mag.setDomain(o.hz ? -o.wmax / TAU : -o.wmax, o.hz ? o.wmax / TAU : o.wmax);
    charts.mag.o.piTicks = o.piTicks && !o.hz;
    charts.mag.o.xLabel = 'ω';
    charts.mag.setSeries(mSeries);
    charts.mag.setImpulses(impulseSeries(r, d, 'mag'));
    charts.mag.setVLine((r.marks || []).map(function (mk) {
      return { x: o.hz ? mk.w / TAU : mk.w, color: '#c9d5e8', label: mk.label };
    }));
    charts.mag.draw();

    /* 相位谱 */
    var pSeries = [];
    if (o.overlay && lastBase.derived) {
      pSeries.push({ x: freqAxis(lastBase), y: lastBase.derived.ph, color: C.ghost, width: 1.3, dash: [5, 4], alpha: .85, label: '原∠X' });
    }
    pSeries.push({ x: wAx, y: d.ph, color: C.phase, width: 2, label: '∠X' });
    charts.phase.setDomain(charts.mag.xmin, charts.mag.xmax);
    charts.phase.o.piTicks = o.piTicks && !o.hz;
    charts.phase.setSeries(pSeries);
    charts.phase.setHLine([
      { y: PI / 2, label: 'π/2', color: '#dfe7f2' },
      { y: -PI / 2, label: '−π/2', color: '#dfe7f2' },
      { y: PI, label: 'π', color: '#e8d9f5' },
      { y: -PI, label: '−π', color: '#e8d9f5' }
    ]);
    charts.phase.setImpulses([]);
    charts.phase.draw();

    /* 附加谱 */
    var eSeries = [], title = '';
    if (o.extra === 'reim') {
      title = '实部 Re X 与虚部 Im X';
      eSeries.push({ x: wAx, y: r.Xre, color: C.x, width: 1.8, label: 'Re' });
      eSeries.push({ x: wAx, y: r.Xim, color: C.accent, width: 1.8, dash: [6, 3], label: 'Im' });
    } else if (o.extra === 'db') {
      title = '幅度谱（对数分贝）';
      eSeries.push({ x: wAx, y: d.db, color: C.mag, width: 1.8, label: 'dB' });
    } else {
      title = '能量谱 |X(jω)|²';
      eSeries.push({ x: wAx, y: d.en, color: C.y, width: 1.8, fill: 'rgba(15,122,77,.10)', label: '|X|²' });
    }
    document.getElementById('extraTitle').textContent = title;
    charts.extra.setDomain(charts.mag.xmin, charts.mag.xmax);
    charts.extra.o.piTicks = o.piTicks && !o.hz;
    charts.extra.setSeries(eSeries);
    charts.extra.setImpulses([]);
    charts.extra.setHLine(o.extra === 'db' ? [{ y: -3, label: '−3 dB', color: '#f0c9a8' }] : []);
    charts.extra.draw();
  }

  /* ------------------------------------------------------------- 公式卡 */
  function updateFormula(res, st) {
    var main = document.getElementById('formulaMain');
    var rule = document.getElementById('formulaRule');
    var notes = document.getElementById('formulaNotes');
    var tag = document.getElementById('formulaTag');

    var tExpr = res.tExpr, xExpr = res.xExpr;
    // 使用 UI.renderMath 渲染公式，支持上下标
    main.innerHTML = '<span class="mx">y(t) = ' + UI.renderMath(escapeHtml(tExpr)) + '</span>' +
      '<span class="arrow"></span><span class="mx">Y(jω) = ' + UI.renderMath(escapeHtml(xExpr)) + '</span>';
    tag.textContent = st.chain.length ? st.chain.map(function (c) { return FT.propById(c.id).name; }).join(' → ') : '未加变换';

    if (st.chain.length) {
      rule.innerHTML = st.chain.map(function (c, i) {
        var op = FT.propById(c.id);
        var pv = Object.keys(c.params).map(function (k) { return k + '=' + UI.trim(c.params[k]); }).join(', ');
        return '<span class="chainf">' + (i + 1) + '. ' + escapeHtml(op.formula) + (pv ? ' <span class="hint">（' + pv + '）</span>' : '') + '</span>';
      }).join('');
    } else {
      rule.innerHTML = '<span class="hint">在左边「性质变换」里点一个性质，看时域与频谱同时怎么变。</span>';
    }

    var ns = [];
    (res.layer.meta.notes || []).forEach(function (n) { ns.push(n); });
    st.chain.forEach(function (c) {
      var op = FT.propById(c.id);
      if (op.quote) ns.push({ cls: 'key', text: op.name + '：' + op.quote });
      if (op.desc) ns.push({ cls: 'tip', text: op.desc });
      if (res.layer.meta.opName === op.name && res.layer.meta.note) ns.push({ cls: 'warn', text: res.layer.meta.note });
    });
    notes.innerHTML = ns.map(function (n) { return '<span class="note ' + n.cls + '">' + n.text + '</span>'; }).join('');
  }

  function updateInsights(r) {
    var g = document.getElementById('insightGrid');
    var ms = metrics(r, r.derived);
    g.innerHTML = ms.map(function (m) {
      return '<div class="insight"><div class="k">' + m.k + '</div><div class="v">' + m.v + '</div></div>';
    }).join('') +
      '<div class="insight accent"><div class="k">当前显示范围</div><div class="v">t ∈ [−' + UI.trim(r.opts.tmax) + ', ' + UI.trim(r.opts.tmax) +
      ']，' + (r.opts.hz ? 'f ∈ [−' + UI.trim(r.opts.wmax / TAU) + ', ' + UI.trim(r.opts.wmax / TAU) + '] Hz' :
        'ω ∈ [−' + UI.trim(r.opts.wmax) + ', ' + UI.trim(r.opts.wmax) + '] rad/s') + '</div></div>' +
      (r.reconstructed ? '<div class="insight" style="background:#fffbeb;border-color:#fde68a"><div class="k">波形来源</div><div class="v">由频谱数值逆变换重建（截断 → 有 ringing）</div></div>' : '');
  }

  /* --------------------------------------------------------------- 计算 */
  Lab.recompute = function () {
    var st = Lab.state, o = st.opts;
    console.log('[Lab] recompute: sigId=', st.sigId);
    var base = buildBase(st);
    console.log('[Lab] recompute: base=', base ? 'ok' : 'null');
    if (!base) return;
    if (base.error) {
      var e = document.getElementById('customErr');
      if (e) e.textContent = '解析失败：' + base.error;
      return;
    }
    var err = document.getElementById('customErr');
    if (err) err.textContent = '';

    var res = st.chain.length ? applyChain(base, st.chain) : {
      layer: base, tExpr: base.meta.formulaT, xExpr: base.meta.formulaX, steps: [], reconstruct: false
    };
    console.log('[Lab] recompute: res.layer=', res.layer ? 'ok' : 'null');

    var opts = {
      tmin: -o.tmax, tmax: o.tmax, Nt: NT,
      wmin: -o.wmax, wmax: o.wmax, Nw: NW,
      wmaxAbs: o.wmax,
      reconstructTime: res.reconstruct
    };
    var r = FT.render(res.layer, opts);
    console.log('[Lab] recompute: render result t.len=', r.t.length, 'w.len=', r.w.length);
    r.opts = o;
    r.meta = res.layer.meta;
    r.marks = (base.meta && base.meta.marks) || [];
    r.reconstructed = res.reconstruct;
    r.derived = derive(r);
    lastRender = r;

    var b = FT.render(base, { tmin: -o.tmax, tmax: o.tmax, Nt: NT, wmin: -o.wmax, wmax: o.wmax, Nw: NW, wmaxAbs: o.wmax, reconstructTime: false });
    b.opts = o;
    b.derived = derive(b);
    lastBase = b;

    drawAll();
    updateFormula(res, st);
    updateInsights(r);
    document.getElementById('subTime').textContent = res.reconstruct ? '由 Y(jω) 逆变换重建' : '解析式直接求值';
    document.getElementById('subMag').textContent = r.wimp.length ? '含 ' + r.wimp.length + ' 根冲激谱线' : '连续谱';
    UI.save({ sigId: st.sigId, params: st.params, chain: st.chain, opts: o, custom: st.custom });
  };

  /* --------------------------------------------------------------- 界面 */
  function renderSigPicker() {
    var host = document.getElementById('sigGroups');
    UI.clear(host);
    var list = FT.signalList();
    console.log('[Lab] renderSigPicker: found', list.length, 'signals');
    FT.SIGGROUPS.forEach(function (grp) {
      var items = list.filter(function (s) { return s.group === grp.id; });
      if (!items.length) return;
      var box = UI.el('div', { class: 'sig-group' });
      box.appendChild(UI.el('div', { class: 'glabel', text: grp.label }));
      var cg = UI.el('div', { class: 'chip-grid' });
      items.forEach(function (s) {
        var chip = UI.chip(s.name, s.formulaT, Lab.state.sigId === s.id, function () {
          console.log('[Lab] Signal clicked:', s.id);
          pickSignal(s.id);
        });
        cg.appendChild(chip);
      });
      if (grp.id === 'custom') {
        cg.appendChild(UI.chip('打开表达式面板', 'x(t)=…', false, function () { UI.openDrawer(); }));
      }
      box.appendChild(cg);
      host.appendChild(box);
    });
    document.getElementById('sigCountHint').textContent = list.length + ' 个可选';
    console.log('[Lab] renderSigPicker: done');
  }

  function pickSignal(id) {
    console.log('[Lab] pickSignal called with id:', id);
    Lab.state.sigId = id;
    var sig = FT.getSignal(id);
    console.log('[Lab] pickSignal: got signal', sig ? sig.name : 'null');
    if (sig && !sig.custom) {
      Lab.state.params = FT.defaultParams(sig);
      if (sig.window) {
        Lab.state.opts.wmax = Math.min(120, Math.max(6, Math.round(sig.window.wmax)));
        Lab.state.opts.tmax = Math.min(60, Math.max(3, Math.round(sig.window.tmax)));
        syncRangeSliders();
      }
    }
    renderSigPicker();
    renderParamRows();
    Lab.recompute();
  }

  function renderParamRows() {
    var host = document.getElementById('sigParams');
    var fx = document.getElementById('sigFormula');
    UI.clear(host);
    var sig = FT.getSignal(Lab.state.sigId);
    if (!sig) return;
    if (sig.custom) {
      host.appendChild(UI.el('p', { class: 'field-help', html: '自定义信号在右上「公式速查 / 抽屉」里输入表达式；截断窗与参数在抽屉里调。' }));
      fx.textContent = Lab.state.custom.expr || '';
      return;
    }
    (sig.params || []).forEach(function (d) {
      var row = UI.sliderRow(d, Lab.state.params[d.key], function (v) {
        Lab.state.params[d.key] = v;
        Lab.recompute();
      });
      host.appendChild(row);
    });
    var lim = paramLimits(sig, Lab.state.params);
    fx.innerHTML = '<span class="hint">' + lim + '</span>';
  }

  function paramLimits(sig, p) {
    if (sig.id === 'periodicRect') {
      var d = (2 * p.T1 / p.T0);
      return '占空比 2T₁/T₀ = ' + d.toFixed(3) + (d > 0.999 ? '（已接近直流）' : '');
    }
    if (sig.id === 'tnexp') return 'n 阶：分母 (a+jω) 的 ' + Math.round(p.n) + ' 次方';
    return '';
  }

  function renderPropChips() {
    var host = document.getElementById('propChips');
    UI.clear(host);
    FT.PROP.LIST.forEach(function (op) {
      var inChain = Lab.state.chain.some(function (c) { return c.id === op.id; });
      var chip = UI.chip(op.name, op.short || '', inChain, function () { toggleProp(op.id); });
      chip.title = op.sec + ' ' + op.en + '：' + op.desc;
      host.appendChild(chip);
    });
    renderChain();
  }

  function toggleProp(id) {
    var st = Lab.state;
    var i = st.chain.findIndex(function (c) { return c.id === id; });
    if (i >= 0) st.chain.splice(i, 1);
    else {
      var op = FT.propById(id);
      var p = {};
      (op.params || []).forEach(function (d) { p[d.key] = d.def; });
      st.chain.push({ id: id, params: p });
    }
    renderPropChips();
    Lab.recompute();
  }

  function renderChain() {
    var host = document.getElementById('chainList');
    var pHost = document.getElementById('propParams');
    UI.clear(host); UI.clear(pHost);
    var st = Lab.state;
    if (!st.chain.length) {
      host.appendChild(UI.el('div', { class: 'chain-empty', text: '未选性质 —— 现在显示的是原信号本身。' }));
      return;
    }
    st.chain.forEach(function (c, idx) {
    var op = FT.propById(c.id);
      var step = UI.el('div', { class: 'chain-step' });
      step.appendChild(UI.el('span', { class: 'idx', text: String(idx + 1) }));
      var body = UI.el('div', { class: 'body' });
      body.appendChild(UI.el('span', { class: 'nm', text: op.name + ' ' + op.sec }));
      body.appendChild(UI.el('span', { class: 'mx', textContent: op.formula }));
      step.appendChild(body);
      var rm = UI.el('button', { class: 'rm', title: '移除', text: '✕', onclick: function () { st.chain.splice(idx, 1); renderPropChips(); Lab.recompute(); } });
      step.appendChild(rm);
      host.appendChild(step);
      (op.params || []).forEach(function (d) {
        pHost.appendChild(UI.sliderRow(d, c.params[d.key], function (v) { c.params[d.key] = v; Lab.recompute(); }));
      });
    });
  }

  function syncRangeSliders() {
    var o = Lab.state.opts;
    var rw = document.getElementById('rangeW'), rt = document.getElementById('rangeT');
    rw.value = o.wmax; rt.value = o.tmax;
    document.getElementById('rangeWVal').textContent = o.wmax + ' rad/s';
    document.getElementById('rangeTVal').textContent = o.tmax + ' s';
  }

  function bindStatic() {
    var o = Lab.state.opts;
    [['optOverlay', 'overlay'], ['optImpulses', 'impulses'], ['optUnwrap', 'unwrap'], ['optPiTicks', 'piTicks'], ['optHz', 'hz']].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      el.checked = !!o[pair[1]];
      el.addEventListener('change', function () { o[pair[1]] = el.checked; Lab.recompute(); });
    });
    document.getElementById('rangeW').addEventListener('input', function () {
      o.wmax = parseFloat(this.value);
      document.getElementById('rangeWVal').textContent = o.wmax + ' rad/s';
      Lab.recompute();
    });
    document.getElementById('rangeT').addEventListener('input', function () {
      o.tmax = parseFloat(this.value);
      document.getElementById('rangeTVal').textContent = o.tmax + ' s';
      Lab.recompute();
    });
    document.getElementById('extraSeg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-extra]');
      if (!b) return;
      o.extra = b.dataset.extra;
      Array.prototype.forEach.call(this.querySelectorAll('[data-extra]'), function (x) { x.classList.toggle('active', x === b); });
      Lab.recompute();
    });
    document.querySelector('.lab-main').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var ch = charts[b.dataset.chart];
      if (!ch) return;
      if (b.dataset.act === 'zoomfit') { ch.resetY(); ch.draw(); }
      if (b.dataset.act === 'export') { ch.exportPNG('ft-' + b.dataset.chart); UI.toast('已导出 PNG'); }
    });
  }

  /* ------------------------------------------------------------- 初始化 */
  Lab.init = function () {
    console.log('[Lab] init: starting');
    installCompose();
    var saved = UI.load();
    if (saved && saved.sigId) {
      Lab.state.sigId = saved.sigId;
      Lab.state.params = saved.params || {};
      Lab.state.chain = saved.chain || [];
      Object.assign(Lab.state.opts, saved.opts || {});
      Object.assign(Lab.state.custom, saved.custom || {});
    }
    var sig = FT.getSignal(Lab.state.sigId);
    console.log('[Lab] init: current sigId=', Lab.state.sigId, 'sig=', sig ? sig.name : 'null');
    if (!sig) Lab.state.sigId = 'exp1s';
    Lab.state.params = Lab.state.params || {};
    (FT.getSignal(Lab.state.sigId).params || []).forEach(function (d) {
      if (Lab.state.params[d.key] === undefined) Lab.state.params[d.key] = d.def;
    });

    charts.time = new Chart(document.getElementById('chTime'), document.getElementById('roTime'), { xlabel: 't', xLabel: 't', padL: 46 });
    charts.mag = new Chart(document.getElementById('chMag'), document.getElementById('roMag'), { xlabel: 'ω', xLabel: 'ω', piTicks: true, padL: 52 });
    charts.phase = new Chart(document.getElementById('chPhase'), document.getElementById('roPhase'), { xlabel: 'ω', xLabel: 'ω', piTicks: true, padL: 52 });
    charts.extra = new Chart(document.getElementById('chExtra'), document.getElementById('roExtra'), { xlabel: 'ω', xLabel: 'ω', piTicks: true, padL: 52 });
    console.log('[Lab] init: charts created');

    renderSigPicker();
    renderParamRows();
    renderPropChips();
    bindStatic();
    syncRangeSliders();
    console.log('[Lab] init: calling recompute');
    Lab.recompute();
    console.log('[Lab] init: done');
  };

  Lab.pick = pickSignal;
  Lab.charts = charts;

})(window);
