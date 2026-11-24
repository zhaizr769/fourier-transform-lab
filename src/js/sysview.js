/* ==========================================================================
   sysview.js —— 4.4 卷积性质 / 4.7 系统频率响应：频域分析四步法
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML, C = FT.COLORS;
  var PI = Math.PI, TAU = 2 * Math.PI;

  var NW = 1400, NT = 700;

  var SYSTEMS = [
    {
      id: 'idealLP', name: '理想低通（幅度 1，截止 W）',
      formula: 'H(jω) = 1 (|ω|<W),  0 (|ω|>W)',
      params: [{ key: 'W', label: 'W', min: 0.5, max: 14, step: 0.1, def: 4, desc: '截止角频率' }],
      H: function (w, p, o) { o[0] = Math.abs(w) < p.W ? 1 : 0; o[1] = 0; },
      note: '理想低通是矩形频率响应 ⟹ 冲激响应是 Sa，非因果、不可实现；方波通过它必然出现 Gibbs 振铃，这正是「带限 = 振铃」的直观展示。'
    },
    {
      id: 'idealHP', name: '理想高通',
      formula: 'H(jω) = 0 (|ω|<W),  1 (|ω|>W)',
      params: [{ key: 'W', label: 'W', min: 0.5, max: 14, step: 0.1, def: 3, desc: '截止角频率' }],
      H: function (w, p, o) { o[0] = Math.abs(w) > p.W ? 1 : 0; o[1] = 0; },
      note: '理想高通把直流和低频全部去掉：门函数过后只剩两个尖峰（边缘），也就是微分的效果。'
    },
    {
      id: 'idealBP', name: '理想带通（w₁ ~ w₂）',
      formula: 'H(jω) = 1 (w₁<|ω|<w₂),  0 (其它)',
      params: [
        { key: 'w1', label: 'w₁', min: 0.2, max: 8, step: 0.1, def: 2, desc: '下边' },
        { key: 'w2', label: 'w₂', min: 1, max: 16, step: 0.1, def: 6, desc: '上边' }
      ],
      H: function (w, p, o) { var a = Math.abs(w); o[0] = (a > p.w1 && a < p.w2) ? 1 : 0; o[1] = 0; },
      note: '带通滤掉直流与低频，也滤掉高频，只留中间一段 —— 课件 slide 60「中心频率可变的带通滤波器」就是用它 + 移频做出来的。'
    },
    {
      id: 'rc', name: '一阶 RC 低通 1/(1+jω/ωc)',
      formula: 'H(jω) = 1/(1+jω/ωc)',
      params: [{ key: 'wc', label: 'ωc', min: 0.5, max: 12, step: 0.1, def: 3, desc: '转折角频率' }],
      H: function (w, p, o) { var x = w / p.wc, d = 1 + x * x; o[0] = 1 / d; o[1] = -x / d; },
      note: '真实的低通：幅度按 1/√(1+(ω/ωc)²) 滚降（高频 −20 dB/十倍频），相位从 0 连续滞后到 −π/2 —— 非线性相位，所以方波过后边沿会变圆而不是振铃。'
    },
    {
      id: 'rcHP', name: '一阶 RC 高通 (jω/ωc)/(1+jω/ωc)',
      formula: 'H(jω) = (jω/ωc)/(1+jω/ωc)',
      params: [{ key: 'wc', label: 'ωc', min: 0.5, max: 12, step: 0.1, def: 3, desc: '转折角频率' }],
      H: function (w, p, o) { var x = w / p.wc, d = 1 + x * x; o[0] = x * x / d; o[1] = x / d; },
      note: '隔直电容：直流增益 0，高频增益 1。ω=ωc 处幅度 1/√2、相位 +45°。'
    },
    {
      id: 'butter2', name: '二阶低通（两个一阶串联）',
      formula: 'H(jω) = 1/(1+jω/ωc)²',
      params: [{ key: 'wc', label: 'ωc', min: 0.5, max: 12, step: 0.1, def: 3, desc: '转折角频率' }],
      H: function (w, p, o) {
        var x = w / p.wc, d = 1 + x * x, d2 = d * d;
        o[0] = (1 - x * x) / d2; o[1] = -2 * x / d2;
      },
      note: '对应表 4.2 的 t^{n-1}/(n-1)!·e^{-at}u(t) ⟷ 1/(a+jω)^n：阶数越高，滚降越陡、相位滞后越大（最大 −π）。'
    },
    {
      id: 'diff', name: '微分器 H = jω',
      formula: 'H(jω) = jω',
      params: [],
      H: function (w, p, o) { o[0] = 0; o[1] = w; },
      note: '幅度随 |ω| 线性上升 ⟹ 高频噪声被放大；相位恒为 π/2·sgn(ω)（一个理想的 90° 移相器）。'
    },
    {
      id: 'integ', name: '积分器 H = 1/(jω)',
      formula: 'H(jω) = 1/(jω)',
      params: [],
      H: function (w, p, o) { if (Math.abs(w) < 1e-9) { o[0] = 0; o[1] = 0; return; } o[0] = 0; o[1] = -1 / w; },
      note: '低频增益发散（ω→0 时 1/|ω|→∞），所以纯积分器对直流是不稳定的；相位恒为 −π/2·sgn(ω)。'
    },
    {
      id: 'delay', name: '纯延时（全通）',
      formula: 'H(jω) = e^{-jωt₀}',
      params: [{ key: 't0', label: 't₀', min: -4, max: 4, step: 0.1, def: 1.5, desc: '延时' }],
      H: function (w, p, o) { o[0] = Math.cos(-w * p.t0); o[1] = Math.sin(-w * p.t0); },
      note: '幅度恒 1、相位是过原点的斜直线 —— 线性相位系统不产生波形失真，只把信号整体平移。这是「无失真传输」的第二个条件。'
    },
    {
      id: 'linphaseLP', name: '线性相位低通（带延时）',
      formula: 'H(jω) = e^{-jωt₀} (|ω|<W),  0 (其它)',
      params: [
        { key: 'W', label: 'W', min: 1, max: 14, step: 0.1, def: 5, desc: '截止' },
        { key: 't0', label: 't₀', min: 0, max: 4, step: 0.1, def: 1.5, desc: '群延时' }
      ],
      H: function (w, p, o) {
        if (Math.abs(w) > p.W) { o[0] = 0; o[1] = 0; return; }
        o[0] = Math.cos(-w * p.t0); o[1] = Math.sin(-w * p.t0);
      },
      note: '无失真传输的两个条件：通带内幅度是常数、相位是 ω 的线性函数。把 t₀ 设为 0 就能看到「幅度对了但相位非线性」造成的对称失真。'
    },
    {
      id: 'rational', name: '自定义有理式（微分方程系数）',
      formula: 'H(jω) = [b_M(jω)^M+...+b₁(jω)+b₀] / [(jω)^N+a_{N-1}(jω)^{N-1}+...+a₁(jω)+a₀]',
      params: [],
      H: null,
      note: '线性常系数微分方程、频率响应、冲激响应三者一一对应，都能用来描述同一个 LTI 连续时间系统。'
    }
  ];

  var Sys = FT.Sys = {
    state: {
      inputId: 'gate',
      inputParams: {},
      kind: 'rc',
      params: {},
      num: [1],
      den: [1, 1],
      wmax: 20,
      tmax: 12
    }
  };

  var charts = {}, built = false;

  /* 多项式：按 (jω) 的升幂 */
  function polyEval(coef, w, out) {
    /* Σ c_k (jw)^k */
    var rr = 0, ri = 0;
    /* (jw)^k 循环 */
    var pr = 1, pi = 0;
    for (var k = 0; k < coef.length; k++) {
      rr += coef[k] * pr;
      ri += coef[k] * pi;
      /* 乘一次 jw */
      var nr = -pi * w, ni = pr * w;
      pr = nr; pi = ni;
    }
    out[0] = rr; out[1] = ri;
    return out;
  }

  function currentH() {
    var st = Sys.state;
    if (st.kind === 'rational') {
      var num = st.num, den = st.den, a = [0, 0], b = [0, 0];
      return function (w, o) {
        polyEval(num, w, a); polyEval(den, w, b);
        var d = b[0] * b[0] + b[1] * b[1];
        if (!d) { o[0] = 0; o[1] = 0; return; }
        o[0] = (a[0] * b[0] + a[1] * b[1]) / d;
        o[1] = (a[1] * b[0] - a[0] * b[1]) / d;
      };
    }
    var S = SYSTEMS.filter(function (s) { return s.id === st.kind; })[0] || SYSTEMS[0];
    var p = st.params;
    return function (w, o) { S.H(w, p, o); };
  }

  function currentDef() {
    return SYSTEMS.filter(function (s) { return s.id === Sys.state.kind; })[0] || SYSTEMS[0];
  }

  function coefStr(a) { return a.join(', '); }
  function parseCoef(s) {
    var out = String(s).split(/[,;\s]+/).filter(function (x) { return x.length; })
      .map(function (x) { var v = parseFloat(x); return isFinite(v) ? v : NaN; });
    if (!out.length || out.some(function (v) { return !isFinite(v); })) return null;
    return out;
  }

  /* ------------------------------------------------------------- 渲染 */
  function recompute() {
    var st = Sys.state;
    var sig = FT.getSignal(st.inputId);
    if (!sig) return;
    var p = st.inputParams;
    (sig.params || []).forEach(function (d) { if (p[d.key] === undefined) p[d.key] = d.def; });
    var base = FT.buildBaseLayer(sig, p);
    if (!base) return;

    var w = FT.linspace(-st.wmax, st.wmax, NW);
    var t = FT.linspace(-st.tmax, st.tmax, NT);
    var Hfn = currentH();
    var Hg = FT.evalComplex(Hfn, w);

    var Xg = FT.evalComplex(function (x, o) { base.Xfull(x, o); }, w);
    var imps = base.wimp(st.wmax).filter(function (q) { return Math.abs(q.w) <= st.wmax; });

    /* Y = X·H，谱线强度乘 H(ω_k)（本征函数性质） */
    var Yg = new Float64Array(NW), Yi = new Float64Array(NW);
    for (var i = 0; i < NW; i++) {
      var a = Xg.re[i], b = Xg.im[i], c = Hg.re[i], d = Hg.im[i];
      Yg[i] = a * c - b * d; Yi[i] = a * d + b * c;
    }
    var Yimp = imps.map(function (q) {
      var o = [0, 0]; Hfn(q.w, o);
      return { w: q.w, re: q.re * o[0] - q.im * o[1], im: q.re * o[1] + q.im * o[0] };
    });

    /* h(t) 与 y(t) */
    var hInv = FT.inverseFT(Hg.re, Hg.im, w, t);
    var yInv = FT.inverseWithImpulses(Yg, Yi, w, Yimp, t);
    var xInv = FT.evalComplex(function (x, o) { base.xfn(x, o); }, t);

    /* 派生 */
    function mag(re, im) {
      var n = re.length, m = new Float64Array(n);
      for (var k = 0; k < n; k++) m[k] = Math.hypot(re[k], im[k]);
      return m;
    }
    function phase(re, im) {
      var n = re.length, m = new Float64Array(n);
      var mx = 0, mm = mag(re, im);
      for (var k = 0; k < n; k++) if (mm[k] > mx) mx = mm[k];
      for (var k2 = 0; k2 < n; k2++) m[k2] = mm[k2] < 1e-9 * Math.max(1, mx) ? NaN : Math.atan2(im[k2], re[k2]);
      return m;
    }
    var Hmag = mag(Hg.re, Hg.im), Hph = phase(Hg.re, Hg.im);
    var Xmag = mag(Xg.re, Xg.im), Ymag = mag(Yg, Yi);

    /* 冲激谱线的幅度也要画进 Y */
    var data = {
      w: w, t: t, Hmag: Hmag, Hph: Hph, Xmag: Xmag, Ymag: Ymag,
      Yimp: Yimp, imps: imps,
      xre: xInv.re, xim: xInv.im, yre: yInv.re, yim: yInv.im, hre: hInv.re, him: hInv.im,
      Hfn: Hfn, sig: sig, base: base
    };
    draw(data);
    insights(data);
    formula(data);
  }

  function draw(d) {
    var st = Sys.state;
    charts.mag.setDomain(-st.wmax, st.wmax);
    charts.mag.setSeries([{ x: d.w, y: d.Hmag, color: C.mag, width: 2, fill: C.fillMag, label: '|H|' }]);
    charts.mag.setImpulses([]);
    charts.mag.setHLine([{ y: 1, label: '增益 1', color: '#dbe4f0', dash: [4, 4] }, { y: 1 / Math.SQRT2, label: '1/√2', color: '#f0c9a8', dash: [3, 4] }]);
    charts.mag.setVLine([]);
    charts.mag.draw();

    charts.ph.setDomain(-st.wmax, st.wmax);
    charts.ph.setSeries([{ x: d.w, y: d.Hph, color: C.phase, width: 2, label: 'φ_H' }]);
    charts.ph.setHLine([{ y: PI / 2, label: 'π/2', color: '#e7dcf5' }, { y: -PI / 2, label: '−π/2', color: '#e7dcf5' }]);
    charts.ph.draw();

    charts.time.setDomain(-st.tmax, st.tmax);
    var ts = [
      { x: d.t, y: d.xre, color: C.ghost, width: 1.5, dash: [5, 4], label: 'x' },
      { x: d.t, y: d.yre, color: C.y, width: 2.1, label: 'y' }
    ];
    if (maxOf(d.hre) > 1e-9) ts.push({ x: d.t, y: d.hre, color: C.sys, width: 1.4, dash: [2, 3], alpha: .85, label: 'h' });
    if (maxOf(d.yim) > 1e-9) ts.push({ x: d.t, y: d.yim, color: C.accent, width: 1.3, dash: [4, 3], label: 'Im y' });
    charts.time.setSeries(ts);
    charts.time.setImpulses(d.sig.id === 'delta' || d.base.timp.length ?
      d.base.timp.filter(function (q) { return Math.abs(q.t) <= st.tmax; }).map(function (q) { return { x: q.t, y: 1, color: C.x, label: 'δ' }; }) : []);
    charts.time.draw();

    charts.spec.setDomain(-st.wmax, st.wmax);
    charts.spec.setSeries([
      { x: d.w, y: d.Xmag, color: C.x2, width: 1.6, dash: [5, 4], label: '|X|' },
      { x: d.w, y: d.Ymag, color: C.y, width: 2, label: '|Y|' }
    ]);
    /* 周期输入的谱经系统后仍是谱线：逐根强度 = |2πa_k·H(jω_k)|；被滤掉的根不画 */
    charts.spec.setImpulses(d.Yimp.map(function (q) {
      var h = Math.hypot(q.re, q.im);
      return { x: q.w, y: h, color: C.y, label: h > 1e-9 ? UI.trim(h) : '' };
    }).filter(function (q) { return q.y > 1e-9; }));
    charts.spec.draw();
  }

  function maxOf(a) { var m = 0; for (var i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i])); return m; }

  function insights(d) {
    var st = Sys.state, o = [0, 0];
    d.Hfn(0, o);
    var H0 = Math.hypot(o[0], o[1]);
    var Hmax = 0, HmaxW = 0;
    for (var i = 0; i < d.w.length; i++) if (d.Hmag[i] > Hmax) { Hmax = d.Hmag[i]; HmaxW = d.w[i]; }
    var half = Hmax / Math.SQRT2, cut = null;
    for (var j = 0; j < d.w.length - 1; j++) {
      if (d.w[j] >= 0 && d.Hmag[j] >= half && d.Hmag[j + 1] < half) {
        cut = d.w[j] + (d.w[j + 1] - d.w[j]) * (d.Hmag[j] - half) / (d.Hmag[j] - d.Hmag[j + 1]);
        break;
      }
    }
    /* 群延时 at 0 */
    var a = [0, 0], b = [0, 0], hh = 1e-3;
    d.Hfn(hh, a); d.Hfn(-hh, b);
    var ph1 = Math.atan2(a[1], a[0]), ph0 = Math.atan2(b[1], b[0]);
    var dph = ph1 - ph0;
    if (dph > PI) dph -= TAU; if (dph < -PI) dph += TAU;
    var tau = -dph / (2 * hh);

    var items = [
      { k: '直流增益 H(j0)', v: UI.trim(H0) + (H0 < 1e-6 ? '（隔直）' : '') },
      { k: '最大增益', v: UI.trim(Hmax) + (HmaxW ? ' @ ω=' + UI.trim(HmaxW) : '') },
      { k: '3 dB 截止', v: cut === null ? '—' : UI.trim(cut) + ' rad/s' },
      { k: '群延时 τ_g(0) = −dφ/dω', v: UI.trim(tau) + ' s' },
      { k: '输入峰值', v: UI.trim(maxOf(d.xre)) },
      { k: '输出峰值', v: UI.trim(maxOf(d.yre)) }
    ];
    var g = document.getElementById('sysInsight');
    g.innerHTML = items.map(function (m) {
      return '<div class="insight"><div class="k">' + m.k + '</div><div class="v">' + m.v + '</div></div>';
    }).join('');

    /* 周期/线谱输入：逐次谐波的响应表 */
    var note = document.getElementById('sysNote');
    if (d.imps.length && d.imps.length <= 15) {
      var rows = d.imps.map(function (q) {
        var o2 = [0, 0]; d.Hfn(q.w, o2);
        var m = Math.hypot(o2[0], o2[1]), p2 = Math.atan2(o2[1], o2[0]) * 180 / PI;
        return '<tr><td>' + UI.trim(q.w) + '</td><td>' + UI.trim(Math.hypot(q.re, q.im)) + '</td><td>' +
          UI.trim(m) + '</td><td>' + p2.toFixed(1) + '°</td><td>' + UI.trim(Math.hypot(q.re, q.im) * m) + '</td></tr>';
      }).join('');
      note.innerHTML = '<table class="mini-table"><thead><tr><th>谐波频率 ω<sub>k</sub></th><th>输入谱线 2πa<sub>k</sub></th>' +
        '<th>|H(jω<sub>k</sub>)|</th><th>∠H</th><th>输出谱线</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<span class="hint">本征函数性质：复指数进、同频复指数出，只被 H(jω) 缩放和移相。周期信号 = 一堆复指数的和，所以逐根谱线各乘各的。</span>';
    } else {
      note.textContent = currentDef().note || '';
    }
  }

  function formula(d) {
    var st = Sys.state, box = document.getElementById('sysFormula');
    var S = currentDef();
    var numStr = coefStr(st.num), denStr = coefStr(st.den);
    var html = '';
    if (st.kind === 'rational') {
      html += UI.renderMath('H(jω) = [' + polyText(st.num) + '] / [' + polyText(st.den) + ']');
      html += '<div class="ode-eq">' + UI.renderMath(odeText(st.num, st.den)) + '</div>';
    } else {
      html += UI.renderMath(S.formula);
    }
    html += '<div class="pair">h(t)  H(jω)</div>';
    box.innerHTML = html;
  }

  function polyText(c) {
    var parts = [];
    for (var k = 0; k < c.length; k++) {
      var v = c[k];
      if (Math.abs(v) < 1e-12) continue;
      var av = Math.abs(v);
      var numPart = (k > 0 && Math.abs(av - 1) < 1e-12) ? '' : UI.trim(av);
      var pw = k === 0 ? '' : (k === 1 ? '(jω)' : '(jω)^' + k);
      var term = numPart + pw;
      if (!term) term = UI.trim(av);
      parts.push({ neg: v < 0, txt: term });
    }
    if (!parts.length) return '0';
    var s = (parts[0].neg ? '-' : '') + parts[0].txt;
    for (var i = 1; i < parts.length; i++) s += (parts[i].neg ? '-' : '+') + parts[i].txt;
    return s;
  }

  function odeText(num, den) {
    function side(c, v) {
      var parts = [];
      for (var k = 0; k < c.length; k++) {
        var val = c[k];
        if (Math.abs(val) < 1e-12) continue;
        var av = Math.abs(val);
        var coef = (av === 1 && k > 0) ? '' : UI.trim(av);
        var der = k === 0 ? v + '(t)' :
          'd^' + k + v + '/dt^' + k;
        parts.push({ neg: val < 0, txt: coef + der });
      }
      if (!parts.length) return '0';
      var s = (parts[0].neg ? '-' : '') + parts[0].txt;
      for (var i = 1; i < parts.length; i++) s += (parts[i].neg ? '-' : '+') + parts[i].txt;
      return s;
    }
    return side(den, 'y') + ' = ' + side(num, 'f');
  }

  /* ------------------------------------------------------------- 界面 */
  function renderInputChips() {
    var host = document.getElementById('sysInputChips');
    UI.clear(host);
    ['gate', 'tri', 'exp1s', 'twoTone', 'cosw', 'periodicRect', 'delta', 'deltashift', 'sincW', 'impulseTrain']
      .forEach(function (id) {
        var s = FT.getSignal(id);
        host.appendChild(UI.chip(s.name, s.formulaT, Sys.state.inputId === id, function () {
          Sys.state.inputId = id;
          Sys.state.inputParams = FT.defaultParams(s);
          renderInputChips();
          renderInputParams();
          recompute();
        }));
      });
  }

  function renderInputParams() {
    var host = document.getElementById('sysInputParams');
    UI.clear(host);
    var s = FT.getSignal(Sys.state.inputId);
    (s.params || []).forEach(function (d) {
      host.appendChild(UI.sliderRow(d, Sys.state.inputParams[d.key], function (v) {
        Sys.state.inputParams[d.key] = v; recompute();
      }));
    });
  }

  function renderSysParams() {
    var host = document.getElementById('sysParams');
    UI.clear(host);
    var S = currentDef();
    (S.params || []).forEach(function (d) {
      if (Sys.state.params[d.key] === undefined) Sys.state.params[d.key] = d.def;
      host.appendChild(UI.sliderRow(d, Sys.state.params[d.key], function (v) {
        Sys.state.params[d.key] = v; recompute();
      }));
    });
    var box = UI.el('div', { class: 'range-box' });
    box.appendChild(UI.el('div', { class: 'glabel', text: '显示范围' }));
    box.appendChild(UI.sliderRow({ key: 'wmax', label: 'ω_{max}', min: 6, max: 60, step: 1, def: 20, desc: 'rad/s' },
      Sys.state.wmax, function (v) { Sys.state.wmax = v; recompute(); }));
    box.appendChild(UI.sliderRow({ key: 'tmax', label: 'T_{max}', min: 4, max: 40, step: 1, def: 12, desc: 's' },
      Sys.state.tmax, function (v) { Sys.state.tmax = v; recompute(); }));
    host.appendChild(box);
    var isRat = Sys.state.kind === 'rational';
    document.getElementById('sysOdeNum').style.opacity = isRat ? 1 : .5;
    document.getElementById('sysOdeDen').style.opacity = isRat ? 1 : .5;
  }

  Sys.init = function () {
    if (built) return;
    built = true;
    charts.mag = new Chart(document.getElementById('chSysMag'), document.getElementById('roSysMag'), { xlabel: 'ω', xLabel: 'ω', piTicks: true, padL: 50 });
    charts.ph = new Chart(document.getElementById('chSysPhase'), document.getElementById('roSysPhase'), { xlabel: 'ω', xLabel: 'ω', piTicks: true, padL: 50 });
    charts.time = new Chart(document.getElementById('chSysTime'), document.getElementById('roSysTime'), { xlabel: 't', xLabel: 't', padL: 46 });
    charts.spec = new Chart(document.getElementById('chSysSpec'), document.getElementById('roSysSpec'), { xlabel: 'ω', xLabel: 'ω', piTicks: true, padL: 50 });

    var sel = document.getElementById('sysKind');
    SYSTEMS.forEach(function (s) { sel.appendChild(UI.el('option', { value: s.id, text: s.name })); });
    sel.value = Sys.state.kind;
    sel.addEventListener('change', function () {
      Sys.state.kind = sel.value;
      var S = currentDef();
      Sys.state.params = {};
      (S.params || []).forEach(function (d) { Sys.state.params[d.key] = d.def; });
      renderSysParams(); recompute();
    });

    var en = document.getElementById('sysOdeNum'), ed = document.getElementById('sysOdeDen');
    function applyOde() {
      var n = parseCoef(en.value), d = parseCoef(ed.value);
      var err = document.getElementById('sysOdeErr');
      if (!n || !d) { err.textContent = '系数要用逗号分隔的实数，例如 1, 0, 3'; return; }
      if (!d.length || (d.every(function (v) { return Math.abs(v) < 1e-15; }))) { err.textContent = '分母不能全为 0'; return; }
      err.textContent = '';
      Sys.state.num = n; Sys.state.den = d; Sys.state.kind = 'rational';
      sel.value = 'rational';
      renderSysParams(); recompute();
    }
    en.addEventListener('change', applyOde);
    ed.addEventListener('change', applyOde);

    document.getElementById('sysPreset1').addEventListener('click', function () {
      /* 例 4.1.1：h(t)=e^{-2|t|} ⟹ H = 4/(ω²+4) = 4/(4-(jω)²) */
      Sys.state.kind = 'rational';
      Sys.state.num = [4]; Sys.state.den = [4, 0, -1];
      Sys.state.inputId = 'twoTone';
      Sys.state.inputParams = { w1: 2, w2: 5 };
      en.value = '4'; ed.value = '4, 0, -1';
      sel.value = 'rational';
      renderInputChips(); renderInputParams(); renderSysParams(); recompute();
      UI.toast('例 4.1.1：y(t)=½cos2t + (4/29)cos5t');
    });
    document.getElementById('sysPreset2').addEventListener('click', function () {
      /* 课堂测试：y''+4y'+3y = f'−2f，f = e^{-2t}u(t) */
      Sys.state.kind = 'rational';
      Sys.state.num = [-2, 1]; Sys.state.den = [3, 4, 1];
      Sys.state.inputId = 'exp1s';
      Sys.state.inputParams = { a: 2 };
      en.value = '-2, 1'; ed.value = '3, 4, 1';
      sel.value = 'rational';
      renderInputChips(); renderInputParams(); renderSysParams(); recompute();
      UI.toast('课堂测试：h(t)=−1.5e^{−t}u(t)+2.5e^{−3t}u(t)');
    });

    en.value = coefStr(Sys.state.num);
    ed.value = coefStr(Sys.state.den);

    renderInputChips();
    renderInputParams();
    renderSysParams();
    recompute();
  };

  FT.SYS_DEFS = SYSTEMS;

})(window);
