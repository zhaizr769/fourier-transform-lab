/* ==========================================================================
   propsview.js —— 表 4.1 性质卡片：公式 + 金句 + 实算「变换前 → 变换后」缩略图
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML, C = FT.COLORS;
  var PI = Math.PI, TAU = 2 * Math.PI;

  /* 每个性质挑一个最能说明问题的示例信号 */
  var DEMO = {
    shift: { sig: 'gate', p: { T1: 1.2 }, tmax: 8, wmax: 12 },
    freqshift: { sig: 'gate', p: { T1: 1 }, tmax: 6, wmax: 18 },
    reverse: { sig: 'exp1s', p: { a: 1 }, tmax: 8, wmax: 14 },
    scale: { sig: 'gate', p: { T1: 2 }, tmax: 8, wmax: 14 },
    conj: { sig: 'cexp', p: { w0: 3 }, tmax: 8, wmax: 12 },
    diff: { sig: 'gate', p: { T1: 1.2 }, tmax: 6, wmax: 16 },
    integ: { sig: 'gate', p: { T1: 1.2 }, tmax: 6, wmax: 16 },
    fdiff: { sig: 'expabs', p: { a: 1.2 }, tmax: 6, wmax: 12 },
    modulate: { sig: 'gate', p: { T1: 1 }, tmax: 6, wmax: 22 },
    sample: { sig: 'tri', p: { tau: 2.5 }, tmax: 6, wmax: 14 },
    dual: { sig: 'gate', p: { T1: 1.5 }, tmax: 10, wmax: 6 }
  };

  /* 表 4.1 里还包含卷积/相乘/帕塞瓦尔，用整行说明卡补上 */
  var EXTRA = [
    {
      id: 'conv', name: '卷积', en: 'Convolution', sec: '4.4',
      formula: 'x(t)*h(t)  X(jω)·H(jω)',
      quote: '时域卷起来，频域乘起来 —— LTI 系统分析的全部。',
      desc: '卷积在时域里又是翻转又是平移又是积分，最难算；可一旦变到频域就退化成普通乘法。所以「求零状态响应」的标准流程是：X → 乘 H → 逆变换。',
      link: 'sys'
    },
    {
      id: 'mult', name: '相乘', en: 'Multiplication', sec: '4.5',
      formula: 'x₁(t)x₂(t)  (1/2π)[X₁(jω)*X₂(jω)]',
      quote: '通信传输的基础。',
      desc: '和卷积性质正好对偶，注意前面那个 1/2π。时域相乘 = 频谱搬移/混叠，调制、解调、采样定理都建立在这一条上。',
      link: 'mod'
    },
    {
      id: 'parseval', name: '帕塞瓦尔定理', en: 'Parseval', sec: '4.3.8',
      formula: '∫_{-∞}^{+∞}|x(t)|²dt = (1/2π)∫_{-∞}^{+∞}|X(jω)|²dω',
      quote: '自然定律，能量守恒。',
      desc: '时域能量等于频域能量除以 2π。它给了「频谱密度」一个物理单位，也是噪声带宽、3 dB 带宽这些工程概念的依据。',
      link: 'topics'
    },
    {
      id: 'sym', name: '共轭对称性', en: 'Conjugate Symmetry', sec: '4.3.3',
      formula: 'x(t)=x*(t) ⇒ X(jω)=X*(-jω)',
      quote: '实信号 ⟹ 模偶、相位奇、实部偶、虚部奇。',
      desc: '偶部 ⟷ 实部，奇部 ⟷ 虚部（注意 x_o(t) 的变换是 jX_o(jω)，别丢掉那个 j）。这一条能省掉一半计算：只要画 ω>0，另一半对称出来。',
      link: 'lab'
    }
  ];

  var host;

  function miniSpec(r, kind) {
    var d = r.derived;
    if (kind === 'time') {
      return { xmin: r.t[0], xmax: r.t[r.t.length - 1], series: [{ x: r.t, y: r.xre, color: C.x, width: 1.5 }] };
    }
    if (kind === 'mag') {
      return {
        xmin: r.w[0], xmax: r.w[r.w.length - 1],
        series: [{ x: r.w, y: d.mag, color: C.mag, width: 1.5 }],
        impulses: r.wimp.map(function (q) { return { x: q.w, y: Math.hypot(q.re, q.im), color: C.mag }; })
      };
    }
    return {
      xmin: r.w[0], xmax: r.w[r.w.length - 1],
      series: [{ x: r.w, y: d.ph, color: C.phase, width: 1.5 }]
    };
  }

  function buildCard(op) {
    var demo = DEMO[op.id] || { sig: 'gate', p: { T1: 1 }, tmax: 6, wmax: 14 };
    var card = UI.el('article', { class: 'prop-card', 'data-prop': op.id });

    var top = UI.el('div', { class: 'prop-top' });
    top.appendChild(UI.el('span', { class: 'prop-sec', text: op.sec }));
    top.appendChild(UI.el('span', { class: 'prop-name', text: op.name }));
    top.appendChild(UI.el('span', { class: 'prop-en', text: op.en }));
    card.appendChild(top);

    card.appendChild(UI.el('div', { class: 'prop-formula', innerHTML: UI.renderMath(op.formula) }));
    if (op.quote) card.appendChild(UI.el('div', { class: 'prop-quote', text: '“' + op.quote + '”' }));
    card.appendChild(UI.el('div', { class: 'prop-desc', text: op.desc || '' }));

    var demoBox = UI.el('div', { class: 'prop-demo' });
    var mk = function (cap) {
      var b = UI.el('div', { class: 'mini-chart' });
      b.appendChild(UI.el('div', { class: 'cap', html: '<span>' + cap[0] + '</span><span>' + cap[1] + '</span>' }));
      var cv = UI.el('canvas');
      b.appendChild(cv);
      demoBox.appendChild(b);
      return cv;
    };
    var cvT = mk(['时域 x(t)', '灰=前 / 蓝=后']);
    var cvM = mk(['幅度谱 |X(jω)|', '灰=前 / 橙=后']);
    var cvP = mk(['相位谱 ∠X(jω)', '灰=前 / 紫=后']);
    card.appendChild(demoBox);

    var foot = UI.el('div', { class: 'prop-foot' });
    var sel = UI.el('select', { title: '换一个示例信号试试' });
    var candidates = ['gate', 'exp1s', 'expabs', 'tri', 'sincW', 'cosw', 'step', 'cexp', 'periodicRect', 'sgn'];
    candidates.forEach(function (id) {
      var s = FT.getSignal(id);
      sel.appendChild(UI.el('option', { value: id, text: s.name, selected: id === demo.sig }));
    });
    var cur = demo.sig;
    sel.addEventListener('change', function () { cur = sel.value; redraw(); });
    foot.appendChild(UI.el('span', { class: 'prop-sigsel' }, [document.createTextNode('示例信号 ')]));
    foot.querySelector('.prop-sigsel').appendChild(sel);
    foot.appendChild(UI.el('button', {
      class: 'btn btn-tiny btn-primary', text: '载入实验台',
      onclick: function () {
        var st = FT.Lab.state;
        st.sigId = cur;
        var s = FT.getSignal(cur);
        st.params = FT.defaultParams(s);
        if (s.window) { st.opts.wmax = s.window.wmax; st.opts.tmax = s.window.tmax; }
        st.chain = [{ id: op.id, params: (function () { var p = {}; (op.params || []).forEach(function (d) { p[d.key] = d.def; }); return p; })() }];
        FT.Lab.pick(cur);
        FT.UI.go('lab');
        UI.toast('已把「' + op.name + '」载入实验台');
      }
    }));
    card.appendChild(foot);

    function redraw() {
      var sig = FT.getSignal(cur);
      var p = FT.defaultParams(sig);
      if (cur === demo.sig) Object.keys(demo.p).forEach(function (k) { p[k] = demo.p[k]; });
      var base = FT.buildBaseLayer(sig, p);
      if (!base) return;
      var op2 = FT.propById(op.id);
      var pp = {}; (op2.params || []).forEach(function (d) { pp[d.key] = d.def; });
      var after = op2.apply(base, pp);
      var tmax = demo.tmax, wmax = demo.wmax;
      if (op.id === 'scale') tmax = 4;
      if (op.id === 'modulate' || op.id === 'freqshift') wmax = 24;
      var opt = { tmin: -tmax, tmax: tmax, Nt: 240, wmin: -wmax, wmax: wmax, Nw: 320, wmaxAbs: wmax, reconstructTime: false };
      var optR = JSON.parse(JSON.stringify(opt)); optR.reconstructTime = op2.reconstructTime || false;
      var rb = FT.render(base, opt); rb.derived = quick(rb);
      var ra = FT.render(after, optR); ra.derived = quick(ra);
      mix(cvT, rb, ra, 'time');
      mix(cvM, rb, ra, 'mag');
      mix(cvP, rb, ra, 'phase');
    }
    function quick(r) {
      var n = r.w.length, mag = new Float64Array(n), ph = new Float64Array(n);
      for (var i = 0; i < n; i++) {
        mag[i] = Math.hypot(r.Xre[i], r.Xim[i]);
        ph[i] = mag[i] < 1e-9 ? NaN : Math.atan2(r.Xim[i], r.Xre[i]);
      }
      return { mag: mag, ph: ph };
    }
    function mix(cv, a, b, kind) {
      var sa = miniSpec(a, kind), sb = miniSpec(b, kind);
      var spec = {
        xmin: Math.min(sa.xmin, sb.xmin), xmax: Math.max(sa.xmax, sb.xmax),
        series: [
          { x: sa.series[0].x, y: sa.series[0].y, color: C.ghost, width: 1.3, dash: [4, 3] },
          { x: sb.series[0].x, y: sb.series[0].y, color: sa.series[0].color, width: 1.6 }
        ],
        impulses: (kind === 'mag') ? sb.impulses.concat(sa.impulses) : []
      };
      FT.miniDraw(cv, spec);
    }

    requestAnimationFrame(redraw);
    return card;
  }

  function buildExtraCard(e) {
    var card = UI.el('article', { class: 'prop-card' });
    var top = UI.el('div', { class: 'prop-top' });
    top.appendChild(UI.el('span', { class: 'prop-sec', text: e.sec }));
    top.appendChild(UI.el('span', { class: 'prop-name', text: e.name }));
    top.appendChild(UI.el('span', { class: 'prop-en', text: e.en }));
    card.appendChild(top);
    card.appendChild(UI.el('div', { class: 'prop-formula', innerHTML: UI.renderMath(e.formula) }));
    card.appendChild(UI.el('div', { class: 'prop-quote', text: '“' + e.quote + '”' }));
    card.appendChild(UI.el('div', { class: 'prop-desc', text: e.desc }));
    var foot = UI.el('div', { class: 'prop-foot' });
    foot.appendChild(UI.el('button', {
      class: 'btn btn-tiny btn-primary', text: e.link === 'lab' ? '在实验台验证' : '打开对应模块',
      onclick: function () { FT.UI.go(e.link); }
    }));
    card.appendChild(foot);
    return card;
  }

  FT.PropsView = {
    render: function () {
      host = host || document.getElementById('propsGrid');
      if (!host.childNodes.length) {
        FT.PROP.LIST.forEach(function (op) { host.appendChild(buildCard(op)); });
        EXTRA.forEach(function (e) { host.appendChild(buildExtraCard(e)); });
      }
    }
  };

})(window);
