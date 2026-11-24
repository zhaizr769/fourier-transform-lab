/* ==========================================================================
   props.js —— 傅里叶变换性质算子
   每个算子把一个 Layer 映射成另一个 Layer：时域与频域同时按性质变换，
   冲激谱线的位置与强度也按分布意义下的规则映射。
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, PI = Math.PI, TAU = 2 * Math.PI;
  var PROP = FT.PROP = {};
  var ORDER = ['shift', 'freqshift', 'reverse', 'scale', 'conj', 'diff', 'integ', 'fdiff', 'modulate', 'sample', 'dual'];

  /* 用闭包方式写：scaleSpec(X, gf) 其中 gf(w) -> [re,im] */
  function scaleSpec(X, gf) {
    return function (w, o) {
      X(w, o);
      var a = o[0], b = o[1];
      var g = gf(w);
      o[0] = a * g[0] - b * g[1];
      o[1] = a * g[1] + b * g[0];
    };
  }

  /* 谱线条数上限：避免展缩/抽样后无限根谱线把浏览器拖死 */
  var MAX_LINES = 900;
  function cap(list) {
    if (list.length <= MAX_LINES) return list;
    list.sort(function (a, b) { return Math.abs(a.w) - Math.abs(b.w); });
    return list.slice(0, MAX_LINES);
  }

  function mapImp(list, f) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var r = f(list[i]);
      if (r) out.push(r);
    }
    return out;
  }

  /* --------------------------------------------------------------- 时移 */
  PROP.shift = {
    id: 'shift', name: '时移', en: 'Time Shifting', sec: '4.3.2', short: '时移 t₀',
    formula: 'x(t-t₀) ⟷ e^{-jωt₀}X(jω)',
    quote: '任世间纷扰，幅度谱不变，只相位移动。',
    desc: '延时不改变任何频率分量的强度，只让每个分量按自己的频率多滞后一个相位 ωt₀。合成起来，相位谱整体倾斜。',
    params: [{ key: 't0', label: 't₀', min: -6, max: 6, step: 0.1, def: 1.5, desc: '延时（>0 右移）' }],
    apply: function (L, p) {
      var t0 = p.t0;
      return FT.makeLayer(
        function (t, o) { L.xfn(t - t0, o); },
        scaleSpec(L.Xfn, function (w) { return [Math.cos(-w * t0), Math.sin(-w * t0)]; }),
        mapImp(L.timp, function (q) { return { t: q.t + t0, re: q.re, im: q.im, order: q.order || 0 }; }),
        function (W) {
          return mapImp(L.wimp(W), function (q) {
            var e = [Math.cos(-q.w * t0), Math.sin(-q.w * t0)];
            return { w: q.w, re: q.re * e[0] - q.im * e[1], im: q.re * e[1] + q.im * e[0] };
          });
        },
        { opName: '时移', opFormula: 'e^{-jωt₀}X(jω)', note: '幅度谱 |X(jω)| 与原来完全重合，只有相位谱变化。' }
      );
    }
  };

  /* --------------------------------------------------------------- 频移 */
  PROP.freqshift = {
    id: 'freqshift', name: '频移', en: 'Frequency Shifting', sec: '4.3.6', short: '频移 ω₀',
    formula: 'e^{jω₀t}x(t) ⟷ X[j(ω-ω₀)]',
    quote: '把整个频谱平移，形状一点不变。',
    desc: '时域乘一个复指数，频谱整体右移 ω₀。调制、混频、采样全都靠它。注意时域信号变成复信号了。',
    params: [{ key: 'w0', label: 'ω₀', min: -10, max: 10, step: 0.1, def: 4, desc: '搬移量' }],
    apply: function (L, p) {
      var w0 = p.w0;
      return FT.makeLayer(
        function (t, o) {
          L.xfn(t, o);
          var a = o[0], b = o[1], c = Math.cos(w0 * t), s = Math.sin(w0 * t);
          o[0] = a * c - b * s; o[1] = a * s + b * c;
        },
        function (w, o) { L.Xfn(w - w0, o); },
        mapImp(L.timp, function (q) {
          var c = Math.cos(w0 * q.t), s = Math.sin(w0 * q.t);
          return { t: q.t, re: q.re * c - q.im * s, im: q.re * s + q.im * c, order: q.order || 0 };
        }),
        function (W) {
          return mapImp(L.wimp(Math.abs(W) + Math.abs(w0) + 1), function (q) {
            return { w: q.w + w0, re: q.re, im: q.im };
          }).filter(function (q) { return Math.abs(q.w) <= W; });
        },
        { opName: '频移', opFormula: 'X[j(ω-ω₀)]', note: '频谱平移 ω₀，包络形状不变；时域乘 e^{jω₀t} 后一般是复信号，虚部也要看。' }
      );
    }
  };

  /* --------------------------------------------------------------- 反转 */
  PROP.reverse = {
    id: 'reverse', name: '时间反转', en: 'Time Reversal', sec: '4.3.5', short: '反转 t→−t',
    formula: 'x(-t)  X(-jω)',
    quote: '时间倒着走，频谱也倒着看。',
    desc: '时域左右翻转 ⟺ 频域左右翻转。对实信号而言 X(−jω)=X*(jω)，所以幅度谱不变、相位谱反号。',
    params: [],
    apply: function (L, p) {
      return FT.makeLayer(
        function (t, o) { L.xfn(-t, o); },
        function (w, o) { L.Xfn(-w, o); },
        mapImp(L.timp, function (q) { return { t: -q.t, re: q.re, im: q.im, order: q.order || 0 }; }),
        function (W) { return mapImp(L.wimp(W), function (q) { return { w: -q.w, re: q.re, im: q.im }; }); },
        { opName: '时间反转', opFormula: 'X*(-jω) (实信号)', note: '实信号反转后幅度谱不变、相位谱反号；若原信号本身是偶的，则完全不变。' }
      );
    }
  };

  /* --------------------------------------------------------------- 展缩 */
  PROP.scale = {
    id: 'scale', name: '尺度变换', en: 'Scaling', sec: '4.3.5', short: '展缩 x(at)',
    formula: 'x(at)  (1/|a|)X(jω/a)',
    quote: '同根同源，相互制约。',
    desc: '时域压缩 a>1 ⟺ 频域扩展且幅度按 1/|a| 压低。时宽与带宽的乘积大致守恒 —— 这是不确定性原理在信号里的样子。',
    params: [{ key: 'a', label: 'a', min: 0.2, max: 5, step: 0.05, def: 2, desc: '>1 时域压缩' }],
    apply: function (L, p) {
      var a = p.a, A = Math.abs(a);
      return FT.makeLayer(
        function (t, o) { L.xfn(a * t, o); },
        function (w, o) { L.Xfn(w / a, o); o[0] /= A; o[1] /= A; },
        mapImp(L.timp, function (q) { return { t: q.t / a, re: q.re / A, im: q.im / A, order: q.order || 0 }; }),
        function (W) {
          return mapImp(L.wimp(W * A + 1), function (q) { return { w: a * q.w, re: q.re, im: q.im }; })
            .filter(function (q) { return Math.abs(q.w) <= W; });
        },
        { opName: '尺度变换', opFormula: '(1/|a|)X(jω/a)', note: '别忘了 1/|a| 这个幅度补偿因子：时域压得越窄，频谱摊得越开、峰值越低。' }
      );
    }
  };

  /* --------------------------------------------------------------- 共轭 */
  PROP.conj = {
    id: 'conj', name: '共轭', en: 'Conjugation', sec: '4.3.3', short: '共轭 x*(t)',
    formula: 'x*(t)  X*(-jω)',
    quote: '从现在开始，变身。',
    desc: '取共轭 ⟺ 频谱既共轭又反转。实信号取共轭当然不变，于是得到 X(jω)=X*(−jω)：实部偶、虚部奇、模偶、相位奇。',
    params: [],
    apply: function (L, p) {
      return FT.makeLayer(
        function (t, o) { L.xfn(t, o); o[1] = -o[1]; },
        function (w, o) { L.Xfn(-w, o); o[1] = -o[1]; },
        mapImp(L.timp, function (q) { return { t: q.t, re: q.re, im: -q.im, order: q.order || 0 }; }),
        function (W) { return mapImp(L.wimp(W), function (q) { return { w: -q.w, re: q.re, im: -q.im }; }); },
        { opName: '共轭', opFormula: 'X*(-jω)', note: '对实信号这一操作等于什么都没做 —— 而这恰恰证明了频谱的共对称性。' }
      );
    }
  };

  /* --------------------------------------------------------------- 微分 */
  PROP.diff = {
    id: 'diff', name: '时域微分', en: 'Differentiation', sec: '4.3.4', short: '微分 dx/dt',
    formula: 'dx(t)/dt  jωX(jω)',
    quote: '简化计算的一把好手。',
    desc: '微分 = 频域乘 jω：幅度按 |ω| 提升、相位加 π/2·sgn(ω)。高频被放大，所以微分器放大噪声；间断点变成冲激。',
    params: [],
    reconstructTime: true,
    apply: function (L, p) {
      return FT.makeLayer(
        L.xfn,
        function (w, o) { L.Xfn(w, o); var a = o[0], b = o[1]; o[0] = -b * w; o[1] = a * w; },
        mapImp(L.timp, function (q) { return { t: q.t, re: q.re, im: q.im, order: (q.order || 0) + 1 }; }),
        function (W) {
          return mapImp(L.wimp(W), function (q) {
            return { w: q.w, re: -q.im * q.w, im: q.re * q.w };
          });
        },
        {
          opName: '时域微分', opFormula: 'jωX(jω)', reconstruct: true,
          note: '幅度谱乘 |ω| 后高频段翘起；相位谱整体加 π/2（ω<0 处减 π/2）。间断点处导数是冲激，所以波形由频谱逆变换重建，尖峰两侧的 ringing 属正常。'
        }
      );
    }
  };

  /* --------------------------------------------------------------- 积分 */
  PROP.integ = {
    id: 'integ', name: '时域积分', en: 'Integration', sec: '4.3.4', short: '积分 ∫x dτ',
    formula: '∫_{-∞}^{t}x(τ)dτ  (1/jω)X(jω) + πX(0)δ(ω)',
    quote: '低频通过、高频压制 —— 就是低通。',
    desc: '积分 = 频域除 jω，再补一个直流冲激 πX(0)δ(ω)。X(0)=∫x(t)dt 是频谱在零频的值，漏掉这一项是这门课最经典的错误。',
    params: [],
    reconstructTime: true,
    apply: function (L, p) {
      var o0 = [0, 0];
      L.Xfn(0, o0);
      var dcRe = PI * o0[0], dcIm = PI * o0[1];   /* X(0) 取频谱正则部分 */
      var hasDcLine = L.wimp(1e-9).length > 0;

      return FT.makeLayer(
        L.xfn,
        function (w, o) {
          L.Xfn(w, o);
          var a = o[0], b = o[1];
          if (Math.abs(w) < 1e-12) { o[0] = 0; o[1] = 0; return; }
          /* (a+jb)/(jw) = b/w − j·a/w */
          o[0] = b / w; o[1] = -a / w;
        },
        [],
        function (W) {
          var out = mapImp(L.wimp(W), function (q) {
            if (Math.abs(q.w) < 1e-12) return null;   /* 直流谱线积分后成为斜坡，无法用冲激表示 */
            return { w: q.w, re: q.im / q.w, im: -q.re / q.w };
          });
          if ((Math.abs(dcRe) + Math.abs(dcIm) > 1e-9) && 0 <= W) out.push({ w: 0, re: dcRe, im: dcIm });
          return cap(out);
        },
        {
          opName: '时域积分', opFormula: '(1/jω)X(jω)+πX(0)δ(ω)', reconstruct: true,
          note: '幅度谱按 1/|ω| 压低高频；ω=0 处出现 πX(0) 这根直流谱线（X(0)=∫x(t)dt，就是时域面积）。波形由频谱逆变换重建。' +
            (hasDcLine ? ' 原信号含直流谱线，积分后它会变成随时间增长的斜坡，图中无法用冲激表示，已略去。' : '')
        }
      );
    }
  };

  /* ------------------------------------------------------------ 频域微分 */
  PROP.fdiff = {
    id: 'fdiff', name: '频域微分', en: 'Frequency Differentiation', sec: '4.3.6', short: '频域微分 t·x',
    formula: 't·x(t)  j·dX(jω)/dω',
    quote: '乘个 t，等价于对频率求导。',
    desc: '时域乘 t ⟺ 频域求导再乘 j。求导会放大频谱的起伏，所以 Sa 型频谱的导数在主瓣边缘最陡。',
    params: [],
    apply: function (L, p) {
      return FT.makeLayer(
        function (t, o) { L.xfn(t, o); o[0] *= t; o[1] *= t; },
        function (w, o) {
          var h = 1e-4 * Math.max(1, Math.abs(w));
          var a = [0, 0], b = [0, 0];
          L.Xfn(w + h, a); L.Xfn(w - h, b);
          var dre = (a[0] - b[0]) / (2 * h), dim = (a[1] - b[1]) / (2 * h);
          o[0] = -dim; o[1] = dre;   /* j·dX/dω */
        },
        [],
        function (W) { return []; },
        {
          opName: '频域微分', opFormula: 'j·dX(jω)/dω',
          note: '时域是精确的 t·x(t)；频谱用中心差分对 X(jω) 求导。冲激谱线求导会变成冲激偶，这里不画谱线。'
        }
      );
    }
  };

  /* --------------------------------------------------------------- 对偶 */
  PROP.dual = {
    id: 'dual', name: '对偶性', en: 'Duality', sec: '4.3.7', short: '对偶',
    formula: 'x₁(t)  X₁(jω) ⇒ x₂(t)=X₁(jt)  X₂(jω)=2πx₁(-ω)',
    quote: '武林秘籍中的万金油。',
    desc: '若 x₁(t) ↔ X₁(jω)，则把 X₁ 的表达式中的 ω 换成 t 作为新信号 x₂(t)，它的频谱就是 2πx₁(−ω)。门 ↔ Sa、Sa ↔ 门、冲激串 ↔ 冲激串，全靠它一次推完。',
    params: [],
    apply: function (L, p) {
      var dualTimp = mapImp(cap(L.wimp(80)), function (q) { return { t: q.w, re: q.re, im: q.im, order: 0 }; });
      return FT.makeLayer(
        /* 新的时域 = 旧的频谱（正则部分） */
        function (t, o) { L.Xfn(t, o); },
        /* 新的频谱 = 2π·旧的时域(−ω) */
        function (w, o) { L.xfn(-w, o); o[0] *= TAU; o[1] *= TAU; },
        dualTimp,
        function (W) {
          return mapImp(L.timp, function (q) {
            return { w: -q.t, re: TAU * q.re, im: TAU * q.im };
          }).filter(function (q) { return Math.abs(q.w) <= W; });
        },
        {
          opName: '对偶性', opFormula: 'X(jt)  2πx(-ω)',
          note: '对偶把「时域矩形 ⟷ 频域 Sa」和「时域 Sa ⟷ 频域矩形」看成同一件事的两面。带冲激谱线的信号对偶后变成时域冲激串。'
        }
      );
    }
  };

  /* ------------------------------------------------------- 调制（乘 cos） */
  PROP.modulate = {
    id: 'modulate', name: '幅度调制', en: 'Multiplication by cos', sec: '4.5', short: '乘 cos ω₀t',
    formula: 'x(t)cos(ω₀t)  (1/2)[X(j(ω-ω₀))+X(j(ω+ω₀))]',
    quote: '通信传输的基础。',
    desc: '相乘性质最常用的一次：载波把频谱复制成两份搬到 ±ω₀，每份幅度减半。ω₀ 太小两份会叠在一起 —— 那就是频谱混叠。',
    params: [{ key: 'w0', label: 'ω₀', min: 0.5, max: 14, step: 0.1, def: 5, desc: '载波角频率' }],
    apply: function (L, p) {
      var w0 = p.w0;
      return FT.makeLayer(
        function (t, o) { L.xfn(t, o); o[0] *= Math.cos(w0 * t); o[1] *= Math.cos(w0 * t); },
        function (w, o) {
          var a = [0, 0], b = [0, 0];
          L.Xfn(w - w0, a); L.Xfn(w + w0, b);
          o[0] = 0.5 * (a[0] + b[0]); o[1] = 0.5 * (a[1] + b[1]);
        },
        mapImp(L.timp, function (q) { return { t: q.t, re: q.re * Math.cos(w0 * q.t), im: q.im * Math.cos(w0 * q.t), order: q.order || 0 }; }),
        function (W) {
          var out = [];
          var src = L.wimp(Math.abs(W) + Math.abs(w0) + 1);
          for (var i = 0; i < src.length; i++) {
            var q = src[i];
            out.push({ w: q.w + w0, re: 0.5 * q.re, im: 0.5 * q.im });
            out.push({ w: q.w - w0, re: 0.5 * q.re, im: 0.5 * q.im });
          }
          return cap(out.filter(function (v) { return Math.abs(v.w) <= W; }));
        },
        { opName: '幅度调制', opFormula: '(1/2)[X(j(ω-ω₀))+X(j(ω+ω₀))]', note: '两份复制、各减半。要能无失真搬移，需要 ω₀ 大于信号最高频率，否则正负搬移的两份会重叠。' }
      );
    }
  };

  /* ------------------------------------------------------- 理想抽样 */
  PROP.sample = {
    id: 'sample', name: '理想抽样', en: 'Impulse Sampling', sec: '4.5 应用', short: '乘冲激串',
    formula: 'x(t)Σδ(t-nT)  (1/T)ΣX[j(ω-2πk/T)]',
    quote: '采样定理的全部，就这一行。',
    desc: '时域乘冲激串 = 取值打包；频域变成原频谱以 2π/T 为间隔的无穷复制。T 太大（采样太稀）复制品就会互相重叠。',
    params: [{ key: 'T', label: 'T', min: 0.4, max: 6, step: 0.05, def: 1.2, desc: '抽样周期' }],
    apply: function (L, p) {
      var T = p.T, ws = TAU / T;
      var K = Math.ceil(40 / ws) + 4;
      return FT.makeLayer(
        function (t, o) { o[0] = 0; o[1] = 0; },
        function (w, o) {
          var sr = 0, si = 0, a = [0, 0];
          for (var k = -K; k <= K; k++) {
            L.Xfn(w - k * ws, a);
            sr += a[0]; si += a[1];
          }
          o[0] = sr / T; o[1] = si / T;
        },
        (function () {
          var out = [], n = Math.ceil(20 / T);
          for (var k = -n; k <= n; k++) {
            var a = [0, 0];
            L.xfn(k * T, a);
            out.push({ t: k * T, re: a[0], im: a[1], order: 0 });
          }
          return out;
        })(),
        function (W) {
          var out = [], base = L.wimp(Math.abs(W) + (K + 1) * ws);
          for (var k = -K; k <= K; k++) {
            for (var i = 0; i < base.length; i++) {
              var q = base[i], wq = q.w + k * ws;
              if (Math.abs(wq) <= W) out.push({ w: wq, re: q.re / T, im: q.im / T });
            }
          }
          return cap(out);
        },
        { opName: '理想抽样', opFormula: '(1/T)ΣX[j(ω-2πk/T)]', specOnly: true, note: '抽样后频谱以 2π/T 周期复制、幅度乘 1/T。想无失真恢复，需要 2π/T 大于信号带宽的两倍 —— 这就是奈奎斯特。' }
      );
    }
  };

  PROP.LIST = ORDER.map(function (k) { return PROP[k]; });

  FT.propById = function (id) { return PROP[id] || null; };

  /* 理想低通算子（调制/采样/系统专题共用） */
  FT.lpf = function (L, W, gain) {
    var kk = gain === undefined ? 1 : gain;
    return FT.makeLayer(
      L.xfn,
      function (w, o) {
        L.Xfull(w, o);
        if (Math.abs(w) >= W) { o[0] = 0; o[1] = 0; return; }
        o[0] *= kk; o[1] *= kk;
      },
      [],
      function (W2) { return L.wimp(Math.max(W2, W)).filter(function (q) { return Math.abs(q.w) < W; }); },
      { opName: '理想低通 |ω|<' + UItrim(W), reconstruct: true }
    );
  };
  function UItrim(v) { return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2); }

  FT.scaled = function (L, k) {
    return FT.makeLayer(
      function (t, o) { L.xfn(t, o); o[0] *= k; o[1] *= k; },
      function (w, o) { L.Xfull(w, o); o[0] *= k; o[1] *= k; },
      L.timp.map(function (q) { return { t: q.t, re: q.re * k, im: q.im * k, order: q.order || 0 }; }),
      function (W) { return L.wimp(W).map(function (q) { return { w: q.w, re: q.re * k, im: q.im * k }; }); },
      { opName: '×' + UItrim(k), reconstruct: false }
    );
  };

})(window);
