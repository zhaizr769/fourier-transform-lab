/* ==========================================================================
   signals.js —— 傅里叶变换对库（教材风格公式）
   公式使用 Unicode 文本，直接显示为教材样式
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT;
  var PI = Math.PI, TAU = 2 * Math.PI;
  var SIG = FT.SIG = {};

  FT.SIGGROUPS = [
    { id: 'nonperiodic', label: '非周期信号' },
    { id: 'periodic', label: '周期信号' },
    { id: 'custom', label: '自定义' }
  ];

  function sa(x) { return Math.abs(x) < 1e-9 ? 1 - x * x / 6 : Math.sin(x) / x; }
  var ZERO = function (x, o) { o[0] = 0; o[1] = 0; };

  /* ================================================================
     非周期信号
     ================================================================ */

  SIG.exp1s = {
    group: 'nonperiodic', name: '单边指数', order: 1, kind: 'energy',
    formulaT: 'e^{-at}u(t)',
    formulaX: '1/(a+jω)',
    params: [{ key: 'a', label: 'a', min: 0.2, max: 6, step: 0.1, def: 1, desc: '衰减系数 a>0' }],
    window: { tmax: 12, wmax: 24 },
    build: function (p) {
      var a = p.a;
      return {
        xfn: function (t, o) { o[0] = t >= 0 ? Math.exp(-a * t) : 0; o[1] = 0; },
        Xfn: function (w, o) { var d = a * a + w * w; o[0] = a / d; o[1] = -w / d; }
      };
    }
  };

  SIG.exp1neg = {
    group: 'nonperiodic', name: '反因果指数', order: 2, kind: 'energy',
    formulaT: 'e^{at}u(-t)',
    formulaX: '1/(a-jω)',
    params: [{ key: 'a', label: 'a', min: 0.2, max: 6, step: 0.1, def: 1, desc: '衰减系数 a>0' }],
    window: { tmax: 12, wmax: 24 },
    build: function (p) {
      var a = p.a;
      return {
        xfn: function (t, o) { o[0] = t <= 0 ? Math.exp(a * t) : 0; o[1] = 0; },
        Xfn: function (w, o) { var d = a * a + w * w; o[0] = a / d; o[1] = w / d; }
      };
    }
  };

  SIG.expabs = {
    group: 'nonperiodic', name: '双边指数', order: 3, kind: 'energy',
    formulaT: 'e^{-a|t|}',
    formulaX: '2a/(a²+ω²)',
    params: [{ key: 'a', label: 'a', min: 0.2, max: 6, step: 0.1, def: 1, desc: '衰减系数 a>0' }],
    window: { tmax: 10, wmax: 24 },
    build: function (p) {
      var a = p.a;
      return {
        xfn: function (t, o) { o[0] = Math.exp(-a * Math.abs(t)); o[1] = 0; },
        Xfn: function (w, o) { o[0] = 2 * a / (a * a + w * w); o[1] = 0; }
      };
    }
  };

  SIG.teexp = {
    group: 'nonperiodic', name: 't·e^{-at}u(t)', order: 4, kind: 'energy',
    formulaT: 't·e^{-at}u(t)',
    formulaX: '1/(a+jω)²',
    params: [{ key: 'a', label: 'a', min: 0.2, max: 6, step: 0.1, def: 1, desc: '衰减系数 a>0' }],
    window: { tmax: 12, wmax: 24 },
    build: function (p) {
      var a = p.a;
      return {
        xfn: function (t, o) { o[0] = t >= 0 ? t * Math.exp(-a * t) : 0; o[1] = 0; },
        Xfn: function (w, o) {
          var d = a * a + w * w;
          o[0] = (a * a - w * w) / (d * d);
          o[1] = -2 * a * w / (d * d);
        }
      };
    }
  };

  SIG.tnexp = {
    group: 'nonperiodic', name: 't^{n-1}/(n-1)!·e^{-at}u(t)', order: 5, kind: 'energy',
    formulaT: '[t^{n-1}/(n-1)!]·e^{-at}u(t)',
    formulaX: '1/(a+jω)^n',
    params: [
      { key: 'a', label: 'a', min: 0.2, max: 6, step: 0.1, def: 1, desc: '衰减系数 a>0' },
      { key: 'n', label: 'n', min: 1, max: 5, step: 1, def: 2, desc: '阶数 n≥1' }
    ],
    window: { tmax: 12, wmax: 24 },
    build: function (p) {
      var a = p.a, n = Math.round(p.n);
      return {
        xfn: function (t, o) {
          if (t < 0) { o[0] = 0; o[1] = 0; return; }
          var fact = 1;
          for (var k = 1; k < n; k++) fact *= k;
          o[0] = Math.pow(t, n - 1) / fact * Math.exp(-a * t);
          o[1] = 0;
        },
        Xfn: function (w, o) {
          var r = Math.sqrt(a * a + w * w);
          var theta = Math.atan2(w, a);
          var rn = Math.pow(r, n);
          var ntheta = n * theta;
          o[0] = Math.cos(ntheta) / rn;
          o[1] = -Math.sin(ntheta) / rn;
        }
      };
    }
  };

  SIG.gate = {
    group: 'nonperiodic', name: '矩形脉冲', order: 6, kind: 'energy',
    formulaT: '门函数：|t|<T₁ 时为 1，否则为 0',
    formulaX: '2T₁·Sa(ωT₁)',
    params: [{ key: 'T1', label: 'T₁', min: 0.2, max: 6, step: 0.1, def: 1, desc: '半宽度 T₁' }],
    window: { tmax: 10, wmax: 20 },
    build: function (p) {
      var T1 = p.T1;
      return {
        xfn: function (t, o) { var a = Math.abs(t); o[0] = a < T1 ? 1 : (a === T1 ? 0.5 : 0); o[1] = 0; },
        Xfn: function (w, o) { o[0] = 2 * T1 * sa(w * T1); o[1] = 0; }
      };
    }
  };

  SIG.tri = {
    group: 'nonperiodic', name: '三角脉冲', order: 7, kind: 'energy',
    formulaT: 'Λ(t/τ)：|t|<τ 时为 1-|t|/τ，否则为 0',
    formulaX: 'τ·Sa²(ωτ/2)',
    params: [{ key: 'tau', label: 'τ', min: 0.4, max: 8, step: 0.1, def: 2, desc: '半底宽 τ' }],
    window: { tmax: 10, wmax: 20 },
    build: function (p) {
      var tau = p.tau;
      return {
        xfn: function (t, o) { var a = Math.abs(t); o[0] = a < tau ? 1 - a / tau : 0; o[1] = 0; },
        Xfn: function (w, o) { var u = w * tau / 2, s = sa(u); o[0] = tau * s * s; o[1] = 0; }
      };
    }
  };

  SIG.sincW = {
    group: 'nonperiodic', name: '抽样信号 Sa', order: 8, kind: 'energy',
    formulaT: 'sin(Wt)/(πt)',
    formulaX: '|ω|<W 时为 1，否则为 0',
    params: [{ key: 'W', label: 'W', min: 0.5, max: 12, step: 0.1, def: 3, desc: '截止频率 W' }],
    window: { tmax: 12, wmax: 14 },
    build: function (p) {
      var W = p.W;
      return {
        xfn: function (t, o) { o[0] = W / PI * sa(W * t); o[1] = 0; },
        Xfn: function (w, o) { var a = Math.abs(w); o[0] = a < W ? 1 : (a === W ? 0.5 : 0); o[1] = 0; }
      };
    }
  };

  SIG.delta = {
    group: 'nonperiodic', name: '单位冲激 δ(t)', order: 9, kind: 'dist',
    formulaT: 'δ(t)',
    formulaX: '1',
    params: [],
    window: { tmax: 8, wmax: 20 },
    build: function () {
      return {
        xfn: ZERO, Xfn: ZERO,
        timp: [{ t: 0, re: 1, im: 0 }]
      };
    }
  };

  SIG.deltashift = {
    group: 'nonperiodic', name: '延时冲激 δ(t-t₀)', order: 10, kind: 'dist',
    formulaT: 'δ(t-t₀)',
    formulaX: 'e^{-jωt₀}',
    params: [{ key: 't0', label: 't₀', min: -6, max: 6, step: 0.1, def: 2, desc: '延时 t₀' }],
    window: { tmax: 10, wmax: 20 },
    build: function (p) {
      var t0 = p.t0;
      return {
        xfn: ZERO, Xfn: ZERO,
        timp: [{ t: t0, re: 1, im: 0 }]
      };
    }
  };

  SIG.doubled = {
    group: 'nonperiodic', name: '冲激偶 δ\'(t)', order: 11, kind: 'dist',
    formulaT: 'δ\'(t)',
    formulaX: 'jω',
    params: [],
    window: { tmax: 8, wmax: 20 },
    build: function () {
      return {
        xfn: ZERO, Xfn: ZERO,
        timp: [{ t: 0, re: 1, im: 0, order: 1 }]
      };
    }
  };

  SIG.step = {
    group: 'nonperiodic', name: '单位阶跃 u(t)', order: 12, kind: 'dist',
    formulaT: 'u(t)',
    formulaX: '1/(jω) + πδ(ω)',
    params: [],
    window: { tmax: 10, wmax: 26 },
    build: function () {
      return {
        xfn: function (t, o) { o[0] = t >= 0 ? 1 : 0; o[1] = 0; },
        Xfn: function (w, o) { o[0] = 0; o[1] = Math.abs(w) < 1e-9 ? 0 : -1 / w; },
        wimp: function () { return [{ w: 0, re: PI, im: 0 }]; }
      };
    }
  };

  SIG.sgn = {
    group: 'nonperiodic', name: '符号函数 Sgn(t)', order: 13, kind: 'dist',
    formulaT: 'Sgn(t)',
    formulaX: '2/(jω)',
    params: [],
    window: { tmax: 10, wmax: 26 },
    build: function () {
      return {
        xfn: function (t, o) { o[0] = t > 0 ? 1 : (t < 0 ? -1 : 0); o[1] = 0; },
        Xfn: function (w, o) { o[0] = 0; o[1] = Math.abs(w) < 1e-9 ? 0 : -2 / w; }
      };
    }
  };

  SIG.dc = {
    group: 'nonperiodic', name: '直流 1', order: 14, kind: 'dist',
    formulaT: '1',
    formulaX: '2πδ(ω)',
    params: [],
    window: { tmax: 10, wmax: 20 },
    build: function () {
      return {
        xfn: function (t, o) { o[0] = 1; o[1] = 0; },
        Xfn: ZERO,
        wimp: function () { return [{ w: 0, re: TAU, im: 0 }]; }
      };
    }
  };

  /* ================================================================
     周期信号
     ================================================================ */

  SIG.cexp = {
    group: 'periodic', name: '复指数 e^{jω₀t}', order: 15, kind: 'power',
    formulaT: 'e^{jω₀t}',
    formulaX: '2πδ(ω-ω₀)',
    params: [{ key: 'w0', label: 'ω₀', min: 0.5, max: 12, step: 0.1, def: 4, desc: '角频率 ω₀' }],
    window: { tmax: 12, wmax: 20 },
    build: function (p) {
      var w0 = p.w0;
      return {
        xfn: function (t, o) { o[0] = Math.cos(w0 * t); o[1] = Math.sin(w0 * t); },
        Xfn: ZERO,
        wimp: function () { return [{ w: w0, re: TAU, im: 0 }]; }
      };
    }
  };

  SIG.cosw = {
    group: 'periodic', name: '余弦 cos ω₀t', order: 16, kind: 'power',
    formulaT: 'cos(ω₀t)',
    formulaX: 'π[δ(ω-ω₀)+δ(ω+ω₀)]',
    params: [{ key: 'w0', label: 'ω₀', min: 0.5, max: 12, step: 0.1, def: 4, desc: '角频率 ω₀' }],
    window: { tmax: 12, wmax: 20 },
    build: function (p) {
      var w0 = p.w0;
      return {
        xfn: function (t, o) { o[0] = Math.cos(w0 * t); o[1] = 0; },
        Xfn: ZERO,
        wimp: function () { return [{ w: w0, re: PI, im: 0 }, { w: -w0, re: PI, im: 0 }]; }
      };
    }
  };

  SIG.sinw = {
    group: 'periodic', name: '正弦 sin ω₀t', order: 17, kind: 'power',
    formulaT: 'sin(ω₀t)',
    formulaX: '(π/j)[δ(ω-ω₀)-δ(ω+ω₀)]',
    params: [{ key: 'w0', label: 'ω₀', min: 0.5, max: 12, step: 0.1, def: 4, desc: '角频率 ω₀' }],
    window: { tmax: 12, wmax: 20 },
    build: function (p) {
      var w0 = p.w0;
      return {
        xfn: function (t, o) { o[0] = Math.sin(w0 * t); o[1] = 0; },
        Xfn: ZERO,
        wimp: function () { return [{ w: w0, re: 0, im: -PI }, { w: -w0, re: 0, im: PI }]; }
      };
    }
  };

  SIG.impulseTrain = {
    group: 'periodic', name: '均匀冲激串', order: 18, kind: 'power',
    formulaT: 'Σδ(t-nT)',
    formulaX: '(2π/T)Σδ(ω-2πk/T)',
    params: [{ key: 'T', label: 'T', min: 0.6, max: 8, step: 0.1, def: 3, desc: '周期 T' }],
    window: { tmax: 12, wmax: 20 },
    build: function (p) {
      var T = p.T, w0 = TAU / T;
      return {
        xfn: ZERO, Xfn: ZERO,
        timp: (function () {
          var out = [], n = Math.ceil(14 / T);
          for (var k = -n; k <= n; k++) out.push({ t: k * T, re: 1, im: 0 });
          return out;
        })(),
        wimp: (function () {
          var out = [], n = Math.ceil(20 / w0);
          for (var k = -n; k <= n; k++) out.push({ w: k * w0, re: TAU / T, im: 0 });
          return out;
        })()
      };
    }
  };

  SIG.periodicRect = {
    group: 'periodic', name: '周期矩形脉冲', order: 19, kind: 'power',
    formulaT: '周期矩形：|t|<T₁ 时为 1，T₁<|t|≤T₀/2 时为 0',
    formulaX: '(2π/T₀)Σ[sin(kω₀T₁)/(kπ)]·δ(ω-kω₀)',
    params: [
      { key: 'T0', label: 'T₀', min: 2, max: 12, step: 0.5, def: 6, desc: '周期 T₀' },
      { key: 'T1', label: 'T₁', min: 0.2, max: 4, step: 0.1, def: 1, desc: '脉冲半宽 T₁' }
    ],
    window: { tmax: 12, wmax: 20 },
    build: function (p) {
      var T0 = p.T0, T1 = p.T1, w0 = TAU / T0;
      return {
        xfn: function (t, o) {
          var tm = ((t % T0) + T0) % T0 - T0 / 2;
          o[0] = Math.abs(tm) < T1 ? 1 : 0;
          o[1] = 0;
        },
        Xfn: ZERO,
        wimp: (function () {
          var out = [], n = Math.ceil(20 / w0);
          for (var k = -n; k <= n; k++) {
            var ak = k === 0 ? 2 * T1 / T0 : Math.sin(k * w0 * T1) / (k * PI);
            out.push({ w: k * w0, re: TAU * ak / T0, im: 0 });
          }
          return out;
        })()
      };
    }
  };

  SIG.twoTone = {
    group: 'periodic', name: '双音信号', order: 20, kind: 'power',
    formulaT: 'cos(ω₁t)+cos(ω₂t)',
    formulaX: 'π[δ(ω-ω₁)+δ(ω+ω₁)+δ(ω-ω₂)+δ(ω+ω₂)]',
    params: [
      { key: 'w1', label: 'ω₁', min: 1, max: 10, step: 0.5, def: 3, desc: '频率 ω₁' },
      { key: 'w2', label: 'ω₂', min: 1, max: 10, step: 0.5, def: 7, desc: '频率 ω₂' }
    ],
    window: { tmax: 12, wmax: 20 },
    build: function (p) {
      var w1 = p.w1, w2 = p.w2;
      return {
        xfn: function (t, o) { o[0] = Math.cos(w1 * t) + Math.cos(w2 * t); o[1] = 0; },
        Xfn: ZERO,
        wimp: function () {
          return [
            { w: w1, re: PI, im: 0 }, { w: -w1, re: PI, im: 0 },
            { w: w2, re: PI, im: 0 }, { w: -w2, re: PI, im: 0 }
          ];
        }
      };
    }
  };

  SIG.amTone = {
    group: 'periodic', name: '调幅波', order: 21, kind: 'power',
    formulaT: 'cos(ωct)·cos(Ωt)',
    formulaX: '(π/2)[δ(ω-ωc-Ω)+δ(ω+ωc+Ω)+δ(ω-ωc+Ω)+δ(ω+ωc-Ω)]',
    params: [
      { key: 'wc', label: 'ωc', min: 2, max: 12, step: 0.5, def: 8, desc: '载波频率 ωc' },
      { key: 'W', label: 'Ω', min: 0.5, max: 4, step: 0.1, def: 2, desc: '调制频率 Ω' }
    ],
    window: { tmax: 12, wmax: 20 },
    build: function (p) {
      var wc = p.wc, W = p.W;
      return {
        xfn: function (t, o) { o[0] = Math.cos(wc * t) * Math.cos(W * t); o[1] = 0; },
        Xfn: ZERO,
        wimp: function () {
          return [
            { w: wc + W, re: PI / 2, im: 0 }, { w: -(wc + W), re: PI / 2, im: 0 },
            { w: wc - W, re: PI / 2, im: 0 }, { w: -(wc - W), re: PI / 2, im: 0 }
          ];
        }
      };
    }
  };

  SIG.custom = {
    group: 'custom', name: '自定义 x(t)', order: 22, kind: 'energy',
    formulaT: 'x(t)（自定义）',
    formulaX: 'X(jω)（数值计算）',
    params: [],
    window: { tmax: 10, wmax: 20 },
    build: function (p) {
      return {
        xfn: function (t, o) { o[0] = 0; o[1] = 0; },
        Xfn: function (w, o) { o[0] = 0; o[1] = 0; },
        notes: [{ cls: 'tip', text: '请在下方输入表达式定义 x(t)' }]
      };
    }
  };

  /* --------------------------------------------------------------- 工具 */
  FT.getSignal = function (id) { return SIG[id] || null; };
  FT.listSignals = function () {
    var out = [];
    for (var k in SIG) if (SIG.hasOwnProperty(k)) out.push(SIG[k]);
    out.sort(function (a, b) { return a.order - b.order; });
    return out;
  };
  FT.signalList = FT.listSignals;
  FT.defaultParams = function (sig) {
    var p = {};
    (sig.params || []).forEach(function (d) { p[d.key] = d.def; });
    return p;
  };
  FT.buildBaseLayer = function (sig, p) {
    var raw = sig.build(p);
    // 将原始对象包装成完整的 layer（带 Xfull）
    return FT.makeLayer(raw.xfn, raw.Xfn, raw.timp || [], raw.wimp || function () { return []; }, { 
      signal: sig, 
      params: p,
      formulaT: sig.formulaT,
      formulaX: sig.formulaX,
      notes: raw.notes || []
    });
  };

})(window);
