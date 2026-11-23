
/* ===== math.js ===== */
/* ==========================================================================
   math.js —— 轻量数学排版（LaTeX 子集，纯 HTML/CSS，无外部依赖）
   支持：\frac{}{}  ^{}  _{}  \int_{}^{}  \sum_{}^{}  \begin{cases}
        \sqrt{}  \text/\mathrm/\operatorname  符号表  自动斜体
   ========================================================================== */
(function (global) {
  'use strict';

  var SYM = {
    omega: 'ω', Omega: 'Ω', delta: 'δ', Delta: 'Δ', alpha: 'α', Alpha: 'Α',
    beta: 'β', Gamma: 'Γ', gamma: 'γ', theta: 'θ', Theta: 'Θ', lambda: 'λ',
    Lambda: 'Λ', mu: 'μ', Mu: 'Μ', nu: 'ν', xi: 'ξ', Xi: 'Ξ',
    pi: 'π', Pi: 'Π', rho: 'ρ', Rho: 'Ρ', sigma: 'σ', Sigma: 'Σ', tau: 'τ',
    Tau: 'Τ', upsilon: 'υ', Upsilon: 'Υ', phi: 'φ', varphi: 'φ', Phi: 'Φ',
    chi: 'χ', Chi: 'Χ', psi: 'ψ', Psi: 'Ψ', zeta: 'ζ', Zeta: 'Ζ', eta: 'η',
    varepsilon: 'ε', Epsilon: 'Ε', iota: 'ι', kappa: 'κ', omicron: 'ο',
    /* 运行变量哨兵：\Tv = 时间变量 t，\Wv = 频率变量 ω
       （公式复合只替换这两个哨兵，参数 \omega_0、T_1 等不受影响） */
    Tv: 't', Wv: 'ω',
    infty: '∞', partial: '∂',
    rightarrow: '→', to: '→',longrightarrow: '⟶', rightarrowtail: '→',
    leftarrow: '←', longleftarrow: '⟵', leftrightarrow: '↔',
    Rightarrow: '⇒', Leftrightarrow: '⇔', mapsto: '↦', updownarrow: '↕',
    pm: '±', mp: '∓', times: '×', cdot: '·', div: '÷', ast: '*',
    star: '★', circ: '∘', bullet: '•',
    le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
    approx: '≈', equiv: '≡', sim: '∼', propto: '∝',
    in: '∈', notin: '∉', subset: '⊂', cup: '∪', cap: '∩',
    ldots: '…', cdots: '⋯', dots: '…', quad: ' ', qquad: '  ',
    angle: '∠', perp: '⊥', langle: '⟨', rangle: '⟩',
    lceil: '⌈', rceil: '⌉', lfloor: '⌊', rfloor: '⌋',
    forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨',
    overline: '‾', underline: '_', hat: '^', degree: '°',
    mathcal: '', ell: 'ℓ', hbar: 'ℏ', wp: '℘', Re: 'Re', Im: 'Im'
  };

  var UPRIGHT_WORDS = {
    Re: 'Re', Im: 'Im', re: 'Re', im: 'Im', arg: 'arg', deg: 'deg',
    gcd: 'gcd', lb: 'lb', lg: 'lg', ln: 'ln', log: 'log', max: 'max',
    min: 'min', sgn: 'sgn', sinc: 'sinc', Sa: 'Sa', rect: 'rect',
    tri: 'tri', tg: 'tg', ctg: 'ctg', arctan: 'arctan', arcsin: 'arcsin',
    sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
    sinh: 'sinh', cosh: 'cosh', tanh: 'tanh', exp: 'exp', lim: 'lim',
    mod: 'mod', sup: 'sup', inf: 'inf', diag: 'diag', Tr: 'Tr'
  };

  var BIG_OPS = { sum: 'Σ', prod: 'Π', int: '∫', iint: '∬', oint: '∮', lim: 'lim', coprod: '∐' };

  function esc(ch) {
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '&') return '&amp;';
    if (ch === '"') return '&quot;';
    return ch;
  }

  function Parser(src) { this.s = src; this.i = 0; }

  Parser.prototype.peek = function () { return this.i < this.s.length ? this.s[this.i] : ''; };

  Parser.prototype.eat = function () { return this.s[this.i++]; };

  /* 读取一个 group：以 { 开始，读到匹配的 } */
  Parser.prototype.readGroup = function () {
    if (this.peek() !== '{') return null;
    this.eat();
    var depth = 1, out = '';
    while (this.i < this.s.length) {
      var c = this.eat();
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (!depth) break; }
      out += c;
    }
    return out;
  };

  /* 读取一个原子（用于 ^ \u005f 的单字符形式） */
  Parser.prototype.readArg = function () {
    var c = this.peek();
    if (c === '{') return this.readGroup();
    this.eat();
    if (c === '\\') { this.i--; return '\\' + this.readCmdName(); }
    return c;
  };

  Parser.prototype.readCmdName = function () {
    var n = '';
    while (this.i < this.s.length && /[a-zA-Z]/.test(this.s[this.i])) n += this.eat();
    return n;
  };

  /* 解析一段，直到遇到 stop 字符（顶层传 ''） */
  Parser.prototype.parseUntil = function (stops) {
    var out = '';
    while (this.i < this.s.length) {
      var c = this.peek();
      if (stops.indexOf(c) >= 0) break;
      out += this.parseAtom();
    }
    return out;
  };

  Parser.prototype.parseAtom = function () {
    var c = this.peek();

    if (c === '\\') { this.eat(); return this.parseCommand(); }

    if (c === '{') {
      var inner = this.readGroup();
      var sub = this.parseScript();
      return '<span class="mgrp">' + new Parser(inner).parseUntil('') + '</span>' + sub;
    }

    this.eat();

    if (c === ' ' || c === '~') return '<span class="mspace"></span>';
    if (/[0-9.]/.test(c)) return '<span class="num">' + esc(c) + '</span>';
    if (/[a-zA-Z]/.test(c)) return esc(c); /* 默认斜体 */
    if ('+-=<>/*(),;:!|'.indexOf(c) >= 0) {
      var sym = c === '-' ? '−' : (c === '*' ? '∗' : c);
      return '<span class="op">' + esc(sym) + '</span>';
    }
    if (c === '[') return '<span class="pun">[</span>';
    if (c === ']') return '<span class="pun">]</span>';
    if (c === '#') return '<span class="pun">#</span>';
    return '<span class="pun">' + esc(c) + '</span>';
  };

  Parser.prototype.parseScript = function () {
    var sub = null, sup = null, guard = 0;
    while (guard++ < 4) {
      var c = this.peek();
      if (c === '_') { this.eat(); sub = this.readArg(); }
      else if (c === '^') { this.eat(); sup = this.readArg(); }
      else break;
    }
    if (sub === null && sup === null) return '';
    var render = function (txt) { return new Parser(txt).parseUntil(''); };
    if (sub !== null && sup !== null) {
      return '<span class="msubsup"><span class="sup">' + render(sup) +
             '</span><span class="sub">' + render(sub) + '</span></span>';
    }
    if (sup !== null) return '<span class="msup">' + render(sup) + '</span>';
    return '<span class="msub">' + render(sub) + '</span>';
  };

  Parser.prototype.parseCommand = function () {
    var name = this.readCmdName();
    if (!name) {
      var ch = this.eat(); /* \{ \} \| \, \; \% \_ 等 */
      if (ch === ',' || ch === ';' || ch === '!') return '<span class="mspace"></span>';
      if (ch === '%') return '<span class="num">%</span>';
      if (ch === '_') return '<span class="op">_</span>';
      if (ch === '\\') return '<br>';
      return '<span class="pun">' + esc(ch) + '</span>';
    }

    if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
      var a = this.readArgOrGroup(), b = this.readArgOrGroup();
      return '<span class="mfrac"><span class="mnum">' + sub(a) + '</span>' +
             '<span class="mden">' + sub(b) + '</span></span>';
    }

    if (name === 'sqrt') {
      var rad = this.readArgOrGroup();
      return '<span class="msqrt"><span class="mroot">√</span><span class="mrad">' + sub(rad) + '</span></span>';
    }

    if (name === 'text' || name === 'mathrm' || name === 'mathbf' || name === 'operatorname' ||
        name === 'mbox' || name === 'mathit' || name === 'mathsf') {
      var txt = this.readGroup() || '';
      var cls = (name === 'mathit') ? 'mxin' : 'fn';
      return '<span class="' + cls + '">' + txt.replace(/[{}]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
    }

    if (name === 'begin') { return this.beginEnvironment(); }
    if (name === 'end') { this.readGroup(); return ''; }

    if (name === 'left' || name === 'right') {
      var d = this.eat();
      if (d === '\\') { this.eat(); return ''; }
      if (d === '.') { return ''; }
      return '<span class="pun">' + esc(d) + '</span>';
    }

    if (BIG_OPS[name]) {
      var glyph = BIG_OPS[name];
      var lo = null, hi = null;
      if (this.peek() === '_') { this.eat(); lo = this.readArg(); }
      if (this.peek() === '^') { this.eat(); hi = this.readArg(); }
      if (lo !== null || hi !== null) {
        return '<span class="mbop"><span class="btop">' + (hi === null ? '' : sub(hi)) + '</span>' +
               '<span class="bglyph mbig">' + glyph + '</span>' +
               '<span class="bbot">' + (lo === null ? '' : sub(lo)) + '</span></span>';
      }
      return '<span class="mbig">' + glyph + '</span>';
    }

    if (name === 'cases') { return this.casesBody(); }

    if (UPRIGHT_WORDS[name] !== undefined && UPRIGHT_WORDS[name]) {
      return '<span class="fn">' + UPRIGHT_WORDS[name] + '</span>';
    }

    if (SYM[name] !== undefined) {
      var g = SYM[name];
      if (!g) return '';
      return '<span class="gr">' + esc(g) + '</span>';
    }

    /* 未知命令：原样输出，便于发现拼写错误 */
    return '<span class="mxunk">' + esc(name) + '</span>';
  };

  Parser.prototype.readArgOrGroup = function () {
    while (this.peek() === ' ') this.eat();
    if (this.peek() === '{') return this.readGroup();
    if (this.peek() === '\\') { this.eat(); return '\\' + this.readCmdName(); }
    return this.eat();
  };

  Parser.prototype.beginEnvironment = function () {
    var env = this.readGroup();
    if (env === 'cases') return this.casesBody();
    if (env === 'aligned' || env === 'array' || env === 'matrix') {
      /* 简化：按行/列拆开，用 flex 网格渲染 */
      return this.tabularBody(env);
    }
    return '';
  };

  Parser.prototype.casesBody = function () {
    var rows = this.readRowsUntilEnd('cases');
    var html = '<span class="mcases"><span class="brace">{</span><span class="rows">';
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r];
      html += '<span class="row">';
      for (var k = 0; k < cells.length; k++) {
        html += '<span class="cell">' + sub(cells[k]) + '</span>';
      }
      html += '</span>';
    }
    html += '</span></span>';
    return html;
  };

  Parser.prototype.tabularBody = function (env) {
    var rows = this.readRowsUntilEnd(env);
    var html = '<span class="mgrid"><span class="rows">';
    for (var r = 0; r < rows.length; r++) {
      html += '<span class="row">';
      for (var k = 0; k < rows[r].length; k++) html += '<span class="cell">' + sub(rows[r][k]) + '</span>';
      html += '</span>';
    }
    return html + '</span></span>';
  };

  /* 读取 \begin{env} ... \end{env} 之间的内容，按 \\ 分行、& 分列 */
  Parser.prototype.readRowsUntilEnd = function (env) {
    var buf = '', depth = 0;
    while (this.i < this.s.length) {
      if (this.s[this.i] === '\\' && this.s[this.i + 1] === 'e' && /^\\end\{/.test(this.s.slice(this.i))) {
        var save = this.i;
        this.eat();
        var nm = this.readCmdName();
        var grp = this.readGroup();
        if (nm === 'end' && grp === env) break;
        this.i = save;
        buf += this.eat();
        continue;
      }
      var c = this.eat();
      if (c === '{') depth++;
      if (c === '}') depth--;
      if (c === '\\' && this.peek() === '\\') { this.eat(); buf += '\u0001'; continue; }
      buf += c;
    }
    var rows = buf.split('\u0001').map(function (row) {
      return row.split('&').map(function (cell) { return cell; });
    });
    /* 去掉尾部空行 */
    while (rows.length && rows[rows.length - 1].every(function (x) { return /^\s*$/.test(x); })) rows.pop();
    return rows;
  };

  function sub(src) { return new Parser(src).parseUntil(''); }

  var cache = {};
  function mml(src) {
    if (typeof src !== 'string') return '';
    if (cache[src] !== undefined) return cache[src];
    var out = '<span class="mx">' + sub(src) + '</span>';
    if (Object.keys(cache).length > 4000) cache = {};
    cache[src] = out;
    return out;
  }

  /* 纯文本（用于 canvas 标题等） */
  function mmlPlain(src) {
    var tmp = document.createElement('div');
    tmp.innerHTML = mml(src);
    return (tmp.textContent || '').replace(/\u00a0/g, ' ').trim();
  }

  global.MML = { render: mml, plain: mmlPlain, sym: SYM };
})(window);


/* ===== core.js ===== */
/* ==========================================================================
   core.js —— 复数运算、傅里叶层（Layer）、数值正反变换、表达式解析
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT = {};
  var PI = Math.PI, TAU = 2 * Math.PI;

  /* ---------------------------------------------------------------- 复数 */
  FT.C = function (re, im) { return { re: re || 0, im: im || 0 }; };
  FT.cadd = function (a, b) { return { re: a.re + b.re, im: a.im + b.im }; };
  FT.cneg = function (a) { return { re: -a.re, im: -a.im }; };
  FT.cconj = function (a) { return { re: a.re, im: -a.im }; };
  FT.cmul = function (a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; };
  FT.cdiv = function (a, b) {
    var d = b.re * b.re + b.im * b.im;
    if (!d) return { re: 0, im: 0 };
    return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
  };
  FT.cabs = function (a) { return Math.hypot(a.re, a.im); };
  FT.carg = function (a) { return Math.atan2(a.im, a.re); };
  FT.cexp = function (theta) { return { re: Math.cos(theta), im: Math.sin(theta) }; };

  /* 就地乘法：out = a * b，a/b/out 均为 [re,im] 数组 */
  function mulInto(a, b, out) {
    var ar = a[0], ai = a[1], br = b[0], bi = b[1];
    out[0] = ar * br - ai * bi;
    out[1] = ar * bi + ai * br;
    return out;
  }
  FT.mulInto = mulInto;

  /* ---------------------------------------------------------------- 网格 */
  function linspace(a, b, n) {
    var g = new Float64Array(n), h = (b - a) / (n - 1);
    for (var i = 0; i < n; i++) g[i] = a + i * h;
    return g;
  }
  FT.linspace = linspace;

  /* ------------------------------------------------- Layer：一层信号状态
     xfn(t, out)   时域正则部分（复数）
     Xfn(w, out)   频域正则部分（复数）
     timp          [{t, re, im}]  时域冲激
     wimp(W)       [{w, re, im}]  频域冲激（|w|<=W）
     meta          {name, formulaT, formulaX, notes, flags}
  ------------------------------------------------------------------ */
  FT.makeLayer = function (xfn, Xfn, timp, wimp, meta) {
    return {
      xfn: xfn,
      Xfn: Xfn,
      timp: timp || [],
      wimp: wimp || function () { return []; },
      meta: meta || {},
      /* 完整频谱（正则 + 时域冲激的贡献）。order>=1 表示冲激偶：δ'(t-t0) ⟷ jω e^{-jωt0} */
      Xfull: function (w, out) {
        this.Xfn(w, out);
        var tp = this.timp || [];
        for (var i = 0; i < tp.length; i++) {
          var p = tp[i], ord = p.order || 0;
          var c = Math.cos(-w * p.t), s = Math.sin(-w * p.t);
          var pr = p.re * c - p.im * s, pi = p.re * s + p.im * c;
          for (var q = 0; q < ord; q++) {
            /* 乘一次 jω */
            var nr = -pi * w, ni = pr * w;
            pr = nr; pi = ni;
          }
          out[0] += pr; out[1] += pi;
        }
        return out;
      }
    };
  };

  /* 计算某层的 X(0)（含冲激贡献，用于积分特性的 πX(0)δ(ω) 项） */
  FT.Xat0 = function (layer) {
    var o = [0, 0];
    layer.Xfull(0, o);
    var imps = layer.wimp(1e-9);
    for (var i = 0; i < imps.length; i++) if (Math.abs(imps[i].w) < 1e-9) o[0] += imps[i].re, o[1] += imps[i].im;
    return { re: o[0], im: o[1] };
  };

  /* ---------------------------------------------------- 数值反傅里叶变换
     x(t) = (1/2π) ∫ X(ω) e^{jωt} dω   —— 用 e^{jω_k t} 的递推避免逐点三角函数
  -------------------------------------------------------------------- */
  FT.inverseFT = function (Xre, Xim, w, t) {
    var Nw = w.length, Nt = t.length;
    var re = new Float64Array(Nt), im = new Float64Array(Nt);
    if (Nw < 2) return { re: re, im: im };
    var dw = w[1] - w[0];
    for (var n = 0; n < Nt; n++) {
      var tn = t[n];
      var step = Math.cos(dw * tn), stepI = Math.sin(dw * tn);
      /* 起点 e^{j w[0] t} */
      var cr = Math.cos(w[0] * tn), ci = Math.sin(w[0] * tn);
      var sr = 0, si = 0;
      for (var k = 0; k < Nw; k++) {
        var xk = Xre[k] * cr - Xim[k] * ci;
        var yk = Xre[k] * ci + Xim[k] * cr;
        sr += xk; si += yk;
        var ncr = cr * step - ci * stepI;
        ci = cr * stepI + ci * step;
        cr = ncr;
        /* 每 256 步重新归一化，抑制递推漂移 */
        if ((k & 255) === 255) {
          var m = 1 / Math.hypot(cr, ci);
          cr *= m; ci *= m;
        }
      }
      re[n] = sr * dw / TAU;
      im[n] = si * dw / TAU;
    }
    return { re: re, im: im };
  };

  /* ---------------------------------------------------- 数值正傅里叶变换
     X(ω) = ∫ x(t) e^{-jωt} dt
  -------------------------------------------------------------------- */
  FT.forwardFT = function (xre, xim, t, w) {
    var Nt = t.length, Nw = w.length;
    var re = new Float64Array(Nw), im = new Float64Array(Nw);
    if (Nt < 2) return { re: re, im: im };
    var dt = t[1] - t[0];
    for (var k = 0; k < Nw; k++) {
      var wk = w[k];
      var step = Math.cos(-wk * dt), stepI = Math.sin(-wk * dt);
      var cr = Math.cos(-wk * t[0]), ci = Math.sin(-wk * t[0]);
      var sr = 0, si = 0;
      for (var n = 0; n < Nt; n++) {
        sr += xre[n] * cr - xim[n] * ci;
        si += xre[n] * ci + xim[n] * cr;
        var ncr = cr * step - ci * stepI;
        ci = cr * stepI + ci * step;
        cr = ncr;
        if ((n & 255) === 255) { var m = 1 / Math.hypot(cr, ci); cr *= m; ci *= m; }
      }
      re[k] = sr * dt;
      im[k] = si * dt;
    }
    return { re: re, im: im };
  };

  /* 在网格上求值一个复函数 */
  FT.evalComplex = function (fn, grid) {
    var n = grid.length, re = new Float64Array(n), im = new Float64Array(n), o = [0, 0];
    for (var i = 0; i < n; i++) {
      fn(grid[i], o);
      var a = o[0], b = o[1];
      re[i] = isFinite(a) ? a : 0;
      im[i] = isFinite(b) ? b : 0;
    }
    return { re: re, im: im };
  };

  /* 反变换（含冲激谱线贡献）：x(t) = (1/2π)∫X e^{jωt}dω + (1/2π)Σ c_k e^{jω_k t} */
  FT.inverseWithImpulses = function (Xre, Xim, w, wimp, t) {
    var inv = FT.inverseFT(Xre, Xim, w, t);
    var re = inv.re, im = inv.im;
    var list = (wimp && wimp.length) ? wimp.slice(0, 400) : [];
    for (var q = 0; q < list.length; q++) {
      var wq = list[q].w, cr = list[q].re, ci = list[q].im;
      for (var n = 0; n < t.length; n++) {
        var c = Math.cos(wq * t[n]), s = Math.sin(wq * t[n]);
        re[n] += (cr * c - ci * s) / TAU;
        im[n] += (cr * s + ci * c) / TAU;
      }
    }
    return { re: re, im: im };
  };

  /* ---------------------------------------------------------- 采样渲染 */
  /* 把一个 Layer 采样成绘图数据。
     opts: {tmin,tmax,Nt, wmin,wmax,Nw, reconstructTime}
  ------------------------------------------------------------------ */
  FT.render = function (layer, opts) {
    var t = linspace(opts.tmin, opts.tmax, opts.Nt);
    var w = linspace(opts.wmin, opts.wmax, opts.Nw);
    var X = FT.evalComplex(function (x, o) { layer.Xfull(x, o); }, w);
    var imps = layer.wimp(opts.wmaxAbs || Math.max(-opts.wmin, opts.wmax));
    imps = imps.filter(function (q) { return Math.abs(q.w) <= Math.max(-opts.wmin, opts.wmax); });
    var xt, xi;
    if (opts.reconstructTime) {
      var inv = FT.inverseWithImpulses(X.re, X.im, w, imps, t);
      xt = inv.re; xi = inv.im;
    } else {
      var xx = FT.evalComplex(function (x, o) { layer.xfn(x, o); }, t);
      xt = xx.re; xi = xx.im;
    }
    var out = {
      t: t, xre: xt, xim: xi,
      w: w, Xre: X.re, Xim: X.im,
      timp: layer.timp.slice(),
      wimp: imps,
      meta: layer.meta,
      reconstructed: !!opts.reconstructTime
    };
    /* 时域冲激落在窗口内的才画 */
    out.timp = out.timp.filter(function (p) { return p.t >= opts.tmin && p.t <= opts.tmax; });
    return out;
  };

  /* -------------------------------------------------------- 数值小工具 */
  FT.niceTicks = function (min, max, count) {
    count = count || 6;
    var span = max - min;
    if (!(span > 0)) return { ticks: [min], step: 1 };
    var raw = span / count;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    var start = Math.ceil(min / step) * step;
    var ticks = [];
    for (var v = start; v <= max + step * 1e-6; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return { ticks: ticks, step: step };
  };

  FT.fmt = function (v, d) {
    if (v === undefined || v === null || !isFinite(v)) return '—';
    d = d === undefined ? 3 : d;
    var a = Math.abs(v);
    if (a !== 0 && (a < 1e-4 || a >= 1e6)) return v.toExponential(2);
    var s = v.toFixed(d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s === '-0' ? '0' : s;
  };

  /* π 刻度标签：把 v 表示成 k·π 的形式 */
  FT.fmtPi = function (v, step) {
    if (Math.abs(v) < 1e-12) return '0';
    var k = v / PI;
    var ks = Math.abs(k - Math.round(k * 4) / 4) < Math.abs(step) / PI * 0.05 ? Math.round(k * 4) / 4 : k;
    if (Math.abs(ks - Math.round(ks)) < 1e-9) {
      var n = Math.round(ks);
      if (n === 1) return 'π';
      if (n === -1) return '−π';
      return n + 'π';
    }
    var num = Math.round(ks * 4), den = 4;
    var g = gcd(Math.abs(num), den); num /= g; den /= g;
    if (den === 1) return (num === 1 ? 'π' : num === -1 ? '−π' : num + 'π');
    return (num === 1 ? '' : num === -1 ? '−' : num) + 'π/' + den;
  };

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  /* ------------------------------------------------- 表达式解析（自定义信号）
     递归下降：expr := term (('+'|'-') term)*
  -------------------------------------------------------------------- */
  var FUNCS = {
    exp: Math.exp, ln: Math.log, log: function (x) { return Math.log10(x); }, log10: Math.log10,
    log2: function (x) { return Math.log2(x); },
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    sqrt: Math.sqrt, abs: Math.abs, sign: function (x) { return x > 0 ? 1 : x < 0 ? -1 : 0; },
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    /* 常用信号 */
    u: function (x) { return x >= 0 ? 1 : 0; },
    step: function (x) { return x >= 0 ? 1 : 0; },
    heaviside: function (x) { return x >= 0 ? 1 : 0; },
    sgn: function (x) { return x > 0 ? 1 : x < 0 ? -1 : 0; },
    rect: function (x) { return Math.abs(x) < 0.5 ? 1 : (Math.abs(x) === 0.5 ? 0.5 : 0); },
    gate: function (x) { return Math.abs(x) < 0.5 ? 1 : (Math.abs(x) === 0.5 ? 0.5 : 0); },
    Pi: function (x) { return Math.abs(x) < 0.5 ? 1 : 0; },
    tri: function (x) { var a = Math.abs(x); return a < 1 ? 1 - a : 0; },
    Lambda: function (x) { var a = Math.abs(x); return a < 1 ? 1 - a : 0; },
    sa: function (x) { return x === 0 ? 1 : Math.sin(x) / x; },
    sinc: function (x) { return x === 0 ? 1 : Math.sin(PI * x) / (PI * x); },
    sinhc: function (x) { return x === 0 ? 1 : Math.sin(x) / x; }
  };

  FT.compile = function (src) {
    var i = 0, s = String(src);
    function err(m) { throw new Error(m + '（位置 ' + i + '）'); }
    function skip() { while (i < s.length && /\s/.test(s[i])) i++; }
    function peek() { skip(); return s[i] || ''; }
    function startsWith(w) { return s.slice(i, i + w.length).toLowerCase() === w; }

    function parseExpr() {
      var v = parseTerm();
      for (;;) {
        skip();
        var c = s[i];
        if (c === '+') { i++; var a = parseTerm(); v = { t: '+', a: v, b: a }; }
        else if (c === '-') { i++; var b = parseTerm(); v = { t: '-', a: v, b: b }; }
        else break;
      }
      return v;
    }
    function parseTerm() {
      var v = parseUnary();
      for (;;) {
        skip();
        var c = s[i];
        if (c === '*') { i++; v = { t: '*', a: v, b: parseUnary() }; }
        else if (c === '/') { i++; v = { t: '/', a: v, b: parseUnary() }; }
        else if (c === '^') { i++; v = { t: '^', a: v, b: parseUnary() }; }
        else if (c && (/[a-zA-Z(]/.test(c)) && !isExplicitOp(v)) {
          /* 隐式乘法：2t、3sin(t)、2(t+1) */
          v = { t: '*', a: v, b: parseUnary() };
        } else break;
      }
      return v;
    }
    function isExplicitOp(v) { return v.t === 'num' || v.t === 'var' || v.t === 'call' || v.t === 'paren'; }
    function parseUnary() {
      skip();
      if (s[i] === '-') { i++; return { t: 'neg', a: parseUnary() }; }
      if (s[i] === '+') { i++; return parseUnary(); }
      return parseAtom();
    }
    function parseAtom() {
      skip();
      var c = s[i];
      if (!c) err('表达式意外结束');
      if (c === '(') {
        i++;
        var e = parseExpr();
        skip();
        if (s[i] !== ')') err('缺少右括号');
        i++;
        return { t: 'paren', a: e };
      }
      if (c === '|') {
        i++;
        var inner = parseExpr();
        skip();
        if (s[i] !== '|') err('绝对值缺少右竖线');
        i++;
        return { t: 'call', name: 'abs', args: [inner] };
      }
      if (/[0-9.]/.test(c)) {
        var m = /^[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/i.exec(s.slice(i));
        if (!m) err('数字格式错误');
        i += m[0].length;
        return { t: 'num', v: parseFloat(m[0]) };
      }
      if (/[a-zA-Z_]/.test(c)) {
        var nm = /^[a-zA-Z_][a-zA-Z_0-9]*/.exec(s.slice(i))[0];
        i += nm.length;
        var low = nm.toLowerCase();
        if (low === 'pi') return { t: 'num', v: PI };
        if (low === 'e' && peek() !== '^' && !/^[a-z]/i.test(s[i] || '')) return { t: 'num', v: Math.E };
        if (low === 'j') return { t: 'var', name: '__j' };
        skip();
        if (s[i] === '(') {
          var fn = FUNCS[low];
          if (!fn) err('未知函数 ' + nm);
          i++;
          var args = [];
          skip();
          if (s[i] !== ')') {
            for (;;) {
              args.push(parseExpr());
              skip();
              if (s[i] === ',') { i++; continue; }
              break;
            }
          }
          skip();
          if (s[i] !== ')') err('函数 ' + nm + ' 缺少右括号');
          i++;
          return { t: 'call', name: low, args: args };
        }
        if (low === 'exp') err('exp 需要括号：exp(...)');
        return { t: 'var', name: low };
      }
      err('无法解析的字符 "' + c + '"');
    }

    var ast = parseExpr();
    skip();
    if (i < s.length) err('多余内容 "' + s[i] + '"');

    var CMPL = { abs: 1, exp: 0, sqrt: 1 };
    return function evaluate(env) {
      function ev(n) {
        switch (n.t) {
          case 'num': return { re: n.v, im: 0 };
          case 'var':
            if (n.name === 't') { var tv = env.t; return { re: typeof tv === 'number' ? tv : 0, im: typeof tv === 'undefined' ? 0 : (tv.im || 0) }; }
            if (n.name === '__j') return { re: 0, im: 1 };
            if (n.name === 'jw') return { re: 0, im: env.t || 0 };
            var p = env.p && env.p[n.name];
            if (p === undefined) throw new Error('未知变量 ' + n.name);
            return { re: p, im: 0 };
          case 'neg': { var a = ev(n.a); return { re: -a.re, im: -a.im }; }
          case 'paren': return ev(n.a);
          case '+': { var x = ev(n.a), y = ev(n.b); return { re: x.re + y.re, im: x.im + y.im }; }
          case '-': { var x2 = ev(n.a), y2 = ev(n.b); return { re: x2.re - y2.re, im: x2.im - y2.im }; }
          case '*': { var x3 = ev(n.a), y3 = ev(n.b); return { re: x3.re * y3.re - x3.im * y3.im, im: x3.re * y3.im + x3.im * y3.re }; }
          case '/': { var x4 = ev(n.a), y4 = ev(n.b); var d = y4.re * y4.re + y4.im * y4.im; if (!d) return { re: 0, im: 0 }; return { re: (x4.re * y4.re + x4.im * y4.im) / d, im: (x4.im * y4.re - x4.re * y4.im) / d }; }
          case '^': {
            var base = ev(n.a), ex = ev(n.b);
            if (Math.abs(base.im) < 1e-12 && Math.abs(ex.im) < 1e-12) {
              var v = Math.pow(base.re, ex.re);
              if (!isFinite(v) && base.re < 0) v = 0;
              return { re: isFinite(v) ? v : 0, im: 0 };
            }
            var r = Math.hypot(base.re, base.im), th = Math.atan2(base.im, base.re);
            var mr = Math.pow(r, ex.re), mt = ex.re * th;
            if (Math.abs(ex.im) > 1e-12) { mr *= Math.exp(-ex.im * th); mt += ex.im * Math.log(r || 1e-300); }
            if (!isFinite(mr)) return { re: 0, im: 0 };
            return { re: mr * Math.cos(mt), im: mr * Math.sin(mt) };
          }
          case 'call': {
            var f = FUNCS[n.name];
            var arg = ev(n.args[0]);
            if (Math.abs(arg.im) < 1e-12) {
              var rv = f(arg.re);
              if (!isFinite(rv)) return { re: 0, im: 0 };
              return { re: rv, im: 0 };
            }
            if (n.name === 'exp') {
              var er = Math.exp(arg.re);
              if (!isFinite(er)) return { re: 0, im: 0 };
              return { re: er * Math.cos(arg.im), im: er * Math.sin(arg.im) };
            }
            if (n.name === 'sin' || n.name === 'cos') {
              var a = Math.sin(arg.re), b = Math.cos(arg.re), sh = Math.sinh(arg.im), ch = Math.cosh(arg.im);
              return n.name === 'sin' ? { re: a * ch, im: b * sh } : { re: b * ch, im: -a * sh };
            }
            return { re: f(arg.re) || 0, im: 0 };
          }
        }
        throw new Error('内部错误');
      }
      return ev(ast);
    };
  };

  /* 从表达式里找出用到的自由变量，方便生成参数滑块 */
  FT.freeVars = function (src) {
    var out = {}, m, re = /[a-zA-Z_][a-zA-Z_0-9]*/g;
    var reserved = {};
    Object.keys(FUNCS).forEach(function (k) { reserved[k.toLowerCase()] = 1; });
    ['pi', 'e', 't', 'j', 'jw', 'i'].forEach(function (k) { reserved[k] = 1; });
    while ((m = re.exec(String(src)))) {
      var low = m[0].toLowerCase();
      if (!reserved[low]) out[low] = 1;
    }
    return Object.keys(out);
  };

  FT.FUNCS = FUNCS;

})(window);


/* ===== signals.js ===== */
/* ==========================================================================
   signals.js —— 解析式傅里叶变换对库（表 4.2 + 课件例题）
   公式串约定：\Tv = 时间变量 t，\Wv = 频率变量 ω（复合时只替换哨兵）；
   参数一律写 \omega_{0}、T_{1}、a、\tau 等，不会被误替换。
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT;
  var PI = Math.PI, TAU = 2 * Math.PI;
  var SIG = FT.SIG = {};

  FT.SIGGROUPS = [
    { id: 'basic', label: '基本信号' },
    { id: 'pulse', label: '脉冲与窗' },
    { id: 'periodic', label: '周期信号' },
    { id: 'dist', label: '广义函数' },
    { id: 'custom', label: '自定义' }
  ];

  function sa(x) { return Math.abs(x) < 1e-9 ? 1 - x * x / 6 : Math.sin(x) / x; }
  function mod(a, m) { var r = a % m; return r < 0 ? r + m : r; }
  var ZERO = function (x, o) { o[0] = 0; o[1] = 0; };

  /* --------------------------------------------------------------- 定义 */

  SIG.exp1s = {
    group: 'basic', name: '单边指数', order: 1, kind: 'energy',
    formulaT: 'e^{-a\\Tv}u(\\Tv)',
    formulaX: '\\frac{1}{a+j\\Wv}',
    params: [{ key: 'a', label: 'a', min: 0.2, max: 6, step: 0.1, def: 1, desc: '衰减系数（>0）' }],
    window: { tmax: 12, wmax: 24 },
    build: function (p) {
      var a = p.a;
      return {
        xfn: function (t, o) { o[0] = t >= 0 ? Math.exp(-a * t) : 0; o[1] = 0; },
        Xfn: function (w, o) { var d = a * a + w * w; o[0] = a / d; o[1] = -w / d; },
        notes: [
          { cls: 'tip', text: '幅度谱 |X(jω)| = 1/√(a²+ω²)：ω=0 处为 1/a，ω=±a 处降到 1/(√2·a)，即 3 dB 半功率点，带宽就是 a。' },
          { cls: 'tip', text: '相位谱 ∠X(jω) = −arctan(ω/a)，是奇函数、渐近 ±π/2。注意它不是零 —— 单边信号不对称，别把「实信号」当成「偶信号」。' },
          { cls: 'key', text: '课件手写补充对：e^{aτ}u(−τ) ⟷ 1/(a−jω)，Re{a}>0（本工具收录为「反因果指数」）。' }
        ]
      };
    }
  };

  SIG.exp1neg = {
    group: 'basic', name: '反因果指数', order: 2, kind: 'energy',
    formulaT: 'e^{a\\Tv}u(-\\Tv)',
    formulaX: '\\frac{1}{a-j\\Wv}',
    params: [{ key: 'a', label: 'a', min: 0.2, max: 6, step: 0.1, def: 1, desc: '衰减系数（>0）' }],
    window: { tmax: 12, wmax: 24 },
    build: function (p) {
      var a = p.a;
      return {
        xfn: function (t, o) { o[0] = t <= 0 ? Math.exp(a * t) : 0; o[1] = 0; },
        Xfn: function (w, o) { var d = a * a + w * w; o[0] = a / d; o[1] = w / d; },
        notes: [{ cls: 'tip', text: '与单边指数是共轭关系：幅度谱一模一样，相位符号相反（+arctan(ω/a)）。这正是「共轭 + 时间反转」两条性质叠加的结果。' }]
      };
    }
  };

  SIG.expabs = {
    group: 'basic', name: '双边指数', order: 3, kind: 'energy',
    formulaT: 'e^{-a|\\Tv|}',
    formulaX: '\\frac{2a}{a^{2}+\\Wv^{2}}',
    params: [{ key: 'a', label: 'a', min: 0.2, max: 6, step: 0.1, def: 1, desc: '衰减系数（>0）' }],
    window: { tmax: 10, wmax: 24 },
    build: function (p) {
      var a = p.a;
      return {
        xfn: function (t, o) { o[0] = Math.exp(-a * Math.abs(t)); o[1] = 0; },
        Xfn: function (w, o) { o[0] = 2 * a / (a * a + w * w); o[1] = 0; },
        notes: [
          { cls: 'ok', text: '实偶信号 ⟹ 频谱也是实偶且处处为正 ⟹ 相位谱恒为 0。这是「实偶 ⟷ 实偶」对称性的标准例子。' },
          { cls: 'tip', text: 'ω=0 处为 2/a，ω=±a 处为 1/a —— 降到最大值的一半（不是 1/√2），注意和单边指数那条曲线区分。' }
        ]
      };
    }
  };

  SIG.gate = {
    group: 'pulse', name: '矩形脉冲（门函数）', order: 4, kind: 'energy',
    formulaT: '\\begin{cases}1, & |\\Tv| < T_{1}\\\\ 0, & |\\Tv| > T_{1}\\end{cases}',
    formulaX: '\\frac{2\\sin \\Wv T_{1}}{\\Wv} = 2T_{1}\\,\\mathrm{Sa}(\\Wv T_{1})',
    params: [{ key: 'T1', label: 'T_{1}', min: 0.2, max: 6, step: 0.1, def: 1, desc: '半宽（脉宽 = 2T₁）' }],
    window: { tmax: 10, wmax: 20 },
    build: function (p) {
      var T1 = p.T1;
      return {
        xfn: function (t, o) { var a = Math.abs(t); o[0] = a < T1 ? 1 : (a === T1 ? 0.5 : 0); o[1] = 0; },
        Xfn: function (w, o) { o[0] = 2 * T1 * sa(w * T1); o[1] = 0; },
        marks: [{ w: PI / T1, label: 'π/T₁' }, { w: -PI / T1, label: '−π/T₁' }],
        notes: [
          { cls: 'key', text: '时域与频域的反比关系：T₁ 越小脉冲越窄，主瓣越宽、峰值 2T₁ 越低；面积全部体现在 ω=0 的高度上。' },
          { cls: 'tip', text: '第一过零点在 ω = π/T₁，主瓣宽度 2π/T₁ —— 这就是 Sa 型频谱定义的「信号带宽」。' },
          { cls: 'warn', text: 'Sa 变负后，|X| 折回正半轴，相位谱在 ±π 之间跳变而不是保持 0 —— 这是最常被画错的地方，切到「相位谱」看一眼。' }
        ]
      };
    }
  };

  SIG.tri = {
    group: 'pulse', name: '三角脉冲', order: 5, kind: 'energy',
    formulaT: '\\Lambda\\left(\\frac{\\Tv}{\\tau}\\right)=\\begin{cases}1-\\frac{|\\Tv|}{\\tau}, & |\\Tv|<\\tau\\\\ 0, & |\\Tv|>\\tau\\end{cases}',
    formulaX: '\\tau\\,\\mathrm{Sa}^{2}\\left(\\frac{\\Wv\\tau}{2}\\right)',
    params: [{ key: 'tau', label: '\\tau', min: 0.4, max: 8, step: 0.1, def: 2, desc: '底宽之半' }],
    window: { tmax: 10, wmax: 20 },
    build: function (p) {
      var tau = p.tau;
      return {
        xfn: function (t, o) { var a = Math.abs(t); o[0] = a < tau ? 1 - a / tau : 0; o[1] = 0; },
        Xfn: function (w, o) { var u = w * tau / 2, s = sa(u); o[0] = tau * s * s; o[1] = 0; },
        marks: [{ w: 2 * PI / tau, label: '2π/τ' }, { w: -2 * PI / tau, label: '−2π/τ' }],
        notes: [{ cls: 'tip', text: '三角脉冲 = 两个同宽门函数的卷积 ⟹ 频谱是 Sa 的平方。时域连续可导 ⟹ 高频按 1/ω² 衰减，比门函数的 1/ω 快得多，旁瓣也从不翻负（相位恒 0）。' }]
      };
    }
  };

  SIG.sincW = {
    group: 'pulse', name: '抽样信号 Sa（理想低通 h(t)）', order: 6, kind: 'energy',
    formulaT: '\\frac{\\sin W\\Tv}{\\pi\\Tv} = \\frac{W}{\\pi}\\mathrm{Sa}(W\\Tv)',
    formulaX: '\\begin{cases}1, & |\\Wv| < W\\\\ 0, & |\\Wv| > W\\end{cases}',
    params: [{ key: 'W', label: 'W', min: 0.5, max: 12, step: 0.1, def: 3, desc: '截止角频率 (rad/s)' }],
    window: { tmax: 12, wmax: 14 },
    build: function (p) {
      var W = p.W;
      return {
        xfn: function (t, o) { o[0] = W / PI * sa(W * t); o[1] = 0; },
        Xfn: function (w, o) { var a = Math.abs(w); o[0] = a < W ? 1 : (a === W ? 0.5 : 0); o[1] = 0; },
        marks: [{ w: W, label: 'W' }, { w: -W, label: '−W' }],
        notes: [
          { cls: 'key', text: '与门函数完全对偶：时域是 Sa、频域是矩形。把 W 拉到很大，时域波形就收缩成一个冲激 —— 对应 δ(t) ⟷ 1。' },
          { cls: 'warn', text: '时域波形延伸到 ±∞ 且振荡衰减，说明理想低通是非因果的，物理上不可实现（课件 4.7 的相位失真讨论就从这里开始）。' }
        ]
      };
    }
  };

  SIG.delta = {
    group: 'dist', name: '单位冲激 δ(t)', order: 7, kind: 'dist',
    formulaT: '\\delta(\\Tv)', formulaX: '1',
    params: [], window: { tmax: 8, wmax: 20 },
    build: function () {
      return {
        xfn: ZERO, Xfn: ZERO,
        timp: [{ t: 0, re: 1, im: 0 }],
        notes: [{ cls: 'key', text: '幅度谱是一条水平直线 = 均匀谱（白谱）：冲激包含所有频率且强度相同；相位谱恒为 0。' }]
      };
    }
  };

  SIG.deltashift = {
    group: 'dist', name: '延时冲激 δ(t−t₀)', order: 8, kind: 'dist',
    formulaT: '\\delta(\\Tv-t_{0})', formulaX: 'e^{-j\\Wv t_{0}}',
    params: [{ key: 't0', label: 't_{0}', min: -6, max: 6, step: 0.1, def: 2, desc: '延时' }],
    window: { tmax: 10, wmax: 20 },
    build: function (p) {
      var t0 = p.t0;
      return {
        xfn: ZERO, Xfn: ZERO,
        timp: [{ t: t0, re: 1, im: 0 }],
        notes: [
          { cls: 'tip', text: '幅度谱仍是 1（全频均匀），相位谱变成 −ωt₀ 一条过原点的斜直线 —— 「时移只改相位」最干净的证据。' },
          { cls: 'key', text: '线性相位 = 纯延时。相位对 ω 的导数 −t₀ 就是群延时。' }
        ]
      };
    }
  };

  SIG.doubled = {
    group: 'dist', name: '冲激偶 δ′(t)', order: 9, kind: 'dist',
    formulaT: '\\frac{d}{d\\Tv}\\delta(\\Tv)', formulaX: 'j\\Wv',
    params: [], window: { tmax: 8, wmax: 20 },
    build: function () {
      return {
        xfn: ZERO, Xfn: ZERO,
        timp: [{ t: 0, re: 1, im: 0, order: 1 }],
        notes: [{ cls: 'warn', text: 'δ′(t) 是广义函数（偶极子），时域只能画示意符号。频谱 jω 的幅度是 |ω|（一条 V 形直线），相位是 π/2·sgn(ω)。' }]
      };
    }
  };

  SIG.step = {
    group: 'dist', name: '单位阶跃 u(t)', order: 10, kind: 'dist',
    formulaT: 'u(\\Tv)', formulaX: '\\frac{1}{j\\Wv} + \\pi\\delta(\\Wv)',
    params: [], window: { tmax: 10, wmax: 26 },
    build: function () {
      return {
        xfn: function (t, o) { o[0] = t >= 0 ? 1 : 0; o[1] = 0; },
        Xfn: function (w, o) { o[0] = 0; o[1] = Math.abs(w) < 1e-9 ? 0 : -1 / w; },
        wimp: function () { return [{ w: 0, re: PI, im: 0 }]; },
        notes: [
          { cls: 'key', text: '课件奇偶分解法：u(t) = ½ + ½Sgn(t)。偶部 ½ ⟷ πδ(ω)；奇部 ½Sgn(t) ⟷ 1/(jω)。所以那根直流冲激绝不能漏。' },
          { cls: 'warn', text: '|1/(jω)| = 1/|ω| 在 ω→0 发散，图上是渐近线；真正的直流能量集中成 ω=0 处的冲激谱线。' },
          { cls: 'tip', text: '也可以从积分特性直接得到：δ(t) ⟷ 1，u(t) = ∫δ，故 U(jω) = 1/(jω) + π·1·δ(ω)。' }
        ]
      };
    }
  };

  SIG.sgn = {
    group: 'dist', name: '符号函数 Sgn(t)', order: 11, kind: 'dist',
    formulaT: '\\mathrm{Sgn}(\\Tv)', formulaX: '\\frac{2}{j\\Wv}',
    params: [], window: { tmax: 10, wmax: 26 },
    build: function () {
      return {
        xfn: function (t, o) { o[0] = t > 0 ? 1 : (t < 0 ? -1 : 0); o[1] = 0; },
        Xfn: function (w, o) { o[0] = 0; o[1] = Math.abs(w) < 1e-9 ? 0 : -2 / w; },
        notes: [
          { cls: 'tip', text: '实奇信号 ⟹ 频谱是纯虚奇函数，没有直流冲激。对照 u(t)：偶部贡献了那根 πδ(ω)。' },
          { cls: 'tip', text: '课件推导：Sgn(t) = lim[e^{−αt}u(t) − e^{αt}u(−t)]，α→0 时 1/(α+jω) − 1/(α−jω) = −2jω/(α²+ω²) → 2/(jω)。把 α 调大再调小可以看到收敛过程。' }
        ]
      };
    }
  };

  SIG.dc = {
    group: 'dist', name: '直流 1', order: 12, kind: 'dist',
    formulaT: '1', formulaX: '2\\pi\\delta(\\Wv)',
    params: [], window: { tmax: 10, wmax: 20 },
    build: function () {
      return {
        xfn: function (t, o) { o[0] = 1; o[1] = 0; },
        Xfn: ZERO,
        wimp: function () { return [{ w: 0, re: TAU, im: 0 }]; },
        notes: [{ cls: 'key', text: '表 4.2 注：a₀=1、a_k=0 (k≠0)，对任意周期 T 都成立 —— 直流信号的傅里叶级数只有一根谱线。' }]
      };
    }
  };

  SIG.cexp = {
    group: 'periodic', name: '复指数 e^{jω₀t}', order: 13, kind: 'power',
    formulaT: 'e^{j\\omega_{0}\\Tv}', formulaX: '2\\pi\\delta(\\Wv-\\omega_{0})',
    formulaA: 'a_{1}=1,\\quad a_{k}=0\\ (k\\neq 1)',
    params: [{ key: 'w0', label: '\\omega_{0}', min: 0.5, max: 12, step: 0.1, def: 4, desc: '角频率' }],
    window: { tmax: 12, wmax: 20 },
    build: function (p) {
      var w0 = p.w0;
      return {
        xfn: function (t, o) { o[0] = Math.cos(w0 * t); o[1] = Math.sin(w0 * t); },
        Xfn: ZERO,
        wimp: function () { return [{ w: w0, re: TAU, im: 0 }]; },
        notes: [{ cls: 'tip', text: '单根谱线，强度 2π。周期信号的傅里叶变换就是一串冲激，冲激强度 = 2πa_k，所以才会出现「谱线高度 ≠ 信号幅度」。' }]
      };
    }
  };

  SIG.cosw = {
    group: 'periodic', name: '余弦 cos ω₀t', order: 14, kind: 'power',
    formulaT: '\\cos \\omega_{0}\\Tv',
    formulaX: '\\pi[\\delta(\\Wv-\\omega_{0})+\\delta(\\Wv+\\omega_{0})]',
    formulaA: 'a_{1}=a_{-1}=\\tfrac{1}{2},\\quad a_{k}=0\\ (其余\\ k)',
    params: [{ key: 'w0', label: '\\omega_{0}', min: 0.5, max: 12, step: 0.1, def: 4, desc: '角频率' }],
    window: { tmax: 12, wmax: 20 },
    build: function (p) {
      var w0 = p.w0;
      return {
        xfn: function (t, o) { o[0] = Math.cos(w0 * t); o[1] = 0; },
        Xfn: ZERO,
        wimp: function () { return [{ w: w0, re: PI, im: 0 }, { w: -w0, re: PI, im: 0 }]; },
        notes: [{ cls: 'key', text: '双边谱：±ω₀ 各一根，高度 π；换算成单边谱幅度就是 1。这是「频谱图上的高度」和「信号幅度」不一致的根源。' }]
      };
    }
  };

  SIG.sinw = {
    group: 'periodic', name: '正弦 sin ω₀t', order: 15, kind: 'power',
    formulaT: '\\sin \\omega_{0}\\Tv',
    formulaX: '\\frac{\\pi}{j}[\\delta(\\Wv-\\omega_{0})-\\delta(\\Wv+\\omega_{0})]',
    formulaA: 'a_{1}=-a_{-1}=\\tfrac{1}{2j},\\quad a_{k}=0\\ (其余\\ k)',
    params: [{ key: 'w0', label: '\\omega_{0}', min: 0.5, max: 12, step: 0.1, def: 4, desc: '角频率' }],
    window: { tmax: 12, wmax: 20 },
    build: function (p) {
      var w0 = p.w0;
      return {
        xfn: function (t, o) { o[0] = Math.sin(w0 * t); o[1] = 0; },
        Xfn: ZERO,
        wimp: function () { return [{ w: w0, re: 0, im: -PI }, { w: -w0, re: 0, im: PI }]; },
        notes: [{ cls: 'tip', text: '谱线强度是虚数 π/j = −jπ：实数轴上画不出来，课件才把 −ω₀ 那根画成向下。幅度谱仍是 ±ω₀ 两根等高的线，相位谱给出 ±π/2 的区别。' }]
      };
    }
  };

  SIG.impulseTrain = {
    group: 'periodic', name: '均匀冲激串', order: 16, kind: 'power',
    formulaT: '\\sum_{n=-\\infty}^{+\\infty}\\delta(\\Tv-nT)',
    formulaX: '\\frac{2\\pi}{T}\\sum_{k=-\\infty}^{+\\infty}\\delta\\left(\\Wv-\\frac{2\\pi k}{T}\\right)',
    formulaA: 'a_{k}=\\frac{1}{T},\\quad 对全部\\ k',
    params: [{ key: 'T', label: 'T', min: 0.6, max: 8, step: 0.1, def: 3, desc: '冲激间隔' }],
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
        wimp: function (W) {
          var out = [], K = Math.min(500, Math.floor((W || 20) / w0));
          for (var k = -K; k <= K; k++) out.push({ w: k * w0, re: TAU / T, im: 0 });
          return out;
        },
        notes: [{ cls: 'key', text: '时域周期 ⟹ 频域冲激串；时域是冲激 ⟹ 频域也是冲激。采样定理全部从这一对开始：T 变大 ⟹ 间隔 2π/T 变小 ⟹ 谱线变密。' }]
      };
    }
  };

  SIG.periodicRect = {
    group: 'periodic', name: '周期矩形脉冲', order: 17, kind: 'power',
    formulaT: '\\tilde{x}(\\Tv)=\\begin{cases}1, & |\\Tv|<T_{1}\\\\ 0, & T_{1}<|\\Tv|\\le \\frac{T_{0}}{2}\\end{cases}',
    formulaX: '\\sum_{k=-\\infty}^{+\\infty}\\frac{2\\sin k\\omega_{0}T_{1}}{k}\\,\\delta(\\Wv-k\\omega_{0})',
    formulaA: 'a_{k}=\\frac{\\omega_{0}T_{1}}{\\pi}\\mathrm{sinc}\\left(\\frac{k\\omega_{0}T_{1}}{\\pi}\\right)=\\frac{\\sin k\\omega_{0}T_{1}}{k\\pi}',
    params: [
      { key: 'T0', label: 'T_{0}', min: 2, max: 24, step: 0.5, def: 4, desc: '周期' },
      { key: 'T1', label: 'T_{1}', min: 0.2, max: 6, step: 0.1, def: 1, desc: '半宽' }
    ],
    window: { tmax: 12, wmax: 20 },
    build: function (p) {
      var T0 = p.T0, T1 = Math.min(p.T1, T0 / 2 - 1e-6), w0 = TAU / T0;
      return {
        xfn: function (t, o) { var m = mod(t + T0 / 2, T0) - T0 / 2; o[0] = Math.abs(m) < T1 ? 1 : 0; o[1] = 0; },
        Xfn: ZERO,
        wimp: function (W) {
          var out = [], K = Math.min(500, Math.floor((W || 20) / w0));
          for (var k = -K; k <= K; k++) {
            var ak = k === 0 ? 2 * T1 / T0 : (2 * T1 / T0) * sa(k * w0 * T1);
            out.push({ w: k * w0, re: TAU * ak, im: 0 });
          }
          return out;
        },
        envelope: function (w) { return 2 * T1 * sa(w * T1); },
        notes: [
          { cls: 'key', text: '谱线高度 2πa_k 正好落在单脉冲频谱 X(jω)=2T₁Sa(ωT₁) 这条包络上 —— 「周期信号的频谱就是相应非周期信号频谱的样本」。' },
          { cls: 'tip', text: '把 T₀ 调大：谱线变密、整体变矮、包络不变；把 T₁ 调小：包络变宽，谱线在过零点处出现「缺线」。' }
        ]
      };
    }
  };

  SIG.teexp = {
    group: 'basic', name: 't·单边指数', order: 18, kind: 'energy',
    formulaT: '\\Tv\\,e^{-a\\Tv}u(\\Tv)', formulaX: '\\frac{1}{(a+j\\Wv)^{2}}',
    params: [{ key: 'a', label: 'a', min: 0.3, max: 5, step: 0.1, def: 1, desc: '衰减系数' }],
    window: { tmax: 12, wmax: 24 },
    build: function (p) {
      var a = p.a;
      return {
        xfn: function (t, o) { o[0] = t >= 0 ? t * Math.exp(-a * t) : 0; o[1] = 0; },
        Xfn: function (w, o) { var d = a * a + w * w, d2 = d * d; o[0] = (a * a - w * w) / d2; o[1] = 2 * a * w / d2; },
        notes: [{ cls: 'tip', text: '频域微分特性：τ·x(τ) ⟷ j·dX/dω。幅度按 1/(a²+ω²) 衰减，比原信号快一阶；相位滞后 2·arctan(ω/a)。' }]
      };
    }
  };

  SIG.tnexp = {
    group: 'basic', name: 'tⁿ⁻¹/(n−1)!·指数', order: 19, kind: 'energy',
    formulaT: '\\frac{\\Tv^{n-1}}{(n-1)!}e^{-a\\Tv}u(\\Tv)', formulaX: '\\frac{1}{(a+j\\Wv)^{n}}',
    params: [
      { key: 'a', label: 'a', min: 0.3, max: 4, step: 0.1, def: 1, desc: '衰减系数' },
      { key: 'n', label: 'n', min: 1, max: 6, step: 1, def: 3, desc: '阶数（整数）' }
    ],
    window: { tmax: 18, wmax: 24 },
    build: function (p) {
      var a = p.a, n = Math.max(1, Math.round(p.n));
      var fact = 1; for (var k = 2; k < n; k++) fact *= k;
      return {
        xfn: function (t, o) {
          if (t < 0) { o[0] = 0; o[1] = 0; return; }
          var v = Math.pow(t, n - 1) / fact * Math.exp(-a * t);
          o[0] = isFinite(v) ? v : 0; o[1] = 0;
        },
        Xfn: function (w, o) {
          var r = Math.pow(Math.hypot(a, w), n), th = -n * Math.atan2(w, a);
          o[0] = Math.cos(th) / r; o[1] = Math.sin(th) / r;
        },
        notes: [{ cls: 'tip', text: 'n 越大，时域峰值越往右移、越平缓；相位滞后 −n·arctan(ω/a) 线性叠加 —— 多重积分器等价于 n 个一阶低通串联。' }]
      };
    }
  };

  SIG.twoTone = {
    group: 'periodic', name: '双音 cos ω₁t + cos ω₂t', order: 20, kind: 'power',
    formulaT: '\\cos \\omega_{1}\\Tv + \\cos \\omega_{2}\\Tv',
    formulaX: '\\pi\\sum_{i=1}^{2}\\left[\\delta(\\Wv-\\omega_{i})+\\delta(\\Wv+\\omega_{i})\\right]',
    params: [
      { key: 'w1', label: '\\omega_{1}', min: 0.5, max: 8, step: 0.1, def: 2, desc: '低频分量' },
      { key: 'w2', label: '\\omega_{2}', min: 1, max: 14, step: 0.1, def: 5, desc: '高频分量' }
    ],
    window: { tmax: 14, wmax: 18 },
    build: function (p) {
      var w1 = p.w1, w2 = p.w2;
      return {
        xfn: function (t, o) { o[0] = Math.cos(w1 * t) + Math.cos(w2 * t); o[1] = 0; },
        Xfn: ZERO,
        wimp: function () {
          return [{ w: w1, re: PI, im: 0 }, { w: -w1, re: PI, im: 0 }, { w: w2, re: PI, im: 0 }, { w: -w2, re: PI, im: 0 }];
        },
        notes: [{ cls: 'tip', text: '课件例 4.1.1 的输入 f(t)=cos2t+cos5t 就是这个信号。频率分析的意义：每个分量独立地被 H(jω) 缩放和移相，互不干扰。' }]
      };
    }
  };

  SIG.amTone = {
    group: 'periodic', name: '调幅波 cos ωc t·cos Ωt', order: 21, kind: 'power',
    formulaT: '\\cos \\omega_{c}\\Tv\\cdot \\cos \\Omega\\Tv',
    formulaX: '\\frac{\\pi}{2}\\sum_{s=\\pm 1}\\left[\\delta(\\Wv-\\omega_{c}-s\\Omega)+\\delta(\\Wv+\\omega_{c}+s\\Omega)\\right]',
    params: [
      { key: 'wc', label: '\\omega_{c}', min: 2, max: 16, step: 0.1, def: 8, desc: '载波角频率' },
      { key: 'wm', label: '\\Omega', min: 0.3, max: 5, step: 0.1, def: 2, desc: '调制角频率' }
    ],
    window: { tmax: 16, wmax: 24 },
    build: function (p) {
      var wc = p.wc, wm = p.wm, h = PI / 2;
      return {
        xfn: function (t, o) { o[0] = Math.cos(wc * t) * Math.cos(wm * t); o[1] = 0; },
        Xfn: ZERO,
        wimp: function () {
          return [
            { w: wc + wm, re: h, im: 0 }, { w: -(wc + wm), re: h, im: 0 },
            { w: wc - wm, re: h, im: 0 }, { w: -(wc - wm), re: h, im: 0 }
          ];
        },
        notes: [{ cls: 'key', text: '相乘性质把 cos·cos 变成载波两侧各一根边带，强度 π/2 = ½·π；上下边带间距 2Ω。时域看到的「拍」就是包络 Ω。' }]
      };
    }
  };

  /* ------------------------------------------------------ 自定义（数值） */
  SIG.custom = {
    group: 'custom', name: '自定义 x(t)', order: 99, kind: 'energy', custom: true,
    formulaT: '\\text{（见下方表达式）}', formulaX: '\\text{数值积分}',
    params: [], window: { tmax: 14, wmax: 26 },
    build: function () { return null; }
  };

  /* -------------------------------------------------------------- 工具 */
  FT.sa = sa;
  FT.getSignal = function (id) { return SIG[id] || null; };

  FT.signalList = function () {
    return Object.keys(SIG).map(function (k) {
      var s = SIG[k];
      return { id: k, group: s.group, name: s.name, order: s.order, formulaT: s.formulaT, formulaX: s.formulaX, kind: s.kind };
    }).sort(function (a, b) { return a.order - b.order; });
  };

  FT.defaultParams = function (sig) {
    var p = {};
    (sig.params || []).forEach(function (d) { p[d.key] = d.def; });
    return p;
  };

  FT.buildBaseLayer = function (sig, p) {
    var b = sig.build(p);
    if (!b) return null;
    var layer = FT.makeLayer(b.xfn, b.Xfn, b.timp || [], b.wimp || function () { return []; }, {
      name: sig.name,
      formulaT: sig.formulaT,
      formulaX: sig.formulaX,
      formulaA: sig.formulaA,
      notes: b.notes || [],
      marks: b.marks || [],
      envelope: b.envelope || null,
      sigId: sig.id,
      kind: sig.kind
    });
    layer.base = b;
    return layer;
  };

})(window);


/* ===== props.js ===== */
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
    formula: 'x(t-t_{0})\\;\\longleftrightarrow\\;e^{-j\\omega t_{0}}X(j\\omega)',
    quote: '任世间纷扰，幅度谱不变，只相位移动。',
    desc: '延时不改变任何频率分量的强度，只让每个分量按自己的频率多滞后一个相位 ωt₀。合成起来，相位谱整体倾斜。',
    params: [{ key: 't0', label: 't_{0}', min: -6, max: 6, step: 0.1, def: 1.5, desc: '延时（>0 右移）' }],
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
        { opName: '时移', opFormula: 'e^{-j\\omega t_{0}}X(j\\omega)', note: '幅度谱 |X(jω)| 与原来完全重合，只有相位谱变化。' }
      );
    }
  };

  /* --------------------------------------------------------------- 频移 */
  PROP.freqshift = {
    id: 'freqshift', name: '频移', en: 'Frequency Shifting', sec: '4.3.6', short: '频移 ω₀',
    formula: 'e^{j\\omega_{0}t}x(t)\\;\\longleftrightarrow\\;X[j(\\omega-\\omega_{0})]',
    quote: '把整个频谱平移，形状一点不变。',
    desc: '时域乘一个复指数，频谱整体右移 ω₀。调制、混频、采样全都靠它。注意时域信号变成复信号了。',
    params: [{ key: 'w0', label: '\\omega_{0}', min: -10, max: 10, step: 0.1, def: 4, desc: '搬移量' }],
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
        { opName: '频移', opFormula: 'X[j(\\omega-\\omega_{0})]', note: '频谱平移 ω₀，包络形状不变；时域乘 e^{jω₀t} 后一般是复信号，虚部也要看。' }
      );
    }
  };

  /* --------------------------------------------------------------- 反转 */
  PROP.reverse = {
    id: 'reverse', name: '时间反转', en: 'Time Reversal', sec: '4.3.5', short: '反转 t→−t',
    formula: 'x(-t)\\;\\longleftrightarrow\\;X(-j\\omega)',
    quote: '时间倒着走，频谱也倒着看。',
    desc: '时域左右翻转 ⟺ 频域左右翻转。对实信号而言 X(−jω)=X*(jω)，所以幅度谱不变、相位谱反号。',
    params: [],
    apply: function (L, p) {
      return FT.makeLayer(
        function (t, o) { L.xfn(-t, o); },
        function (w, o) { L.Xfn(-w, o); },
        mapImp(L.timp, function (q) { return { t: -q.t, re: q.re, im: q.im, order: q.order || 0 }; }),
        function (W) { return mapImp(L.wimp(W), function (q) { return { w: -q.w, re: q.re, im: q.im }; }); },
        { opName: '时间反转', opFormula: 'X(-j\\omega)=X^{*}(j\\omega)\\ (实信号)', note: '实信号反转后幅度谱不变、相位谱反号；若原信号本身是偶的，则完全不变。' }
      );
    }
  };

  /* --------------------------------------------------------------- 展缩 */
  PROP.scale = {
    id: 'scale', name: '尺度变换', en: 'Scaling', sec: '4.3.5', short: '展缩 x(at)',
    formula: 'x(at)\\;\\longleftrightarrow\\;\\frac{1}{|a|}X\\left(j\\frac{\\omega}{a}\\right)',
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
        { opName: '尺度变换', opFormula: '\\frac{1}{|a|}X\\left(j\\frac{\\omega}{a}\\right)', note: '别忘了 1/|a| 这个幅度补偿因子：时域压得越窄，频谱摊得越开、峰值越低。' }
      );
    }
  };

  /* --------------------------------------------------------------- 共轭 */
  PROP.conj = {
    id: 'conj', name: '共轭', en: 'Conjugation', sec: '4.3.3', short: '共轭 x*(t)',
    formula: 'x^{*}(t)\\;\\longleftrightarrow\\;X^{*}(-j\\omega)',
    quote: '从现在开始，变身。',
    desc: '取共轭 ⟺ 频谱既共轭又反转。实信号取共轭当然不变，于是得到 X(jω)=X*(−jω)：实部偶、虚部奇、模偶、相位奇。',
    params: [],
    apply: function (L, p) {
      return FT.makeLayer(
        function (t, o) { L.xfn(t, o); o[1] = -o[1]; },
        function (w, o) { L.Xfn(-w, o); o[1] = -o[1]; },
        mapImp(L.timp, function (q) { return { t: q.t, re: q.re, im: -q.im, order: q.order || 0 }; }),
        function (W) { return mapImp(L.wimp(W), function (q) { return { w: -q.w, re: q.re, im: -q.im }; }); },
        { opName: '共轭', opFormula: 'X^{*}(-j\\omega)', note: '对实信号这一操作等于什么都没做 —— 而这恰恰证明了频谱的共轭对称性。' }
      );
    }
  };

  /* --------------------------------------------------------------- 微分 */
  PROP.diff = {
    id: 'diff', name: '时域微分', en: 'Differentiation', sec: '4.3.4', short: '微分 dx/dt',
    formula: '\\frac{d}{dt}x(t)\\;\\longleftrightarrow\\;j\\omega\\,X(j\\omega)',
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
          opName: '时域微分', opFormula: 'j\\omega\\,X(j\\omega)', reconstruct: true,
          note: '幅度谱乘 |ω| 后高频段翘起；相位谱整体加 π/2（ω<0 处减 π/2）。间断点处导数是冲激，所以波形由频谱逆变换重建，尖峰两侧的 ringing 属正常。'
        }
      );
    }
  };

  /* --------------------------------------------------------------- 积分 */
  PROP.integ = {
    id: 'integ', name: '时域积分', en: 'Integration', sec: '4.3.4', short: '积分 ∫x dτ',
    formula: '\\int_{-\\infty}^{t}x(\\tau)\\,d\\tau\\;\\longleftrightarrow\\;\\frac{1}{j\\omega}X(j\\omega)+\\pi X(0)\\delta(\\omega)',
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
          opName: '时域积分', opFormula: '\\frac{1}{j\\omega}X(j\\omega)+\\pi X(0)\\delta(\\omega)', reconstruct: true,
          note: '幅度谱按 1/|ω| 压低高频；ω=0 处出现 πX(0) 这根直流谱线（X(0)=∫x(t)dt，就是时域面积）。波形由频谱逆变换重建。' +
            (hasDcLine ? ' 原信号含直流谱线，积分后它会变成随时间增长的斜坡，图中无法用冲激表示，已略去。' : '')
        }
      );
    }
  };

  /* ------------------------------------------------------------ 频域微分 */
  PROP.fdiff = {
    id: 'fdiff', name: '频域微分', en: 'Frequency Differentiation', sec: '4.3.6', short: '频域微分 t·x',
    formula: 't\\,x(t)\\;\\longleftrightarrow\\;j\\frac{d}{d\\omega}X(j\\omega)',
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
          opName: '频域微分', opFormula: 'j\\frac{d}{d\\omega}X(j\\omega)',
          note: '时域是精确的 t·x(t)；频谱用中心差分对 X(jω) 求导。冲激谱线求导会变成冲激偶，这里不画谱线。'
        }
      );
    }
  };

  /* --------------------------------------------------------------- 对偶 */
  PROP.dual = {
    id: 'dual', name: '对偶性', en: 'Duality', sec: '4.3.7', short: '对偶',
    formula: 'x(t)\\longleftrightarrow X(j\\omega)\\ \\Rightarrow\\ X(jt)\\longleftrightarrow 2\\pi x(-\\omega)',
    quote: '武林秘籍中的万金油。',
    desc: '把时域表达式原样搬到频域，另一侧就变成 2π 倍的反转。门 ↔ Sa、Sa ↔ 门、冲激串 ↔ 冲激串，全靠它一次推完。',
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
          opName: '对偶性', opFormula: 'X(jt)\\longleftrightarrow 2\\pi x(-\\omega)',
          note: '对偶把「时域矩形 ⟷ 频域 Sa」和「时域 Sa ⟷ 频域矩形」看成同一件事的两面。带冲激谱线的信号对偶后变成时域冲激串。'
        }
      );
    }
  };

  /* ------------------------------------------------------- 调制（乘 cos） */
  PROP.modulate = {
    id: 'modulate', name: '幅度调制', en: 'Multiplication by cos', sec: '4.5', short: '乘 cos ω₀t',
    formula: 'x(t)\\cos \\omega_{0}t\\;\\longleftrightarrow\\;\\frac{1}{2}[X(j(\\omega-\\omega_{0}))+X(j(\\omega+\\omega_{0}))]',
    quote: '通信传输的基础。',
    desc: '相乘性质最常用的一次：载波把频谱复制成两份搬到 ±ω₀，每份幅度减半。ω₀ 太小两份会叠在一起 —— 那就是频谱混叠。',
    params: [{ key: 'w0', label: '\\omega_{0}', min: 0.5, max: 14, step: 0.1, def: 5, desc: '载波角频率' }],
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
        { opName: '幅度调制', opFormula: '\\frac{1}{2}[X[j(\\omega-\\omega_{0})]+X[j(\\omega+\\omega_{0})]]', note: '两份复制、各减半。要能无失真搬移，需要 ω₀ 大于信号最高频率，否则正负搬移的两份会重叠。' }
      );
    }
  };

  /* ------------------------------------------------------- 理想抽样 */
  PROP.sample = {
    id: 'sample', name: '理想抽样', en: 'Impulse Sampling', sec: '4.5 应用', short: '乘冲激串',
    formula: 'x(t)\\sum_{n=-\\infty}^{+\\infty}\\delta(t-nT)\\;\\longleftrightarrow\\;\\frac{1}{T}\\sum_{k=-\\infty}^{+\\infty}X\\left[j\\left(\\omega-\\frac{2\\pi k}{T}\\right)\\right]',
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
        { opName: '理想抽样', opFormula: '\\frac{1}{T}\\sum_{k}X\\left[j\\left(\\omega-\\frac{2\\pi k}{T}\\right)\\right]', note: '抽样后频谱以 2π/T 周期复制、幅度乘 1/T。想无失真恢复，需要 2π/T 大于信号带宽的两倍 —— 这就是奈奎斯特。' }
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


/* ===== chart.js ===== */
/* ==========================================================================
   chart.js —— Canvas 绘图引擎（DPR 自适应 / nice ticks / π 刻度 /
                折线·虚线·冲激谱线·填充 / 悬停读数 / 导出 PNG）
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT;
  var C = FT.COLORS = {
    grid: '#eaf0f8',
    gridStrong: '#d6e0ef',
    axis: '#8d9cb5',
    ink: '#14213d',
    muted: '#5b6a82',
    x: '#1d4e89',
    x2: '#2f6db3',
    ghost: '#a9b6c9',
    mag: '#c2410c',
    phase: '#6d28d9',
    y: '#0f7a4d',
    accent: '#0f8a8a',
    sys: '#6d28d9',
    danger: '#b91c1c',
    fill: 'rgba(29,78,137,.10)',
    fillMag: 'rgba(194,65,12,.10)',
    white: '#ffffff'
  };

  function Chart(canvas, readout, opts) {
    opts = opts || {};
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.ro = readout || null;
    this.o = opts;
    this.series = [];
    this.impulses = [];
    this.marks = [];
    this.hLines = [];
    this.vLines = [];
    this.xmin = opts.xmin === undefined ? -10 : opts.xmin;
    this.xmax = opts.xmax === undefined ? 10 : opts.xmax;
    this.ymin = null; this.ymax = null;
    this.autoY = true;
    this.padY = opts.padY === undefined ? 0.12 : opts.padY;
    this.hover = null;
    this.pinned = null;
    this.bindEvents();
  }

  Chart.prototype.setDomain = function (a, b) { this.xmin = a; this.xmax = b; };

  Chart.prototype.setSeries = function (list) { this.series = list || []; };

  Chart.prototype.setImpulses = function (list) { this.impulses = list || []; };

  Chart.prototype.setMarks = function (list) { this.marks = list || []; };

  Chart.prototype.setHLine = function (list) { this.hLines = list || []; };

  Chart.prototype.setVLine = function (list) { this.vLines = list || []; };

  Chart.prototype.resetY = function () { this.autoY = true; };

  Chart.prototype.bindEvents = function () {
    var self = this;
    this.cv.addEventListener('mousemove', function (e) {
      var r = self.cv.getBoundingClientRect();
      self.hover = { x: e.clientX - r.left, y: e.clientY - r.top };
      self.updateReadout();
    });
    this.cv.addEventListener('mouseleave', function () {
      self.hover = null;
      if (self.ro) self.ro.classList.remove('on');
      self.draw();
    });
    this.cv.addEventListener('click', function () {
      self.pinned = self.hover ? { x: self.hover.x, y: self.hover.y } : null;
    });
    this.cv.addEventListener('dblclick', function () {
      self.autoY = true; self.draw();
    });
  };

  Chart.prototype.geom = function () {
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var w = this.cv.clientWidth || 420, h = this.cv.clientHeight || 210;
    if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)) {
      this.cv.width = Math.round(w * dpr);
      this.cv.height = Math.round(h * dpr);
    }
    var padL = this.o.padL === undefined ? 48 : this.o.padL;
    var padR = this.o.padR === undefined ? 12 : this.o.padR;
    var padT = this.o.padT === undefined ? 12 : this.o.padT;
    var padB = this.o.padB === undefined ? 24 : this.o.padB;
    return {
      dpr: dpr, w: w, h: h,
      L: padL, R: w - padR, T: padT, B: h - padB,
      pw: w - padL - padR, ph: h - padT - padB
    };
  };

  Chart.prototype.xToPx = function (x, g) { return g.L + (x - this.xmin) / (this.xmax - this.xmin) * g.pw; };
  Chart.prototype.pxToX = function (px, g) { return this.xmin + (px - g.L) / g.pw * (this.xmax - this.xmin); };
  Chart.prototype.yToPx = function (y, g) { return g.B - (y - this.ymin) / (this.ymax - this.ymin) * g.ph; };

  Chart.prototype.computeY = function () {
    var lo = Infinity, hi = -Infinity, self = this;
    function consider(v) {
      if (!isFinite(v)) return;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    this.series.forEach(function (s) {
      if (s.hidden) return;
      var y = s.y, n = Math.min(y.length, s.x ? s.x.length : 0);
      for (var i = 0; i < n; i++) {
        if (s.x && (s.x[i] < self.xmin - 1e-12 || s.x[i] > self.xmax + 1e-12)) continue;
        consider(y[i]);
      }
    });
    this.impulses.forEach(function (q) { if (q.x >= self.xmin && q.x <= self.xmax) { consider(q.y); consider(0); } });
    if (!isFinite(lo) || !isFinite(hi)) { lo = -1; hi = 1; }
    if (hi - lo < 1e-12) { hi = lo + 1; lo -= 1; }
    /* 尽量把 0 留在视野里 */
    if (lo > 0 && lo < (hi - lo) * 0.6) lo = 0;
    if (hi < 0 && -hi < (hi - lo) * 0.6) hi = 0;
    var pad = (hi - lo) * this.padY;
    this.ymin = lo - pad;
    this.ymax = hi + pad;
  };

  Chart.prototype.fmtX = function (v, step) {
    if (this.o.piTicks) return FT.fmtPi(v, step);
    if (this.o.xFmt) return this.o.xFmt(v);
    return FT.fmt(v, Math.abs(step) < 1 ? 2 : (Math.abs(step) < 10 ? 1 : 0));
  };

  Chart.prototype.draw = function () {
    var g = this.geom(), ctx = this.ctx;
    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    ctx.clearRect(0, 0, g.w, g.h);
    ctx.fillStyle = '#fdfefe';
    ctx.fillRect(0, 0, g.w, g.h);
    if (this.autoY) this.computeY();
    if (this.ymin === null || this.ymax === null) this.computeY();

    var xt = FT.niceTicks(this.xmin, this.xmax, Math.max(3, Math.round(g.pw / 78)));
    var yt = FT.niceTicks(this.ymin, this.ymax, Math.max(2, Math.round(g.ph / 42)));

    /* 网格 */
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    xt.ticks.forEach(function (v) {
      var px = Math.round(this.xToPx(v, g)) + .5;
      if (px < g.L - .5 || px > g.R + .5) return;
      ctx.moveTo(px, g.T); ctx.lineTo(px, g.B);
    }, this);
    yt.ticks.forEach(function (v) {
      var py = Math.round(this.yToPx(v, g)) + .5;
      ctx.moveTo(g.L, py); ctx.lineTo(g.R, py);
    }, this);
    ctx.stroke();

    /* 零轴 */
    ctx.strokeStyle = C.gridStrong;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (this.ymin < 0 && this.ymax > 0) {
      var zy = Math.round(this.yToPx(0, g)) + .5;
      ctx.moveTo(g.L, zy); ctx.lineTo(g.R, zy);
    }
    if (this.xmin < 0 && this.xmax > 0) {
      var zx = Math.round(this.xToPx(0, g)) + .5;
      ctx.moveTo(zx, g.T); ctx.lineTo(zx, g.B);
    }
    ctx.stroke();

    /* 边框 */
    ctx.strokeStyle = C.gridStrong;
    ctx.lineWidth = 1;
    ctx.strokeRect(g.L + .5, g.T + .5, g.pw - 1, g.ph - 1);

    /* 刻度标签 */
    ctx.fillStyle = C.muted;
    ctx.font = '11px ' + (this.o.font || 'Consolas, monospace');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    xt.ticks.forEach(function (v) {
      var px = this.xToPx(v, g);
      if (px < g.L - 1 || px > g.R + 1) return;
      ctx.fillText(this.fmtX(v, xt.step), px, g.B + 5);
    }, this);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yt.ticks.forEach(function (v) {
      var py = this.yToPx(v, g);
      ctx.fillText(FT.fmt(v, Math.abs(yt.step) < 1 ? 2 : (Math.abs(yt.step) < 10 ? 1 : 0)), g.L - 6, py);
    }, this);

    /* 轴名 */
    ctx.fillStyle = C.muted;
    ctx.font = 'italic 11.5px "Cambria Math", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    if (this.o.xlabel) ctx.fillText(this.o.xlabel, g.L + 3, g.h - 2);
    if (this.o.ylabel) {
      ctx.save();
      ctx.translate(11, g.T + 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.o.ylabel, 0, 0);
      ctx.restore();
    }

    /* 裁剪到绘图区 */
    ctx.save();
    ctx.beginPath();
    ctx.rect(g.L, g.T - 2, g.pw, g.ph + 4);
    ctx.clip();

    /* 参考竖线 */
    this.vLines.forEach(function (l) {
      var px = this.xToPx(l.x, g);
      ctx.strokeStyle = l.color || C.ghost;
      ctx.setLineDash(l.dash || [3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, g.T); ctx.lineTo(px, g.B); ctx.stroke();
      ctx.setLineDash([]);
      if (l.label) {
        ctx.fillStyle = l.color || C.muted;
        ctx.font = '10.5px Consolas, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(l.label, px + 3, g.T + 2);
      }
    }, this);

    this.hLines.forEach(function (l) {
      var py = this.yToPx(l.y, g);
      ctx.strokeStyle = l.color || C.ghost;
      ctx.setLineDash(l.dash || [4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(g.L, py); ctx.lineTo(g.R, py); ctx.stroke();
      ctx.setLineDash([]);
      if (l.label) {
        ctx.fillStyle = l.color || C.muted;
        ctx.font = '10.5px Consolas, monospace';
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText(l.label, g.R - 3, py - 2);
      }
    }, this);

    /* 曲线 */
    this.series.forEach(function (s) {
      if (s.hidden || !s.x || !s.y) return;
      if (s.fill) this.fillSeries(s, g);
      this.strokeSeries(s, g);
    }, this);

    /* 冲激谱线 */
    this.impulses.forEach(function (q) { this.drawImpulse(q, g); }, this);

    /* 悬停十字 */
    var hp = this.hover || this.pinned;
    if (hp && hp.x >= g.L && hp.x <= g.R) {
      ctx.strokeStyle = 'rgba(29,78,137,.45)';
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hp.x + .5, g.T); ctx.lineTo(hp.x + .5, g.B); ctx.stroke();
      ctx.setLineDash([]);
      var xv = this.pxToX(hp.x, g);
      this.series.forEach(function (s) {
        if (s.hidden || !s.x) return;
        var yv = sampleAt(s.x, s.y, xv);
        if (!isFinite(yv)) return;
        var py = this.yToPx(yv, g);
        ctx.fillStyle = s.color || C.x;
        ctx.beginPath(); ctx.arc(hp.x, py, 3, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
      }, this);
    }

    ctx.restore();
  };

  Chart.prototype.strokeSeries = function (s, g) {
    var ctx = this.ctx, n = Math.min(s.x.length, s.y.length);
    ctx.strokeStyle = s.color || C.x;
    ctx.lineWidth = s.width || 1.9;
    ctx.globalAlpha = s.alpha === undefined ? 1 : s.alpha;
    if (s.dash) ctx.setLineDash(s.dash);
    ctx.beginPath();
    var pen = false;
    for (var i = 0; i < n; i++) {
      var y = s.y[i], x = s.x[i];
      if (!isFinite(y) || Math.abs(y) > 1e12) { pen = false; continue; }
      var px = this.xToPx(x, g), py = this.yToPx(y, g);
      if (!pen) { ctx.moveTo(px, py); pen = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  };

  Chart.prototype.fillSeries = function (s, g) {
    var ctx = this.ctx, n = Math.min(s.x.length, s.y.length);
    var base = this.yToPx(s.fillBase === undefined ? 0 : s.fillBase, g);
    ctx.fillStyle = s.fill;
    ctx.globalAlpha = s.alpha === undefined ? 1 : s.alpha;
    ctx.beginPath();
    var started = false, firstPx = 0;
    for (var i = 0; i < n; i++) {
      var y = s.y[i];
      if (!isFinite(y)) continue;
      var px = this.xToPx(s.x[i], g), py = this.yToPx(y, g);
      if (!started) { ctx.moveTo(px, base); ctx.lineTo(px, py); firstPx = px; started = true; }
      else ctx.lineTo(px, py);
    }
    if (started) {
      ctx.lineTo(this.xToPx(s.x[n - 1], g), base);
      ctx.lineTo(firstPx, base);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  Chart.prototype.drawImpulse = function (q, g) {
    var ctx = this.ctx;
    var px = this.xToPx(q.x, g);
    if (px < g.L - 2 || px > g.R + 2) return;
    var py0 = this.yToPx(0, g), py1 = this.yToPx(q.y, g);
    var col = q.color || C.mag;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineWidth = q.width || 2;
    ctx.globalAlpha = q.alpha === undefined ? 1 : q.alpha;
    ctx.beginPath(); ctx.moveTo(px, py0); ctx.lineTo(px, py1); ctx.stroke();
    /* 箭头 */
    var dir = py1 <= py0 ? -1 : 1;
    var ah = Math.min(9, Math.abs(py1 - py0) * 0.5);
    ctx.beginPath();
    ctx.moveTo(px, py1);
    ctx.lineTo(px - 4, py1 - dir * ah);
    ctx.lineTo(px + 4, py1 - dir * ah);
    ctx.closePath(); ctx.fill();
    if (q.label) {
      ctx.font = '10.5px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = dir < 0 ? 'bottom' : 'top';
      ctx.fillText(q.label, px, py1 - dir * 2);
    }
    ctx.globalAlpha = 1;
  };

  function sampleAt(xs, ys, x) {
    var n = Math.min(xs.length, ys.length);
    if (n === 0) return NaN;
    if (x < xs[0] || x > xs[n - 1]) return NaN;
    var i = Math.round((x - xs[0]) / (xs[1] - xs[0]));
    if (i < 0) i = 0; if (i > n - 2) i = n - 2;
    var t = (x - xs[i]) / (xs[i + 1] - xs[i]);
    return ys[i] + (ys[i + 1] - ys[i]) * t;
  }
  Chart.prototype.sample = sampleAt;

  Chart.prototype.updateReadout = function () {
    if (!this.ro) return;
    var g = this.geom();
    var hp = this.hover;
    if (!hp || hp.x < g.L || hp.x > g.R) { this.ro.classList.remove('on'); this.draw(); return; }
    var xv = this.pxToX(hp.x, g);
    var txt = (this.o.xLabel || 'x') + ' = ' + (this.o.piRead && Math.abs(xv) > 1e-9 ? (xv / Math.PI).toFixed(3) + 'π' : FT.fmt(xv, 3));
    var self = this;
    this.series.forEach(function (s) {
      if (s.hidden || !s.x || !s.label) return;
      var y = sampleAt(s.x, s.y, xv);
      txt += '   ' + s.label + ' = ' + FT.fmt(y, 4);
    });
    if (this.impulses.length) {
      var near = null, bd = Infinity;
      for (var i = 0; i < this.impulses.length; i++) {
        var d = Math.abs(this.impulses[i].x - xv);
        if (d < bd) { bd = d; near = this.impulses[i]; }
      }
      if (near && bd < (this.xmax - this.xmin) / 60) txt += '   谱线 ' + FT.fmt(near.y, 4);
    }
    this.ro.textContent = txt;
    this.ro.classList.add('on');
    this.draw();
  };

  Chart.prototype.exportPNG = function (name) {
    try {
      var a = document.createElement('a');
      a.download = (name || 'chart') + '.png';
      a.href = this.cv.toDataURL('image/png');
      a.click();
      return true;
    } catch (e) { return false; }
  };

  /* 迷你图：一次性画好，不绑定交互 */
  FT.miniDraw = function (canvas, spec) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var w = canvas.clientWidth || canvas.width || 180;
    var h = canvas.clientHeight || canvas.height || 78;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var L = 22, R = w - 5, T = 6, B = h - 13;
    var pw = R - L, ph = B - T;
    var xmin = spec.xmin, xmax = spec.xmax;
    var lo = Infinity, hi = -Infinity;
    (spec.series || []).forEach(function (s) {
      for (var i = 0; i < s.y.length; i++) {
        var v = s.y[i];
        if (!isFinite(v)) continue;
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
    });
    (spec.impulses || []).forEach(function (q) { if (isFinite(q.y)) { if (q.y < lo) lo = q.y; if (q.y > hi) hi = q.y; } });
    if (!isFinite(lo)) { lo = -1; hi = 1; }
    if (hi - lo < 1e-12) { hi = lo + 1; lo -= 1; }
    if (lo > 0) lo = 0;
    if (hi < 0) hi = 0;
    var pad = (hi - lo) * 0.14; lo -= pad; hi += pad;
    function X(x) { return L + (x - xmin) / (xmax - xmin) * pw; }
    function Y(y) { return B - (y - lo) / (hi - lo) * ph; }

    ctx.strokeStyle = '#eef3fa'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; gx <= 4; gx++) { var px = L + pw * gx / 4; ctx.moveTo(px, T); ctx.lineTo(px, B); }
    ctx.stroke();
    if (lo < 0 && hi > 0) {
      ctx.strokeStyle = '#dbe4f0';
      ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(R, Y(0)); ctx.stroke();
      if (xmin < 0 && xmax > 0) { ctx.beginPath(); ctx.moveTo(X(0), T); ctx.lineTo(X(0), B); ctx.stroke(); }
    } else if (xmin < 0 && xmax > 0) {
      ctx.strokeStyle = '#dbe4f0';
      ctx.beginPath(); ctx.moveTo(X(0), T); ctx.lineTo(X(0), B); ctx.stroke();
    }
    ctx.strokeStyle = '#e6ecf6'; ctx.strokeRect(L + .5, T + .5, pw - 1, ph - 1);

    (spec.series || []).forEach(function (s) {
      ctx.strokeStyle = s.color || C.x;
      ctx.lineWidth = s.width || 1.5;
      ctx.globalAlpha = s.alpha === undefined ? 1 : s.alpha;
      if (s.dash) ctx.setLineDash(s.dash);
      ctx.beginPath();
      var pen = false;
      for (var i = 0; i < s.y.length; i++) {
        var y = s.y[i];
        if (!isFinite(y)) { pen = false; continue; }
        var px = X(s.x[i]), py = y > hi ? T : (y < lo ? B : Y(y));
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });
    (spec.impulses || []).forEach(function (q) {
      var px = X(q.x), py0 = Y(0), py1 = Y(q.y);
      ctx.strokeStyle = q.color || C.mag; ctx.fillStyle = q.color || C.mag;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(px, py0); ctx.lineTo(px, py1); ctx.stroke();
      var dir = py1 <= py0 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(px, py1); ctx.lineTo(px - 3, py1 - dir * 6); ctx.lineTo(px + 3, py1 - dir * 6);
      ctx.closePath(); ctx.fill();
    });

    ctx.fillStyle = '#8494ab';
    ctx.font = '9.5px Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(FT.fmt(xmin, 1), L + 8, B + 2);
    ctx.fillText(FT.fmt(xmax, 1), R - 10, B + 2);
    ctx.textAlign = 'left';
    ctx.fillText(FT.fmt(hi, 2), 1, T);
    ctx.textBaseline = 'bottom';
    ctx.fillText(FT.fmt(lo, 2), 1, B);
  };

  global.Chart = Chart;
})(window);


/* ===== ui.js ===== */
/* ==========================================================================
   ui.js —— 共享 UI 组件：滑块行、芯片、抽屉、模态、toast、本地存储
   ========================================================================== */
(function (global) {
  'use strict';

  var UI = global.UI = {};
  var M = global.MML;

  UI.el = function (tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'checked') e.checked = !!v;
      else if (k === 'value') e.value = v;
      else e.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  };

  UI.clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); };

  UI.debounce = function (fn, ms) {
    var t = null;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms || 90);
    };
  };

  /* ------------------------------------------------------------ 滑块行 */
  UI.sliderRow = function (cfg, value, onInput) {
    var wrap = UI.el('div', { class: 'param-row' });
    var lab = UI.el('label');
    lab.appendChild(UI.el('span', { class: 'pname', html: M.render(cfg.label || cfg.key) }));
    var right = UI.el('span', {}, [
      cfg.desc ? UI.el('span', { class: 'pdesc', text: cfg.desc }) : null,
      UI.el('span', { class: 'pnum' })
    ]);
    lab.appendChild(right);
    var inp = UI.el('input', {
      type: 'range', min: cfg.min, max: cfg.max, step: cfg.step || 0.1, value: value
    });
    var numEl = right.querySelector('.pnum');
    function show(v) {
      numEl.textContent = (cfg.fmt ? cfg.fmt(v) : UI.trim(v)) + (cfg.unit || '');
    }
    show(value);
    inp.addEventListener('input', function () {
      var v = parseFloat(inp.value);
      show(v);
      onInput(v);
    });
    wrap.appendChild(lab);
    wrap.appendChild(inp);
    wrap.set = function (v) { inp.value = v; show(v); };
    return wrap;
  };

  UI.trim = function (v) {
    if (!isFinite(v)) return '—';
    var a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(1);
    var s = v.toFixed(a < 1 ? 3 : (a < 10 ? 2 : 1));
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  };

  /* -------------------------------------------------------------- 芯片 */
  UI.chip = function (text, mx, active, onClick, wide) {
    var b = UI.el('button', { class: 'chip' + (active ? ' active' : '') + (wide ? ' chip-wide' : ''), type: 'button', onclick: onClick });
    b.appendChild(UI.el('span', { class: 'chip-name', text: text }));
    if (mx) b.appendChild(UI.el('span', { class: 'chip-mx', html: M.render(mx) }));
    b.setText = function (t) { b.querySelector('.chip-name').textContent = t; };
    b.setMx = function (m) { b.querySelector('.chip-mx').innerHTML = M.render(m); };
    b.setActive = function (v) { b.classList.toggle('active', !!v); };
    return b;
  };

  /* ------------------------------------------------------------ toast */
  var toastEl, toastTimer;
  UI.toast = function (msg, ms) {
    toastEl = toastEl || document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, ms || 2200);
  };

  /* ------------------------------------------------------------- 模态 */
  var modal, modalTitle, modalBody;
  UI.openModal = function (title, html) {
    modal = modal || document.getElementById('modal');
    modalTitle = modalTitle || document.getElementById('modalTitle');
    modalBody = modalBody || document.getElementById('modalBody');
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.hidden = false;
  };
  UI.closeModal = function () { if (modal) modal.hidden = true; };

  /* ------------------------------------------------------------- 抽屉 */
  UI.openDrawer = function () { var d = document.getElementById('drawer'); if (d) d.hidden = false; };
  UI.closeDrawer = function () { var d = document.getElementById('drawer'); if (d) d.hidden = true; };

  /* --------------------------------------------------------- 本地存储 */
  var KEY = 'ft-lab-state-v1';
  UI.save = function (obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* 忽略隐私模式 */ }
  };
  UI.load = function () {
    try {
      var s = localStorage.getItem(KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  };
  UI.clearSave = function () { try { localStorage.removeItem(KEY); } catch (e) { } };

  /* --------------------------------------------------- 复数格式化 */
  UI.cplx = function (re, im, d) {
    var s = UI.trim(re);
    if (Math.abs(im) > 1e-12) s += (im >= 0 ? ' +' : ' −') + ' ' + UI.trim(Math.abs(im)) + 'j';
    return s;
  };
  UI.polar = function (re, im) {
    var r = Math.hypot(re, im), th = Math.atan2(im, re);
    return UI.trim(r) + ' ∠ ' + (th * 180 / Math.PI).toFixed(1) + '°';
  };

  /* 相位友好显示：尽量用 π 表示 */
  UI.phase = function (rad) {
    if (!isFinite(rad)) return '—';
    var k = rad / Math.PI;
    var r = Math.round(k * 4) / 4;
    if (Math.abs(k - r) < 0.01) {
      if (r === 0) return '0';
      var num = Math.round(r * 4), den = 4;
      var g = function (a, b) { return b ? g(b, a % b) : a; };
      var gg = g(Math.abs(num), den); num /= gg; den /= gg;
      var sign = num < 0 ? '−' : '';
      num = Math.abs(num);
      var top = num === 1 ? 'π' : num + 'π';
      return sign + (den === 1 ? top : top + '/' + den);
    }
    return rad.toFixed(3) + ' rad';
  };

  /* 生成一组等间距 x 网格 */
  UI.grid = function (a, b, n) { return global.FT.linspace(a, b, n); };

})(window);


/* ===== lab.js ===== */
/* ==========================================================================
   lab.js —— 实验台：信号选择 → 性质变换链 → 时域/幅度谱/相位谱/附加谱
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML, C = FT.COLORS;
  var PI = Math.PI, TAU = 2 * Math.PI;
  var Lab = FT.Lab = {};

  var NT = 800, NW = 1600;

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
        formulaT: '\\text{' + c.expr + '}',
        formulaX: '\\text{数值积分（截断窗 }' + UI.trim(Wt) + '\\text{）}',
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
        X: e.xExpr + '\\cdot e^{-j\\Wv\\,' + UI.trim(p.t0) + '}'
      };
    };
    P.reverse.compose = function (e) {
      return { t: sub('\\Tv', '-\\Tv', e.tExpr), X: sub('\\Wv', '-\\Wv', e.xExpr) };
    };
    P.scale.compose = function (e, p) {
      var a = UI.trim(p.a);
      return {
        t: sub('\\Tv', a + '\\Tv', e.tExpr),
        X: '\\frac{1}{' + Math.abs(p.a).toFixed(2) + '}\\left[' + sub('\\Wv', '\\frac{\\Wv}{' + a + '}', e.xExpr) + '\\right]'
      };
    };
    P.freqshift.compose = function (e, p) {
      var w = UI.trim(p.w0);
      return {
        t: e.tExpr + '\\cdot e^{j\\,' + w + '\\Tv}',
        X: sub('\\Wv', '(\\Wv-' + w + ')', e.xExpr)
      };
    };
    P.conj.compose = function (e) {
      return { t: '\\left[' + e.tExpr + '\\right]^{*}', X: '\\left[' + sub('\\Wv', '-\\Wv', e.xExpr) + '\\right]^{*}' };
    };
    P.diff.compose = function (e) {
      return { t: '\\frac{d}{d\\Tv}\\left[' + e.tExpr + '\\right]', X: 'j\\Wv\\left[' + e.xExpr + '\\right]' };
    };
    P.integ.compose = function (e) {
      return {
        t: '\\int_{-\\infty}^{\\Tv}\\left[' + e.tExpr + '\\right]d\\tau',
        X: '\\frac{1}{j\\Wv}\\left[' + e.xExpr + '\\right]+\\pi X(0)\\delta(\\Wv)'
      };
    };
    P.fdiff.compose = function (e) {
      return { t: '\\Tv\\cdot\\left[' + e.tExpr + '\\right]', X: 'j\\frac{d}{d\\Wv}\\left[' + e.xExpr + '\\right]' };
    };
    P.modulate.compose = function (e, p) {
      var w = UI.trim(p.w0);
      return {
        t: '\\cos(' + w + '\\Tv)\\cdot\\left[' + e.tExpr + '\\right]',
        X: '\\tfrac{1}{2}\\left[' + sub('\\Wv', '(\\Wv-' + w + ')', e.xExpr) + '+' + sub('\\Wv', '(\\Wv+' + w + ')', e.xExpr) + '\\right]'
      };
    };
    P.sample.compose = function (e, p) {
      var T = UI.trim(p.T);
      return {
        t: 'x(' + T + 'n)\\delta(\\Tv-' + T + 'n)',
        X: '\\frac{1}{' + T + '}\\sum_{k}X\\left[j\\left(\\Wv-\\tfrac{2\\pi k}{' + T + '}\\right)\\right]'
      };
    };
    P.dual.compose = function (e) {
      return {
        t: sub('\\Wv', '\\Tv', e.xExpr),
        X: '2\\pi\\left[' + sub('\\Tv', '-\\Wv', e.tExpr) + '\\right]'
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
    main.innerHTML = M.render('y(\\Tv)=' + tExpr) +
      '<span class="arrow">⟷</span>' + M.render('Y(j\\Wv)=' + xExpr);
    tag.textContent = st.chain.length ? st.chain.map(function (c) { return FT.propById(c.id).name; }).join(' → ') : '未加变换';

    if (st.chain.length) {
      rule.innerHTML = st.chain.map(function (c, i) {
        var op = FT.propById(c.id);
        var pv = Object.keys(c.params).map(function (k) { return k + '=' + UI.trim(c.params[k]); }).join(', ');
        return '<span class="chainf">' + (i + 1) + '. ' + M.render(op.formula) + (pv ? ' <span class="hint">（' + pv + '）</span>' : '') + '</span>';
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
    var base = buildBase(st);
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

    var opts = {
      tmin: -o.tmax, tmax: o.tmax, Nt: NT,
      wmin: -o.wmax, wmax: o.wmax, Nw: NW,
      wmaxAbs: o.wmax,
      reconstructTime: res.reconstruct
    };
    var r = FT.render(res.layer, opts);
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
    FT.SIGGROUPS.forEach(function (grp) {
      var items = list.filter(function (s) { return s.group === grp.id; });
      if (!items.length) return;
      var box = UI.el('div', { class: 'sig-group' });
      box.appendChild(UI.el('div', { class: 'glabel', text: grp.label }));
      var cg = UI.el('div', { class: 'chip-grid' });
      items.forEach(function (s) {
        cg.appendChild(UI.chip(s.name, s.formulaT, Lab.state.sigId === s.id, function () {
          pickSignal(s.id);
        }));
      });
      if (grp.id === 'custom') {
        cg.appendChild(UI.chip('打开表达式面板', 'x(t)=…', false, function () { UI.openDrawer(); }));
      }
      box.appendChild(cg);
      host.appendChild(box);
    });
    document.getElementById('sigCountHint').textContent = list.length + ' 个可选';
  }

  function pickSignal(id) {
    Lab.state.sigId = id;
    var sig = FT.getSignal(id);
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
      fx.innerHTML = M.render('\\text{' + (Lab.state.custom.expr || '') + '}');
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
      body.appendChild(UI.el('span', { class: 'mx', html: M.render(op.formula) }));
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
    if (!sig) Lab.state.sigId = 'exp1s';
    Lab.state.params = Lab.state.params || {};
    (FT.getSignal(Lab.state.sigId).params || []).forEach(function (d) {
      if (Lab.state.params[d.key] === undefined) Lab.state.params[d.key] = d.def;
    });

    charts.time = new Chart(document.getElementById('chTime'), document.getElementById('roTime'), { xlabel: 't', xLabel: 't', padL: 46 });
    charts.mag = new Chart(document.getElementById('chMag'), document.getElementById('roMag'), { xlabel: 'ω', xLabel: 'ω', piTicks: true, padL: 52 });
    charts.phase = new Chart(document.getElementById('chPhase'), document.getElementById('roPhase'), { xlabel: 'ω', xLabel: 'ω', piTicks: true, padL: 52 });
    charts.extra = new Chart(document.getElementById('chExtra'), document.getElementById('roExtra'), { xlabel: 'ω', xLabel: 'ω', piTicks: true, padL: 52 });

    renderSigPicker();
    renderParamRows();
    renderPropChips();
    bindStatic();
    syncRangeSliders();
    Lab.recompute();
  };

  Lab.pick = pickSignal;
  Lab.charts = charts;

})(window);


/* ===== propsview.js ===== */
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
      formula: 'x(t)*h(t)\\;\\longleftrightarrow\\;X(j\\omega)\\cdot H(j\\omega)',
      quote: '时域卷起来，频域乘起来 —— LTI 系统分析的全部。',
      desc: '卷积在时域里又是翻转又是平移又是积分，最难算；可一旦变到频域就退化成普通乘法。所以「求零状态响应」的标准流程是：X → 乘 H → 逆变换。',
      link: 'sys'
    },
    {
      id: 'mult', name: '相乘', en: 'Multiplication', sec: '4.5',
      formula: 'x_{1}(t)x_{2}(t)\\;\\longleftrightarrow\\;\\frac{1}{2\\pi}\\left[X_{1}(j\\omega)*X_{2}(j\\omega)\\right]',
      quote: '通信传输的基础。',
      desc: '和卷积性质正好对偶，注意前面那个 1/2π。时域相乘 = 频谱搬移/混叠，调制、解调、采样定理都建立在这一条上。',
      link: 'mod'
    },
    {
      id: 'parseval', name: '帕塞瓦尔定理', en: 'Parseval', sec: '4.3.8',
      formula: '\\int_{-\\infty}^{+\\infty}|x(t)|^{2}dt=\\frac{1}{2\\pi}\\int_{-\\infty}^{+\\infty}|X(j\\omega)|^{2}d\\omega',
      quote: '自然定律，能量守恒。',
      desc: '时域能量等于频域能量除以 2π。它给了「频谱密度」一个物理单位，也是噪声带宽、3 dB 带宽这些工程概念的依据。',
      link: 'topics'
    },
    {
      id: 'sym', name: '共轭对称性', en: 'Conjugate Symmetry', sec: '4.3.3',
      formula: 'x(t)=x^{*}(t)\\;\\Rightarrow\\;X(j\\omega)=X^{*}(-j\\omega)',
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

    card.appendChild(UI.el('div', { class: 'prop-formula', html: M.render(op.formula) }));
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
    card.appendChild(UI.el('div', { class: 'prop-formula', html: M.render(e.formula) }));
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


/* ===== pairsview.js ===== */
/* ==========================================================================
   pairsview.js —— 表 4.2 基本变换对速查表（含实时缩略图）
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML, C = FT.COLORS;
  var body, kindFilter = 'all', showSpark = true;

  var ORDER_NOTE = {
    '表 4.2 第一行是总纲：周期信号的傅里叶变换 = 2πΣ a_k δ(ω−kω₀)，也就是把非周期频谱在谐波频率上取样。'
  };

  function sparkline(r, kind) {
    var d = r.derived;
    var spec = kind === 'time'
      ? { xmin: r.t[0], xmax: r.t[r.t.length - 1], series: [{ x: r.t, y: r.xre, color: C.x, width: 1.5 }] }
      : {
        xmin: r.w[0], xmax: r.w[r.w.length - 1],
        series: [{ x: r.w, y: d.mag, color: C.mag, width: 1.5 }],
        impulses: r.wimp.map(function (q) { return { x: q.w, y: Math.hypot(q.re, q.im), color: C.mag }; })
      };
    return spec;
  }

  function quick(r) {
    var n = r.w.length, mag = new Float64Array(n), ph = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      mag[i] = Math.hypot(r.Xre[i], r.Xim[i]);
      ph[i] = mag[i] < 1e-9 ? NaN : Math.atan2(r.Xim[i], r.Xre[i]);
    }
    return { mag: mag, ph: ph };
  }

  function row(sig) {
    var tr = UI.el('tr');
    var tdT = UI.el('td');
    var btn = UI.el('button', { class: 'siglink', title: '点我在实验台打开', text: '' });
    btn.innerHTML = M.render(sig.formulaT);
    btn.addEventListener('click', function () {
      FT.Lab.pick(sig.id);
      FT.UI.go('lab');
      UI.toast('已在实验台打开：' + sig.name);
    });
    tdT.appendChild(btn);
    tdT.appendChild(UI.el('div', { class: 'tagline', text: sig.name }));
    tr.appendChild(tdT);

    var tdX = UI.el('td');
    tdX.innerHTML = M.render(sig.formulaX);
    tr.appendChild(tdX);

    var tdA = UI.el('td');
    tdA.innerHTML = sig.formulaA ? M.render(sig.formulaA) : '<span class="hint">—</span>';
    tr.appendChild(tdA);

    if (showSpark) {
      ['time', 'mag'].forEach(function (kind) {
        var td = UI.el('td', { class: 'spark' });
        var cv = UI.el('canvas');
        td.appendChild(cv);
        tr.appendChild(td);
        requestAnimationFrame(function () {
          var s = FT.getSignal(sig.id);
          var p = FT.defaultParams(s);
          var L = FT.buildBaseLayer(s, p);
          if (!L) return;
          var wm = Math.min(60, (s.window ? s.window.wmax : 20));
          var tm = Math.min(30, (s.window ? s.window.tmax : 10));
          var r = FT.render(L, { tmin: -tm, tmax: tm, Nt: 200, wmin: -wm, wmax: wm, Nw: 260, wmaxAbs: wm, reconstructTime: false });
          r.derived = quick(r);
          FT.miniDraw(cv, sparkline(r, kind));
        });
      });
    }
    return tr;
  }

  FT.PairsView = {
    render: function () {
      body = body || document.getElementById('pairsBody');
      UI.clear(body);
      var list = FT.signalList().filter(function (s) { return s.id !== 'custom'; });
      if (kindFilter === 'energy') list = list.filter(function (s) { return s.kind === 'energy'; });
      if (kindFilter === 'power') list = list.filter(function (s) { return s.kind === 'power'; });
      if (kindFilter === 'dist') list = list.filter(function (s) { return s.kind === 'dist'; });

      /* 总纲行 */
      var head = UI.el('tr');
      ['\\sum_{k=-\\infty}^{+\\infty}a_{k}e^{jk\\omega_{0}\\Tv}',
       '2\\pi\\sum_{k=-\\infty}^{+\\infty}a_{k}\\delta(\\Wv-k\\omega_{0})',
       'a_{k}'].map(function (f) {
        var td = UI.el('td');
        td.innerHTML = M.render(f);
        head.appendChild(td);
      });
      if (showSpark) { head.appendChild(UI.el('td')); head.appendChild(UI.el('td')); }
      body.appendChild(head);

      list.forEach(function (s) { body.appendChild(row(s)); });

      var note = UI.el('tr');
      var nc = UI.el('td', { colspan: showSpark ? 5 : 3 });
      nc.style.color = '#5b6a82';
      nc.style.fontSize = '12.4px';
      nc.textContent = '说明：表 4.2 第一行是总纲 —— 周期信号的傅里叶变换等于 2πΣ a_k δ(ω−kω₀)，也就是把对应非周期信号的频谱在谐波频率上取样。' +
        '带参数的变换对点信号名即可在实验台里拖动滑块；「—」表示该信号不是周期的，没有傅里叶级数系数。';
      note.appendChild(nc);
      body.appendChild(note);
    },
    setFilter: function (k) { kindFilter = k; FT.PairsView.render(); },
    setSpark: function (v) { showSpark = v; FT.PairsView.render(); }
  };

})(window);


/* ===== sysview.js ===== */
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
      formula: 'H(j\\Wv)=\\begin{cases}1, & |\\Wv|<W\\\\ 0, & |\\Wv|>W\\end{cases}',
      params: [{ key: 'W', label: 'W', min: 0.5, max: 14, step: 0.1, def: 4, desc: '截止角频率' }],
      H: function (w, p, o) { o[0] = Math.abs(w) < p.W ? 1 : 0; o[1] = 0; },
      note: '理想低通是矩形频率响应 ⟹ 冲激响应是 Sa，非因果、不可实现；方波通过它必然出现 Gibbs 振铃，这正是「带限 = 振铃」的直观展示。'
    },
    {
      id: 'idealHP', name: '理想高通',
      formula: 'H(j\\Wv)=\\begin{cases}0, & |\\Wv|<W\\\\ 1, & |\\Wv|>W\\end{cases}',
      params: [{ key: 'W', label: 'W', min: 0.5, max: 14, step: 0.1, def: 3, desc: '截止角频率' }],
      H: function (w, p, o) { o[0] = Math.abs(w) > p.W ? 1 : 0; o[1] = 0; },
      note: '理想高通把直流和低频全部去掉：门函数过后只剩两个尖峰（边缘），也就是微分的效果。'
    },
    {
      id: 'idealBP', name: '理想带通（w₁ ~ w₂）',
      formula: 'H(j\\Wv)=\\begin{cases}1, & w_{1}<|\\Wv|<w_{2}\\\\ 0, & 其它\\end{cases}',
      params: [
        { key: 'w1', label: 'w_{1}', min: 0.2, max: 8, step: 0.1, def: 2, desc: '下边' },
        { key: 'w2', label: 'w_{2}', min: 1, max: 16, step: 0.1, def: 6, desc: '上边' }
      ],
      H: function (w, p, o) { var a = Math.abs(w); o[0] = (a > p.w1 && a < p.w2) ? 1 : 0; o[1] = 0; },
      note: '带通滤掉直流与低频，也滤掉高频，只留中间一段 —— 课件 slide 60「中心频率可变的带通滤波器」就是用它 + 移频做出来的。'
    },
    {
      id: 'rc', name: '一阶 RC 低通 1/(1+jω/ωc)',
      formula: 'H(j\\Wv)=\\frac{1}{1+j\\Wv/\\omega_{c}}',
      params: [{ key: 'wc', label: '\\omega_{c}', min: 0.5, max: 12, step: 0.1, def: 3, desc: '转折角频率' }],
      H: function (w, p, o) { var x = w / p.wc, d = 1 + x * x; o[0] = 1 / d; o[1] = -x / d; },
      note: '真实的低通：幅度按 1/√(1+(ω/ωc)²) 滚降（高频 −20 dB/十倍频），相位从 0 连续滞后到 −π/2 —— 非线性相位，所以方波过后边沿会变圆而不是振铃。'
    },
    {
      id: 'rcHP', name: '一阶 RC 高通 (jω/ωc)/(1+jω/ωc)',
      formula: 'H(j\\Wv)=\\frac{j\\Wv/\\omega_{c}}{1+j\\Wv/\\omega_{c}}',
      params: [{ key: 'wc', label: '\\omega_{c}', min: 0.5, max: 12, step: 0.1, def: 3, desc: '转折角频率' }],
      H: function (w, p, o) { var x = w / p.wc, d = 1 + x * x; o[0] = x * x / d; o[1] = x / d; },
      note: '隔直电容：直流增益 0，高频增益 1。ω=ωc 处幅度 1/√2、相位 +45°。'
    },
    {
      id: 'butter2', name: '二阶低通（两个一阶串联）',
      formula: 'H(j\\Wv)=\\frac{1}{(1+j\\Wv/\\omega_{c})^{2}}',
      params: [{ key: 'wc', label: '\\omega_{c}', min: 0.5, max: 12, step: 0.1, def: 3, desc: '转折角频率' }],
      H: function (w, p, o) {
        var x = w / p.wc, d = 1 + x * x, d2 = d * d;
        o[0] = (1 - x * x) / d2; o[1] = -2 * x / d2;
      },
      note: '对应表 4.2 的 t^{n-1}/(n-1)!·e^{-at}u(t) ⟷ 1/(a+jω)^n：阶数越高，滚降越陡、相位滞后越大（最大 −π）。'
    },
    {
      id: 'diff', name: '微分器 H = jω',
      formula: 'H(j\\Wv)=j\\Wv',
      params: [],
      H: function (w, p, o) { o[0] = 0; o[1] = w; },
      note: '幅度随 |ω| 线性上升 ⟹ 高频噪声被放大；相位恒为 π/2·sgn(ω)（一个理想的 90° 移相器）。'
    },
    {
      id: 'integ', name: '积分器 H = 1/(jω)',
      formula: 'H(j\\Wv)=\\frac{1}{j\\Wv}',
      params: [],
      H: function (w, p, o) { if (Math.abs(w) < 1e-9) { o[0] = 0; o[1] = 0; return; } o[0] = 0; o[1] = -1 / w; },
      note: '低频增益发散（ω→0 时 1/|ω|→∞），所以纯积分器对直流是不稳定的；相位恒为 −π/2·sgn(ω)。'
    },
    {
      id: 'delay', name: '纯延时（全通）H = e^{−jωt₀}',
      formula: 'H(j\\Wv)=e^{-j\\Wv t_{0}}',
      params: [{ key: 't0', label: 't_{0}', min: -4, max: 4, step: 0.1, def: 1.5, desc: '延时' }],
      H: function (w, p, o) { o[0] = Math.cos(-w * p.t0); o[1] = Math.sin(-w * p.t0); },
      note: '幅度恒 1、相位是过原点的斜直线 —— 线性相位系统不产生波形失真，只把信号整体平移。这是「无失真传输」的第二个条件。'
    },
    {
      id: 'linphaseLP', name: '线性相位低通（带延时）',
      formula: 'H(j\\Wv)=\\begin{cases}e^{-j\\Wv t_{0}}, & |\\Wv|<W\\\\ 0, & 其它\\end{cases}',
      params: [
        { key: 'W', label: 'W', min: 1, max: 14, step: 0.1, def: 5, desc: '截止' },
        { key: 't0', label: 't_{0}', min: 0, max: 4, step: 0.1, def: 1.5, desc: '群延时' }
      ],
      H: function (w, p, o) {
        if (Math.abs(w) > p.W) { o[0] = 0; o[1] = 0; return; }
        o[0] = Math.cos(-w * p.t0); o[1] = Math.sin(-w * p.t0);
      },
      note: '无失真传输的两个条件：通带内幅度是常数、相位是 ω 的线性函数。把 t₀ 设为 0 就能看到「幅度对了但相位非线性」造成的对称失真。'
    },
    {
      id: 'rational', name: '自定义有理式（微分方程系数）',
      formula: 'H(j\\Wv)=\\frac{b_{M}(j\\Wv)^{M}+\\cdots+b_{1}(j\\Wv)+b_{0}}{(j\\Wv)^{N}+a_{N-1}(j\\Wv)^{N-1}+\\cdots+a_{1}(j\\Wv)+a_{0}}',
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
    charts.spec.setImpulses([]);
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
      html += M.render('H(j\\Wv)=\\frac{' + polyLatex(st.num) + '}{' + polyLatex(st.den) + '}');
      html += '<div class="ode-eq">' + M.render(odeLatex(st.num, st.den)) + '</div>';
    } else {
      html += M.render(S.formula);
    }
    html += '<div class="pair">' + M.render('h(\\Tv)\\;\\longleftrightarrow\\;H(j\\Wv)') + '</div>';
    box.innerHTML = html;
  }

  function polyLatex(c) {
    var parts = [];
    for (var k = 0; k < c.length; k++) {
      var v = c[k];
      if (Math.abs(v) < 1e-12) continue;
      var av = Math.abs(v);
      var numPart = (k > 0 && Math.abs(av - 1) < 1e-12) ? '' : UI.trim(av);
      var pw = k === 0 ? '' : (k === 1 ? '(j\\Wv)' : '(j\\Wv)^{' + k + '}');
      var term = numPart + pw;
      if (!term) term = UI.trim(av);
      parts.push({ neg: v < 0, txt: term });
    }
    if (!parts.length) return '0';
    var s = (parts[0].neg ? '-' : '') + parts[0].txt;
    for (var i = 1; i < parts.length; i++) s += (parts[i].neg ? '-' : '+') + parts[i].txt;
    return s;
  }

  function odeLatex(num, den) {
    function side(c, v) {
      var parts = [];
      for (var k = 0; k < c.length; k++) {
        var val = c[k];
        if (Math.abs(val) < 1e-12) continue;
        var av = Math.abs(val);
        var coef = (av === 1 && k > 0) ? '' : UI.trim(av);
        var der = k === 0 ? v + '(' + '\\Tv' + ')' :
          '\\frac{d^{' + k + '}\\,' + v + '}{d\\Tv^{' + k + '}}';
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
    box.appendChild(UI.sliderRow({ key: 'wmax', label: '\\omega_{max}', min: 6, max: 60, step: 1, def: 20, desc: 'rad/s' },
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


/* ===== modview.js ===== */
/* ==========================================================================
   modview.js —— 4.5 相乘性质：幅度调制 / 同步解调 / 可调带通 / 频谱搬移混叠
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML, C = FT.COLORS;
  var PI = Math.PI, TAU = 2 * Math.PI;

  var Mod = FT.Mod = {};
  var NW = 1400, NT = 700;

  var st = Mod.state = {
    scene: 'am',
    base: 'gate',
    baseParams: { T1: 1 },
    w0: 6,
    wc: 4,
    tmax: 10,
    wmax: 24
  };

  var host, charts = [];

  /* 理想低通与常数缩放算子见 props.js 的 FT.lpf / FT.scaled */
  var lpf = FT.lpf, scaled = FT.scaled;

  function baseLayer() {
    var s = FT.getSignal(st.base);
    var p = {};
    (s.params || []).forEach(function (d) { p[d.key] = st.baseParams[d.key] !== undefined ? st.baseParams[d.key] : d.def; });
    st.baseParams = p;
    return FT.buildBaseLayer(s, p);
  }

  /* --------------------------------------------------------------- 场景 */
  function buildScene() {
    var L = baseLayer(), w0 = st.w0, wc = st.wc;
    var out = [];
    var notes = [];

    if (st.scene === 'am' || st.scene === 'demod') {
      var R = FT.PROP.modulate.apply(L, { w0: w0 });
      out.push({ title: '基带信号 s(t)', kind: 'time', layer: L });
      out.push({ title: '基带频谱 S(jω)', kind: 'mag', layer: L });
      out.push({ title: '已调信号 r(t)=s(t)·cos ω₀t（虚线为包络 ±s(t)）', kind: 'time', layer: R, envelope: L });
      out.push({ title: '已调频谱 R(jω) = ½S[j(ω−ω₀)] + ½S[j(ω+ω₀)]', kind: 'mag', layer: R });

      if (st.scene === 'demod') {
        var D = FT.PROP.modulate.apply(R, { w0: w0 });
        var F = lpf(D, wc);
        var Fs = scaled(F, 2);
        out.push({ title: '相干解调 r(t)·cos ω₀t 的频谱：½S + ¼S(±2ω₀)', kind: 'mag', layer: D, lpfAt: wc });
        out.push({ title: '低通滤波后 ×2 恢复：与 s(t) 对比（灰）', kind: 'time', layer: Fs, ghost: L });
        notes.push({ cls: 'key', text: '解调后再乘一次 cos ω₀t：频谱被复制成 4 份 —— 中间 ½S(jω) 是原谱，±2ω₀ 处各有一份 ¼S(jω) 的高频残留，用低通滤掉即可。' });
        notes.push({ cls: 'tip', text: '恢复结果整体是原来的 ½，所以乘 2 补偿。低通截止 wc 必须大于基带带宽、又小于 2ω₀ 减去基带带宽，否则要么滤不干净、要么把有用信号切掉。' });
      } else {
        notes.push({ cls: 'key', text: '相乘性质：x₁(t)x₂(t) ⟷ (1/2π)X₁(jω)*X₂(jω)。这里 x₂=cos ω₀t，其频谱是 π[δ(ω−ω₀)+δ(ω+ω₀)]，卷积只是把 S 搬过去，系数 (1/2π)·π = ½。' });
        notes.push({ cls: 'warn', text: '载波频率必须高于基带最高频率，否则正负搬移的两份会重叠 —— 那就是频谱混叠，解调时无法分开。把 ω₀ 调小可以亲眼看到。' });
      }
    }

    if (st.scene === 'bpf') {
      var up = FT.PROP.freqshift.apply(L, { w0: -w0 });
      var fl = lpf(up, wc);
      var dn = FT.PROP.freqshift.apply(fl, { w0: w0 });
      out.push({ title: '输入 x(t)', kind: 'time', layer: L });
      out.push({ title: '输入频谱 X(jω)', kind: 'mag', layer: L });
      out.push({ title: '① 乘 e^{−jω₀t}：把 ω₀ 附近搬到原点', kind: 'mag', layer: up });
      out.push({ title: '② 低通 |ω|<ωc 取出想要的频段', kind: 'mag', layer: fl, lpfAt: wc });
      out.push({ title: '③ 乘 e^{+jω₀t} 搬回去 = 中心频率可调的带通', kind: 'mag', layer: dn });
      out.push({ title: '输出 y(t)（灰为输入）', kind: 'time', layer: dn, ghost: L });
      notes.push({ cls: 'key', text: '课件 slide 60 的思路：用移频把感兴趣的频段搬到原点，过一个固定低通，再搬回去。等效中心频率 ω₀、带宽 2ωc 的可调带通 —— 硬件上这就是超外差接收机的雏形。' });
      notes.push({ cls: 'warn', text: '搬回原点再滤波会产生振铃（理想低通的非因果性），输出波形两侧出现 sinc 纹波是正常现象。' });
    }

    if (st.scene === 'alias') {
      var R2 = FT.PROP.modulate.apply(L, { w0: w0 });
      var D2 = FT.PROP.modulate.apply(R2, { w0: w0 });
      var F2 = lpf(D2, wc);
      out.push({ title: 'S(jω)：基带频谱', kind: 'mag', layer: L });
      out.push({ title: 'R(jω)：搬移到 ±ω₀ 的两份', kind: 'mag', layer: R2 });
      out.push({ title: '解调后 r(t)·cos ω₀t：中心 + ±2ω₀', kind: 'mag', layer: D2 });
      out.push({ title: '低通输出（灰为原信号）', kind: 'time', layer: F2, ghost: L });
      notes.push({ cls: 'warn', text: '把 ω₀ 从大往小拖：两份搬移的频谱先是分开、然后相交、最后完全重叠。重叠之后无论怎么滤波都恢复不出原信号 —— 这就是「载波频率必须高于信号带宽」的几何意义。' });
    }

    return { panels: out, notes: notes };
  }

  /* --------------------------------------------------------------- 绘制 */
  function renderScene() {
    var sc = buildScene();
    UI.clear(host);
    charts = [];

    var grid = null;
    sc.panels.forEach(function (pn, idx) {
      if (idx % 2 === 0) { grid = UI.el('div', { class: 'mod-charts-row' }); host.appendChild(grid); }
      var card = UI.el('div', { class: 'chart-card' });
      var head = UI.el('div', { class: 'chart-head' });
      head.appendChild(UI.el('div', { class: 'chart-title' }, [
        UI.el('span', { class: 'dot ' + (pn.kind === 'time' ? 'dot-x' : pn.kind === 'mag' ? 'dot-mag' : 'dot-phase') }),
        document.createTextNode(pn.title)
      ]));
      card.appendChild(head);
      var box = UI.el('div', { class: 'canvas-box', style: 'height:176px' });
      var cv = UI.el('canvas');
      var ro = UI.el('div', { class: 'chart-readout' });
      box.appendChild(cv); box.appendChild(ro);
      card.appendChild(box);
      grid.appendChild(card);

      var ch = new Chart(cv, ro, {
        xlabel: pn.kind === 'time' ? 't' : 'ω',
        xLabel: pn.kind === 'time' ? 't' : 'ω',
        piTicks: pn.kind !== 'time',
        padL: 48
      });
      charts.push(ch);

      var opts = {
        tmin: -st.tmax, tmax: st.tmax, Nt: NT,
        wmin: -st.wmax, wmax: st.wmax, Nw: NW, wmaxAbs: st.wmax,
        reconstructTime: !!(pn.layer.meta && pn.layer.meta.reconstruct)
      };
      var r = FT.render(pn.layer, opts);
      var n = r.w.length;
      var mag = new Float64Array(n), ph = new Float64Array(n);
      var mx = 0;
      for (var i = 0; i < n; i++) {
        var m = Math.hypot(r.Xre[i], r.Xim[i]);
        mag[i] = m; if (m > mx) mx = m;
        ph[i] = m < 1e-9 ? NaN : Math.atan2(r.Xim[i], r.Xre[i]);
      }
      var series = [], imps = [];
      if (pn.kind === 'time') {
        if (pn.ghost) {
          var g = FT.render(pn.ghost, { tmin: -st.tmax, tmax: st.tmax, Nt: NT, wmin: -st.wmax, wmax: st.wmax, Nw: 8, wmaxAbs: st.wmax, reconstructTime: false });
          series.push({ x: g.t, y: g.xre, color: C.ghost, width: 1.4, dash: [5, 4], label: '原' });
        }
        series.push({ x: r.t, y: r.xre, color: C.x, width: 2, label: 'Re' });
        if (pn.envelope) {
          var e = FT.render(pn.envelope, { tmin: -st.tmax, tmax: st.tmax, Nt: NT, wmin: -st.wmax, wmax: st.wmax, Nw: 8, wmaxAbs: st.wmax, reconstructTime: false });
          series.push({ x: e.t, y: e.xre, color: C.y, width: 1.2, dash: [3, 3], alpha: .85, label: '+s' });
          var neg = new Float64Array(e.xre.length);
          for (var q = 0; q < neg.length; q++) neg[q] = -e.xre[q];
          series.push({ x: e.t, y: neg, color: C.y, width: 1.2, dash: [3, 3], alpha: .85, label: '−s' });
        }
        ch.setDomain(-st.tmax, st.tmax);
        r.timp.forEach(function (tp) { imps.push({ x: tp.t, y: Math.hypot(tp.re, tp.im), color: C.x, label: tp.order ? 'δ′' : '1' }); });
      } else if (pn.kind === 'mag') {
        series.push({ x: r.w, y: mag, color: C.mag, width: 2, fill: C.fillMag, label: '|X|' });
        r.wimp.forEach(function (q) { imps.push({ x: q.w, y: Math.hypot(q.re, q.im), color: C.mag, label: UI.trim(Math.hypot(q.re, q.im)) }); });
        ch.setDomain(-st.wmax, st.wmax);
        if (pn.lpfAt) {
          ch.setVLine([{ x: pn.lpfAt, color: C.y, label: 'ωc', dash: [4, 3] }, { x: -pn.lpfAt, color: C.y, dash: [4, 3] }]);
        } else ch.setVLine([]);
      } else {
        series.push({ x: r.w, y: ph, color: C.phase, width: 2, label: '∠X' });
        ch.setDomain(-st.wmax, st.wmax);
        ch.setVLine([]);
      }
      ch.setSeries(series);
      ch.setImpulses(imps);
      if (pn.kind !== 'mag') ch.setVLine([]);
      ch.draw();
    });

    var noteBox = document.getElementById('modNote');
    noteBox.innerHTML = sc.notes.map(function (x) { return '<span class="note ' + x.cls + '">' + x.text + '</span>'; }).join('');

    var alias = document.getElementById('modAliasWarn').checked;
    if (alias) {
      var bw = bandwidthOf();
      if (st.w0 <= bw) {
        noteBox.innerHTML += '<span class="note warn" style="display:block">⚠ 当前 ω₀ = ' + UI.trim(st.w0) +
          ' rad/s ≤ 基带带宽 ≈ ' + UI.trim(bw) + ' rad/s，两份搬移的频谱已经重叠，无法无失真解调。</span>';
      }
    }
  }

  function bandwidthOf() {
    var p = st.baseParams;
    if (st.base === 'gate') return PI / (p.T1 || 1);
    if (st.base === 'tri') return 2 * PI / (p.tau || 1);
    if (st.base === 'exp1s') return 4 * (p.a || 1);
    if (st.base === 'sincW') return p.W || 1;
    return 4;
  }

  /* --------------------------------------------------------------- 界面 */
  var SCENES = [
    { id: 'am', name: '正弦幅度调制', desc: 's(t)·cos ω₀t ⟷ ½S[j(ω−ω₀)]+½S[j(ω+ω₀)]' },
    { id: 'demod', name: '同步（相干）解调', desc: '再乘 cos ω₀t，然后低通滤波恢复基带' },
    { id: 'bpf', name: '中心频率可调带通', desc: '移频 → 低通 → 移回：课件 slide 60 的测试题' },
    { id: 'alias', name: '搬移量过小 → 混叠', desc: 'ω₀ 小于基带带宽时会发生什么' }
  ];

  function renderControls() {
    var chips = document.getElementById('modSceneChips');
    UI.clear(chips);
    SCENES.forEach(function (s) {
      var c = UI.chip(s.name, s.desc, st.scene === s.id, function () {
        st.scene = s.id; renderControls(); renderScene();
      });
      c.classList.add('chip-wide');
      chips.appendChild(c);
    });

    var ps = document.getElementById('modParams');
    UI.clear(ps);
    var baseSel = UI.el('select', {
      onchange: function () {
        st.base = baseSel.value;
        var s = FT.getSignal(st.base);
        st.baseParams = FT.defaultParams(s);
        renderControls(); renderScene();
      }
    });
    [['gate', '门脉冲（矩形基带）'], ['tri', '三角脉冲'], ['exp1s', '单边指数'], ['sincW', 'Sa 型（带限基带）']].forEach(function (o) {
      baseSel.appendChild(UI.el('option', { value: o[0], text: o[1], selected: st.base === o[0] }));
    });
    var fld = UI.el('div', { class: 'field' });
    fld.appendChild(UI.el('label', { text: '基带信号 s(t)' }));
    fld.appendChild(baseSel);
    ps.appendChild(fld);

    var s = FT.getSignal(st.base);
    (s.params || []).forEach(function (d) {
      ps.appendChild(UI.sliderRow(d, st.baseParams[d.key], function (v) { st.baseParams[d.key] = v; renderScene(); }));
    });
    ps.appendChild(UI.sliderRow({ key: 'w0', label: '\\omega_{0}', min: 0.5, max: 16, step: 0.1, def: 6, desc: '载波角频率' },
      st.w0, function (v) { st.w0 = v; renderScene(); }));
    ps.appendChild(UI.sliderRow({ key: 'wc', label: '\\omega_{c}', min: 0.5, max: 16, step: 0.1, def: 4, desc: '低通截止' },
      st.wc, function (v) { st.wc = v; renderScene(); }));
    ps.appendChild(UI.sliderRow({ key: 'wmax', label: '\\omega_{max}', min: 8, max: 60, step: 1, def: 24, desc: '显示范围' },
      st.wmax, function (v) { st.wmax = v; renderScene(); }));

    document.getElementById('modLpf').addEventListener('change', renderScene);
    document.getElementById('modAliasWarn').addEventListener('change', renderScene);

    var f = document.getElementById('modFormula');
    f.innerHTML = M.render('x_{1}(\\Tv)x_{2}(\\Tv)\\;\\longleftrightarrow\\;\\frac{1}{2\\pi}\\left[X_{1}(j\\Wv)*X_{2}(j\\Wv)\\right]') +
      '<div style="margin-top:8px">' + M.render('\\cos\\omega_{0}\\Tv\\;\\longleftrightarrow\\;\\pi[\\delta(\\Wv-\\omega_{0})+\\delta(\\Wv+\\omega_{0})]') + '</div>' +
      '<div style="margin-top:8px">' + M.render('r(\\Tv)=s(\\Tv)\\cos\\omega_{0}\\Tv\\;\\longleftrightarrow\\;\\tfrac{1}{2}S[j(\\Wv-\\omega_{0})]+\\tfrac{1}{2}S[j(\\Wv+\\omega_{0})]') + '</div>';
  }

  Mod.init = function () {
    if (host) return;
    host = document.getElementById('modCharts');
    renderControls();
    renderScene();
  };

})(window);


/* ===== topicsview.js ===== */
/* ==========================================================================
   topicsview.js —— 课件补充专题：
   1 离散谱→连续谱  2 时宽↔频宽  3 Gibbs  4 带宽  5 对偶性
   6 Parseval      7 u(t) 的频谱  8 采样定理
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML, C = FT.COLORS;
  var PI = Math.PI, TAU = 2 * Math.PI;
  var Topics = FT.Topics = {};

  var container, current = 'lines2cont', live = [];

  function sa(x) { return Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x; }

  /* ---------------------------------------------------- 面板工厂 */
  function makeRow(parent) {
    var r = UI.el('div', { class: 'mod-charts-row' });
    parent.appendChild(r);
    return r;
  }
  function makeStack(parent) {
    var s = UI.el('div', { class: 'topic-charts' });
    parent.appendChild(s);
    return s;
  }

  function panel(parent, title, height) {
    var card = UI.el('div', { class: 'chart-card' });
    var head = UI.el('div', { class: 'chart-head' });
    head.appendChild(UI.el('div', { class: 'chart-title', text: title }));
    var act = UI.el('div', { class: 'chart-actions' });
    var bFit = UI.el('button', { class: 'btn btn-tiny', text: '自适应', onclick: function () { ch.resetY(); ch.draw(); } });
    var bExp = UI.el('button', { class: 'btn btn-tiny', text: '导出', onclick: function () { ch.exportPNG('ft-topic'); UI.toast('已导出 PNG'); } });
    act.appendChild(bFit); act.appendChild(bExp);
    head.appendChild(act);
    card.appendChild(head);
    var box = UI.el('div', { class: 'canvas-box', style: 'height:' + (height || 190) + 'px' });
    var cv = UI.el('canvas'), ro = UI.el('div', { class: 'chart-readout' });
    box.appendChild(cv); box.appendChild(ro);
    card.appendChild(box);
    parent.appendChild(card);
    var ch = new Chart(cv, ro, { piTicks: true, padL: 50 });
    live.push(ch);
    return ch;
  }

  function sidePanel(parent, title) {
    var p = UI.el('div', { class: 'panel' });
    p.appendChild(UI.el('div', { class: 'panel-head' }, [UI.el('h2', { text: title })]));
    parent.appendChild(p);
    return p;
  }

  function readouts(parent, items) {
    var g = UI.el('div', { class: 'insight-grid' });
    g.innerHTML = items.map(function (m) {
      return '<div class="insight' + (m.hi ? ' accent' : '') + '"><div class="k">' + m.k + '</div><div class="v' + (m.mx ? ' mx' : '') + '">' + m.v + '</div></div>';
    }).join('');
    parent.appendChild(g);
    return g;
  }

  function notes(parent, list) {
    var d = UI.el('div', { class: 'formula-notes' });
    d.innerHTML = list.map(function (n) { return '<span class="note ' + n.cls + '">' + n.text + '</span>'; }).join('');
    parent.appendChild(d);
    return d;
  }

  function head(host, title, desc, formula) {
    var d = UI.el('div', { class: 'topic-head' });
    d.appendChild(UI.el('h3', { text: title }));
    if (desc) d.appendChild(UI.el('p', { text: desc }));
    if (formula) d.appendChild(UI.el('div', { class: 'formula-box', style: 'margin-top:10px', html: M.render(formula) }));
    host.appendChild(d);
  }

  function grid(host) {
    var g = UI.el('div', { class: 'topic-body-grid' });
    host.appendChild(g);
    var left = UI.el('div', {});
    var right = UI.el('div', { class: 'topic-side' });
    g.appendChild(left); g.appendChild(right);
    return { left: left, right: right };
  }

  /* 动画按钮 */
  function animButton(box, get, set, lo, hi, refresh, label) {
    var playing = null;
    var b = UI.el('button', { class: 'play-btn', text: '▶ ' + (label || '自动扫描') });
    b.addEventListener('click', function () {
      if (playing) { cancelAnimationFrame(playing); playing = null; b.textContent = '▶ ' + (label || '自动扫描'); b.classList.remove('alt'); return; }
      b.textContent = '⏸ 暂停'; b.classList.add('alt');
      var dir = 1;
      function step() {
        var v = get() + dir * (hi - lo) / 260;
        if (v >= hi) { v = hi; dir = -1; }
        if (v <= lo) { v = lo; dir = 1; }
        set(v); refresh();
        playing = requestAnimationFrame(step);
      }
      playing = requestAnimationFrame(step);
    });
    box.appendChild(b);
    return b;
  }

  /* ================================================================ 专题 1 */
  function topicLines(host) {
    var st = { T0: 6, T1: 1, wmax: 12 };
    head(host, '① 周期 T₀ → ∞：离散谱如何长成连续谱',
      '课件 slide 7–11：周期矩形脉冲的谱线高度按 1/T₀ 下降、间隔按 2π/T₀ 变密，但包络 2T₁Sa(ωT₁) 始终不变。' +
      '把 T₀ 一路推到很大，就得到非周期单个矩形脉冲的连续频谱。');
    var g = grid(host), L = g.left, R = g.right;
    var stack = makeStack(L);
    var chT = panel(stack, '时域：周期矩形脉冲', 160);
    var chF = panel(stack, '频谱：谱线 2πa_k 与包络 X(jω)', 230);

    var side = sidePanel(R, '参数');
    var sT0 = UI.sliderRow({ key: 'T0', label: 'T_{0}', min: 2.5, max: 40, step: 0.25, desc: '周期' }, st.T0, function (v) { st.T0 = v; upd(); });
    var sT1 = UI.sliderRow({ key: 'T1', label: 'T_{1}', min: 0.3, max: 4, step: 0.05, desc: '脉冲半宽' }, st.T1, function (v) { st.T1 = v; upd(); });
    side.appendChild(sT0); side.appendChild(sT1);
    var animBox = UI.el('div', { class: 'btn-row' });
    side.appendChild(animBox);
    var roBox = UI.el('div', {});
    R.appendChild(roBox);
    var noteBox = UI.el('div', {});
    R.appendChild(noteBox);

    var sig = FT.getSignal('periodicRect');
    function upd() {
      var p = { T0: st.T0, T1: st.T1 };
      var lay = FT.buildBaseLayer(sig, p);
      var tmax = Math.min(60, st.T0 * 2.4);
      var r = FT.render(lay, { tmin: -tmax, tmax: tmax, Nt: 700, wmin: -st.wmax, wmax: st.wmax, Nw: 1200, wmaxAbs: st.wmax, reconstructTime: false });
      chT.setDomain(-tmax, tmax);
      chT.setSeries([{ x: r.t, y: r.xre, color: C.x, width: 1.8, label: 'x' }]);
      chT.setImpulses([]); chT.draw();

      var env = new Float64Array(r.w.length);
      for (var i = 0; i < r.w.length; i++) env[i] = 2 * st.T1 * sa(r.w[i] * st.T1);
      chF.setDomain(-st.wmax, st.wmax);
      chF.setSeries([
        { x: r.w, y: env, color: C.ghost, width: 1.5, dash: [5, 4], label: '包络' },
        { x: r.w, y: r.Xre, color: C.mag, width: 1.2, alpha: .001, label: '' }
      ]);
      chF.setImpulses(r.wimp.map(function (q) { return { x: q.w, y: q.re, color: C.mag, width: 2.2 }; }));
      chF.draw();

      var w0 = TAU / st.T0;
      UI.clear(roBox);
      readouts(roBox, [
        { k: '谱线间隔 ω₀ = 2π/T₀', v: UI.trim(w0) + ' rad/s', hi: true },
        { k: '中心谱线高度 2πa₀', v: UI.trim(TAU * 2 * st.T1 / st.T0) },
        { k: '包络峰值 X(j0)', v: UI.trim(2 * st.T1), hi: true },
        { k: '第一过零点 π/T₁', v: UI.trim(PI / st.T1) },
        { k: '窗口内谱线条数', v: String(r.wimp.length) },
        { k: 'T₀·a₀', v: UI.trim(st.T0 * 2 * st.T1 / st.T0) + ' = 2T₁（不变）' }
      ]);
      UI.clear(noteBox);
      notes(noteBox, [
        { cls: 'key', text: '谱线高度 = 2πa_k = (Δω/2π)·X(jω)|_{ω=kω₀}，即「包络 × 谱线间隔 / 2π」。间隔趋于 0 时高度也趋于 0，但比值 X(jω) 保持有限 —— 这就是频谱密度函数的来历。' },
        { cls: 'tip', text: '看包络：它只跟 T₁ 有关，与 T₀ 完全无关。改变周期只改变「取样密度」，不改变包络形状。' }
      ]);
      if (animBox.childNodes.length < 2) {
        animButton(animBox, function () { return st.T0; }, function (v) { st.T0 = v; sT0.set(v); }, 2.5, 40, upd, 'T₀ 扫描');
      }
    }
    upd();
  }

  /* ================================================================ 专题 2 */
  function topicUncertainty(host) {
    var st = { T1: 1.6 };
    head(host, '② 时域越窄，频域越宽',
      '课件 slide 20 的结论：「信号在时域和频域之间有一种相反的关系」。宽度 2T₁ 的门函数，峰值 2T₁、第一零点 π/T₁，' +
      '两者的乘积恒等于 π —— 这就是不确定性原理在这一章的样子。');
    var g = grid(host), L = g.left, R = g.right;
    var row = makeRow(L);
    var chT = panel(row, 'x(t)：门宽 2T₁', 175);
    var chM = panel(row, '|X(jω)| = 2T₁|Sa(ωT₁)|', 175);
    var row2 = makeRow(L);
    var chM2 = panel(row2, '峰值 × 主瓣半宽 = 常数（纵轴为乘积）', 150);

    var side = sidePanel(R, '参数');
    var s = UI.sliderRow({ key: 'T1', label: 'T_{1}', min: 0.25, max: 4, step: 0.05, desc: '半宽' }, st.T1, function (v) { st.T1 = v; upd(); });
    side.appendChild(s);
    var ab = UI.el('div', { class: 'btn-row' }); side.appendChild(ab);
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    var prod = [], prodX = [];
    function upd() {
      var T1 = st.T1;
      var sig = FT.getSignal('gate');
      var lay = FT.buildBaseLayer(sig, { T1: T1 });
      var tm = Math.max(4, T1 * 4), wm = Math.min(60, 3.2 * PI / T1);
      var r = FT.render(lay, { tmin: -tm, tmax: tm, Nt: 600, wmin: -wm, wmax: wm, Nw: 1400, wmaxAbs: wm, reconstructTime: false });
      var n = r.w.length, mag = new Float64Array(n);
      for (var i = 0; i < n; i++) mag[i] = Math.abs(r.Xre[i]);
      chT.setDomain(-tm, tm);
      chT.setSeries([{ x: r.t, y: r.xre, color: C.x, width: 2, fill: C.fill, label: 'x' }]);
      chT.setVLine([{ x: -T1, label: '−T₁', color: '#c9d5e8' }, { x: T1, label: 'T₁', color: '#c9d5e8' }]);
      chT.draw();
      chM.setDomain(-wm, wm);
      chM.setSeries([{ x: r.w, y: mag, color: C.mag, width: 2, label: '|X|' }]);
      chM.setVLine([{ x: PI / T1, label: 'π/T₁', color: '#f0c9a8' }, { x: -PI / T1, label: '−π/T₁', color: '#f0c9a8' }]);
      chM.draw();

      prod = []; prodX = [];
      for (var q = 0.25; q <= 4.01; q += 0.05) { prod.push(2 * q * PI / q); prodX.push(q); }
      chM2.setDomain(0.25, 4);
      chM2.setSeries([
        { x: prodX, y: prod, color: C.y, width: 2, label: '峰值×半主瓣' },
        { x: [0.25, 4], y: [2 * PI, 2 * PI], color: C.ghost, width: 1.2, dash: [5, 4] }
      ]);
      chM2.setVLine([{ x: T1, label: '当前 T₁', color: '#c9d5e8' }]);
      chM2.draw();

      UI.clear(roBox);
      readouts(roBox, [
        { k: '时域脉宽 2T₁', v: UI.trim(2 * T1) + ' s', hi: true },
        { k: '频谱峰值 X(j0)', v: UI.trim(2 * T1) + '（= 面积）', hi: true },
        { k: '第一零点 π/T₁', v: UI.trim(PI / T1) + ' rad/s' },
        { k: '主瓣全宽 2π/T₁', v: UI.trim(2 * PI / T1) + ' rad/s' },
        { k: '峰值 × 主瓣半宽', v: UI.trim(2 * T1 * PI / T1) + ' = 2π（恒定）' },
        { k: '面积 × 带宽', v: UI.trim(2 * T1 * 2 * PI / T1) + ' = 4π（恒定）' }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: '面积（=X(j0)）与主瓣宽度成反比，乘积恒为常数。想压缩频谱就得摊宽时域，反之亦然 —— 任何「既窄又带限」的信号都不存在。' },
        { cls: 'tip', text: '工程含义：要传输更宽的频带，就必须用更短的脉冲；反过来，短脉冲（如冲激）天然覆盖全频谱。' }
      ]);
      if (ab.childNodes.length < 2) animButton(ab, function () { return st.T1; }, function (v) { st.T1 = v; s.set(v); }, 0.25, 4, upd, 'T₁ 扫描');
    }
    upd();
  }

  /* ================================================================ 专题 3 */
  function topicGibbs(host) {
    var st = { N: 6, wmax: 30 };
    head(host, '③ 收敛与 Gibbs 现象',
      '课件 slide 15：傅里叶积分在间断点处收敛于左右极限的平均值，而不是函数本身；' +
      '并且在间断点附近出现过冲，极限值约 8.949% —— 加再多谐波也不会消失，只会向间断点挤压。');
    var g = grid(host), L = g.left, R = g.right;
    var stack = makeStack(L);
    var ch1 = panel(stack, '方波的傅里叶级数部分和（虚线 = 目标方波）', 200);
    var ch2 = panel(stack, '过冲百分比随谐波次数 N 的变化（渐近 8.949%）', 165);

    var side = sidePanel(R, '参数');
    var s = UI.sliderRow({ key: 'N', label: 'N', min: 1, max: 80, step: 1, desc: '保留的谐波项数' }, st.N, function (v) { st.N = v; upd(); });
    side.appendChild(s);
    var ab = UI.el('div', { class: 'btn-row' }); side.appendChild(ab);
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    var w0 = 1;
    function partial(t, N) {
      var s = 0;
      for (var m = 0; m < N; m++) {
        var k = 2 * m + 1;
        s += Math.sin(k * w0 * t) * 4 / (k * PI);
      }
      return s;
    }
    function upd() {
      var tm = 8, nt = 900;
      var tt = FT.linspace(-tm, tm, nt), yy = new Float64Array(nt), sq = new Float64Array(nt);
      for (var i = 0; i < nt; i++) {
        yy[i] = partial(tt[i], st.N);
        var m = ((tt[i] + PI) % TAU + TAU) % TAU;
        sq[i] = m < PI ? 1 : -1;
      }
      ch1.setDomain(-tm, tm);
      ch1.setSeries([
        { x: tt, y: sq, color: C.ghost, width: 1.3, dash: [5, 4], label: '方波' },
        { x: tt, y: yy, color: C.x, width: 2, label: 'S_N' }
      ]);
      ch1.setHLine([{ y: 1, label: '+1', color: '#dbe4f0' }, { y: -1, label: '−1', color: '#dbe4f0' }, { y: 0, label: '0（间断点的收敛值）', color: '#f0c9a8', dash: [2, 3] }]);
      ch1.setVLine([{ x: 0, label: '间断点', color: '#c9d5e8' }]);
      ch1.draw();

      var xs = [], os = [];
      for (var N = 1; N <= 80; N++) {
        xs.push(N);
        var mx = 0;
        for (var q = 0.0005; q < PI; q += 0.0005) { var v = partial(q, N); if (v > mx) mx = v; }
        os.push((mx - 1) * 100);
      }
      ch2.setDomain(1, 80);
      ch2.setSeries([
        { x: xs, y: os, color: C.phase, width: 2, label: '过冲%' },
        { x: [1, 80], y: [8.949, 8.949], color: C.danger, width: 1.3, dash: [5, 4] }
      ]);
      ch2.setVLine([{ x: st.N, label: '当前 N', color: '#c9d5e8' }]);
      ch2.draw();

      var cur = os[Math.min(79, st.N - 1)];
      UI.clear(roBox);
      readouts(roBox, [
        { k: '当前项数 N', v: String(st.N), hi: true },
        { k: '峰值过冲', v: UI.trim(cur, 2) + ' %', hi: true },
        { k: 'Gibbs 极限', v: '8.949 %（= ∫₀^π sin t dt / π − 1）' },
        { k: '间断点处收敛值', v: '0 = (1 + (−1))/2' },
        { k: '过渡带宽度', v: '≈ 2π/N ≈ ' + UI.trim(TAU / st.N, 3) }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: '过冲的百分比不随 N 减小 —— 收敛是「几乎处处」的，不是「一致」的。要消除它得用 Fejér（三角窗）平均，而不是硬截断。' },
        { cls: 'warn', text: '实验台里给门函数加「微分」，或者在系统频响里用理想低通过方波，看到的振铃就是同一个现象：频域硬截断 ⟺ 时域 sinc 卷积。' }
      ]);
      if (ab.childNodes.length < 2) animButton(ab, function () { return st.N; }, function (v) { st.N = Math.round(v); s.set(st.N); }, 1, 80, upd, 'N 扫描');
    }
    upd();
  }

  /* ================================================================ 专题 4 */
  function topicBandwidth(host) {
    var st = { a: 1, T1: 1.2 };
    head(host, '④ 带宽的两种定义',
      '课件 slide 24：(1) |X| 降到最大值的 1/√2（带内能量占一半）—— 用于单峰谱；' +
      '(2) 对 Sa 型包络取第一零点内的主瓣宽度 —— 用于矩形/抽样信号。');
    var g = grid(host), L = g.left, R = g.right;
    var row = makeRow(L);
    var ch1 = panel(row, '单边指数：3 dB 带宽', 185);
    var ch2 = panel(row, '门函数：主瓣带宽', 185);
    var row2 = makeRow(L);
    var ch3 = panel(row2, '能量累积曲线（带内能量占比）', 160);

    var side = sidePanel(R, '参数');
    side.appendChild(UI.sliderRow({ key: 'a', label: 'a', min: 0.3, max: 4, step: 0.05, desc: '指数衰减系数' }, st.a, function (v) { st.a = v; upd(); }));
    side.appendChild(UI.sliderRow({ key: 'T1', label: 'T_{1}', min: 0.4, max: 3, step: 0.05, desc: '门半宽' }, st.T1, function (v) { st.T1 = v; upd(); }));
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    function upd() {
      var wm = 22, nw = 900;
      var w = FT.linspace(-wm, wm, nw);
      var e1 = new Float64Array(nw), e2 = new Float64Array(nw), m1 = new Float64Array(nw), m2 = new Float64Array(nw);
      for (var i = 0; i < nw; i++) {
        var x = w[i];
        m1[i] = 1 / Math.sqrt(st.a * st.a + x * x);
        m2[i] = Math.abs(2 * st.T1 * sa(x * st.T1));
        e1[i] = m1[i] * m1[i];
        e2[i] = m2[i] * m2[i];
      }
      ch1.setDomain(-wm, wm);
      ch1.setSeries([{ x: w, y: m1, color: C.mag, width: 2, label: '|X|' }]);
      ch1.setHLine([{ y: 1 / (Math.SQRT2 * st.a), label: '峰值/√2', color: '#f0c9a8' }]);
      ch1.setVLine([{ x: st.a, label: 'ω₃=a', color: C.y }, { x: -st.a, label: '−a', color: C.y }]);
      ch1.draw();

      ch2.setDomain(-wm, wm);
      ch2.setSeries([{ x: w, y: m2, color: C.mag, width: 2, label: '|X|' }]);
      ch2.setVLine([{ x: PI / st.T1, label: 'π/T₁', color: C.y }, { x: -PI / st.T1, label: '−π/T₁', color: C.y }]);
      ch2.draw();

      /* 能量占比累积（单边指数） */
      var tot = 0;
      for (var q = 0; q < nw; q++) tot += e1[q] * (w[1] - w[0]);
      var acc = new Float64Array(nw), run = 0;
      for (var k = 0; k < nw; k++) {
        if (w[k] >= 0) { run += (k ? (e1[k] + e1[k - 1]) / 2 * (w[1] - w[0]) : 0); acc[k] = 2 * run / tot; }
        else acc[k] = 0;
      }
      ch3.setDomain(0, wm);
      ch3.setSeries([
        { x: w, y: acc, color: C.y, width: 2, label: '带内占比' },
        { x: [0, wm], y: [0.5, 0.5], color: C.danger, width: 1.2, dash: [5, 4] }
      ]);
      ch3.setVLine([{ x: st.a, label: 'ω=a → 50%', color: '#c9d5e8' }]);
      ch3.setHLine([]);
      ch3.draw();

      UI.clear(roBox);
      readouts(roBox, [
        { k: '指数信号峰值 |X(j0)|', v: UI.trim(1 / st.a) },
        { k: '3 dB 带宽 ω₃', v: UI.trim(st.a) + ' rad/s = ' + UI.trim(st.a / TAU) + ' Hz', hi: true },
        { k: 'ω=ω₃ 处幅度', v: UI.trim(1 / (Math.SQRT2 * st.a)) + ' = 峰值/√2' },
        { k: '带内能量占比 @ ω₃', v: '50 %（定义 1 的依据）' },
        { k: '门函数主瓣半宽', v: UI.trim(PI / st.T1) + ' rad/s', hi: true },
        { k: '门函数主瓣全宽', v: UI.trim(2 * PI / st.T1) + ' rad/s' }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'tip', text: '单边指数的能量累积正好在 ω=a 处过 50%：∫₀^a 与 ∫_a^∞ 相等。这是「半功率带宽」的物理含义。' },
        { cls: 'warn', text: '门函数的 Sa 谱没有 3 dB 点（它不是单调的），所以只能用主瓣宽度定义带宽。两种定义不能混用。' }
      ]);
    }
    upd();
  }

  /* ================================================================ 专题 5 */
  function topicDual(host) {
    var st = { T1: 1.2, W: 2.5 };
    head(host, '⑤ 对偶性：X(jt) ⟷ 2πx(−ω)',
      '课件 slide 22 / 42 的四宫格。门 ↔ Sa 与 Sa ↔ 门其实是同一条性质的两面，' +
      '把时域表达式原样搬到频域，另一侧就变成 2π 倍的反转。');
    var g = grid(host), L = g.left, R = g.right;
    var row = makeRow(L);
    var a1 = panel(row, '上排：门 x₁(t) ⟷ X₁(jω)=2T₁Sa(ωT₁)', 175);
    var a2 = panel(row, '上排的频谱', 175);
    var row2 = makeRow(L);
    var b1 = panel(row2, '下排：Sa x₂(t)=(sin Wt)/(πt) ⟷ X₂(jω)=门', 175);
    var b2 = panel(row2, '下排的频谱', 175);
    var row3 = makeRow(L);
    var c1 = panel(row3, '对偶验证：把 X₁ 当时间函数，其频谱应为 2π·门(−ω)', 175);
    var c2 = panel(row3, '（同一张图，横轴换成 ω）', 175);

    var side = sidePanel(R, '参数');
    side.appendChild(UI.sliderRow({ key: 'T1', label: 'T_{1}', min: 0.4, max: 3, step: 0.05, desc: '门半宽' }, st.T1, function (v) { st.T1 = v; upd(); }));
    side.appendChild(UI.sliderRow({ key: 'W', label: 'W', min: 0.4, max: 3, step: 0.05, desc: '理想低通截止' }, st.W, function (v) { st.W = v; upd(); }));
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    function upd() {
      var T1 = st.T1, W = st.W;
      var tm = 8, wm = 14;
      var t = FT.linspace(-tm, tm, 700), w = FT.linspace(-wm, wm, 900);
      var gateT = new Float64Array(t.length), gateW = new Float64Array(w.length);
      var sincT = new Float64Array(t.length), rectW = new Float64Array(w.length);
      var dualW = new Float64Array(w.length), dualT = new Float64Array(t.length);
      for (var i = 0; i < t.length; i++) {
        gateT[i] = Math.abs(t[i]) < T1 ? 1 : 0;
        sincT[i] = W / PI * sa(W * t[i]);
      }
      for (var j = 0; j < w.length; j++) {
        gateW[j] = 2 * T1 * Math.abs(sa(w[j] * T1));
        rectW[j] = Math.abs(w[j]) < W ? 1 : 0;
        dualW[j] = Math.abs(w[j]) < T1 ? 2 * PI : 0;
        dualT[j] = 2 * T1 * sa(t[j] * T1);
      }
      a1.setDomain(-tm, tm); a1.setSeries([{ x: t, y: gateT, color: C.x, width: 2, fill: C.fill }]); a1.setImpulses([]); a1.setVLine([]); a1.setHLine([]); a1.draw();
      a2.setDomain(-wm, wm); a2.setSeries([{ x: w, y: dualT, color: C.mag, width: 2 }]); a2.setVLine([{ x: PI / T1, label: 'π/T₁', color: '#f0c9a8' }]); a2.setHLine([]); a2.draw();
      b1.setDomain(-tm, tm); b1.setSeries([{ x: t, y: sincT, color: C.x, width: 2 }]); b1.setVLine([{ x: PI / W, label: 'π/W', color: '#c9d5e8' }]); b1.setHLine([]); b1.draw();
      b2.setDomain(-wm, wm); b2.setSeries([{ x: w, y: rectW, color: C.y, width: 2, fill: 'rgba(15,122,77,.12)' }]); b2.setVLine([{ x: W, label: 'W', color: '#f0c9a8' }, { x: -W, label: '−W', color: '#f0c9a8' }]); b2.setHLine([]); b2.draw();
      c1.setDomain(-wm, wm); c1.setSeries([{ x: w, y: dualW, color: C.y, width: 2, fill: 'rgba(15,122,77,.12)' }]); c1.setVLine([{ x: T1, label: 'T₁', color: '#c9d5e8' }, { x: -T1, label: '−T₁', color: '#c9d5e8' }]); c1.setHLine([]); c1.draw();
      c2.setDomain(-tm, tm); c2.setSeries([{ x: t, y: dualT, color: C.mag, width: 2 }]); c2.setVLine([{ x: PI / T1, label: 'π/T₁', color: '#f0c9a8' }]); c2.setHLine([]); c2.draw();

      UI.clear(roBox);
      readouts(roBox, [
        { k: '上排：门宽 2T₁', v: UI.trim(2 * T1) },
        { k: '上排：Sa 峰值 2T₁', v: UI.trim(2 * T1), hi: true },
        { k: '上排：第一零点', v: UI.trim(PI / T1) },
        { k: '下排：Sa 峰值 W/π', v: UI.trim(W / PI) },
        { k: '下排：矩形高 1、宽 2W', v: UI.trim(2 * W), hi: true },
        { k: '对偶结果高度 2π', v: UI.trim(TAU) }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: '对偶性让「时域矩形 ⟷ 频域 Sa」和「时域 Sa ⟷ 频域矩形」变成同一件事。注意高度差的那个 2π —— 它来自反变换前面的 1/2π。' },
        { cls: 'tip', text: '课件由此推出 1 ⟷ 2πδ(ω)：令 W→∞，理想低通的矩形变成整条实轴，其反变换在 t=0 附近收缩成冲激。' }
      ]);
    }
    upd();
  }

  /* ================================================================ 专题 6 */
  function topicParseval(host) {
    var st = { which: 'exp1s', a: 1, wmax: 40 };
    head(host, '⑥ Parseval：自然定律，能量守恒',
      '时域能量 = 频域能量 / 2π。右边这张图把两个积分画成阴影面积，数值上完全相等 —— 但频域那一侧必须把 ω 轴取到足够宽才收敛。');
    var g = grid(host), L = g.left, R = g.right;
    var row = makeRow(L);
    var ch1 = panel(row, '|x(t)|² 的面积 = 能量', 185);
    var ch2 = panel(row, '|X(jω)|²/(2π) 的面积 = 同一个能量', 185);

    var side = sidePanel(R, '设置');
    var sel = UI.el('select', { onchange: function () { st.which = sel.value; upd(); } });
    [['exp1s', 'e^{−at}u(t)'], ['expabs', 'e^{−a|t|}'], ['gate', '门函数 2T₁'], ['tri', '三角脉冲']].forEach(function (o) {
      sel.appendChild(UI.el('option', { value: o[0], text: o[1] }));
    });
    var f = UI.el('div', { class: 'field' });
    f.appendChild(UI.el('label', { text: '信号' }));
    f.appendChild(sel);
    side.appendChild(f);
    var sA = UI.sliderRow({ key: 'a', label: 'a / T_{1}', min: 0.3, max: 4, step: 0.05, desc: '形状参数' }, st.a, function (v) { st.a = v; upd(); });
    side.appendChild(sA);
    var sW = UI.sliderRow({ key: 'wmax', label: '\\omega_{max}', min: 6, max: 120, step: 2, desc: '频率截断（看收敛）' }, st.wmax, function (v) { st.wmax = v; upd(); });
    side.appendChild(sW);
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    function exact() {
      var a = st.a;
      if (st.which === 'exp1s') return 1 / (2 * a);
      if (st.which === 'expabs') return 1 / a;
      if (st.which === 'gate') return 2 * a;
      return 2 * a / 3;   /* tri: ∫(1-|t|/τ)² = 2τ/3 */
    }

    function upd() {
      var a = st.a;
      var sigId = st.which;
      var p = sigId === 'gate' ? { T1: a } : (sigId === 'tri' ? { tau: a } : { a: a });
      var lay = FT.buildBaseLayer(FT.getSignal(sigId), p);
      var tm = Math.max(6, 6 / Math.max(a, 0.3));
      var r = FT.render(lay, { tmin: -tm, tmax: tm, Nt: 900, wmin: -st.wmax, wmax: st.wmax, Nw: 2000, wmaxAbs: st.wmax, reconstructTime: false });
      var n = r.t.length, xt = new Float64Array(n);
      for (var i = 0; i < n; i++) xt[i] = r.xre[i] * r.xre[i] + r.xim[i] * r.xim[i];
      ch1.setDomain(-tm, tm);
      ch1.setSeries([{ x: r.t, y: xt, color: C.x, width: 2, fill: C.fill, label: '|x|²' }]);
      ch1.setImpulses([]); ch1.setVLine([]); ch1.setHLine([]);
      ch1.draw();

      var m = r.w.length, ew = new Float64Array(m);
      for (var j = 0; j < m; j++) { var mm = Math.hypot(r.Xre[j], r.Xim[j]); ew[j] = mm * mm / TAU; }
      ch2.setDomain(-st.wmax, st.wmax);
      ch2.setSeries([{ x: r.w, y: ew, color: C.mag, width: 2, fill: C.fillMag, label: '|X|²/2π' }]);
      ch2.setImpulses([]); ch2.setVLine([]); ch2.setHLine([]);
      ch2.draw();

      var eT = trap(r.t, xt), eW = trap(r.w, ew), ex = exact();
      UI.clear(roBox);
      readouts(roBox, [
        { k: '解析能量', v: UI.trim(ex), hi: true },
        { k: '时域数值 ∫|x|²dt', v: UI.trim(eT) + '（' + pct(eT, ex) + '）' },
        { k: '频域数值 (1/2π)∫|X|²dω', v: UI.trim(eW) + '（' + pct(eW, ex) + '）', hi: true },
        { k: '截断误差', v: UI.trim(Math.abs(eW - eW0(ex, st.wmax)), 4) },
        { k: '频率截断 ω_max', v: UI.trim(st.wmax) + ' rad/s' },
        { k: '两侧比值', v: UI.trim(eW / eT) + ' → 1' }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: 'Parseval 给了 X(jω) 一个物理单位：|X|²/2π 是能量密度，对频率积分得到总能量。噪声功率谱密度、3 dB 带宽都从这里来。' },
        { cls: 'warn', text: '把 ω_max 从 6 拉到 120，频域那一侧的数值才逐步逼近解析值 —— 拖这个滑块就是在亲手验证「截断误差」。注意 1/ω 拖尾（门函数）收敛最慢。' },
        { cls: 'tip', text: '周期信号不满足能量有限条件，只能用平均功率形式的 Parseval：Σ|a_k|²。' }
      ]);
    }
    function eW0(ex, wm) { return ex; }
    function pct(v, e) { return (100 * v / e).toFixed(1) + '%'; }
    function trap(x, y) { var s = 0; for (var i = 0; i < x.length - 1; i++) s += (y[i] + y[i + 1]) * (x[i + 1] - x[i]) / 2; return s; }
    upd();
  }

  /* ================================================================ 专题 7 */
  function topicStep(host) {
    var st = { alpha: 0.6 };
    head(host, '⑦ u(t) 的频谱：奇偶分解 + α→0 的收敛',
      '课件 slide 37–38：u(t) = ½ + ½Sgn(t)。偶部给 πδ(ω)，奇部给 1/(jω)。' +
      '而 Sgn 是用 e^{−α|t|} 夹逼出来的，α→0 时 Re[1/(α+jω)] 正好挤成一根面积为 π 的冲激。');
    var g = grid(host), L = g.left, R = g.right;
    var stack = makeStack(L);
    var ch0 = panel(stack, 'u(t) = 偶部 ½ + 奇部 ½Sgn(t)', 150);
    var ch1 = panel(stack, 'α/(α²+ω²)：α→0 时挤成 πδ(ω)（面积恒为 π）', 185);
    var ch2 = panel(stack, '−ω/(α²+ω²) → −1/ω 即 1/(jω) 的虚部', 185);

    var side = sidePanel(R, '参数');
    var s = UI.sliderRow({ key: 'alpha', label: '\\alpha', min: 0.02, max: 3, step: 0.02, desc: '夹逼衰减系数' }, st.alpha, function (v) { st.alpha = v; upd(); });
    side.appendChild(s);
    var ab = UI.el('div', { class: 'btn-row' }); side.appendChild(ab);
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    function upd() {
      var al = st.alpha, wm = 16, nw = 900;
      var w = FT.linspace(-wm, wm, nw);
      var re = new Float64Array(nw), im = new Float64Array(nw), sum = new Float64Array(nw);
      for (var i = 0; i < nw; i++) {
        var d = al * al + w[i] * w[i];
        re[i] = al / d;
        im[i] = -w[i] / d;
        sum[i] = 2 * al / d;
      }
      var tm = 6, nt = 500;
      var t = FT.linspace(-tm, tm, nt);
      var u = new Float64Array(nt), ue = new Float64Array(nt), uo = new Float64Array(nt);
      for (var j = 0; j < nt; j++) {
        u[j] = t[j] >= 0 ? 1 : 0;
        ue[j] = 0.5;
        uo[j] = t[j] > 0 ? 0.5 : (t[j] < 0 ? -0.5 : 0);
      }
      ch0.setDomain(-tm, tm);
      ch0.setSeries([
        { x: t, y: u, color: C.x, width: 2, label: 'u' },
        { x: t, y: ue, color: C.y, width: 1.5, dash: [5, 4], label: '偶部½' },
        { x: t, y: uo, color: C.phase, width: 1.5, dash: [3, 3], label: '奇部' }
      ]);
      ch0.setImpulses([]); ch0.setVLine([]); ch0.setHLine([]);
      ch0.draw();

      ch1.setDomain(-wm, wm);
      ch1.setSeries([
        { x: w, y: re, color: C.mag, width: 2, fill: C.fillMag, label: 'Re' },
        { x: w, y: new Float64Array(nw), color: C.ghost, width: 1 }
      ]);
      ch1.setVLine([]);
      ch1.setHLine([{ y: 1 / al, label: '峰值 1/α', color: '#f0c9a8' }]);
      ch1.draw();

      ch2.setDomain(-wm, wm);
      ch2.setSeries([
        { x: w, y: im, color: C.phase, width: 2, label: 'Im' },
        { x: w, y: w.map(function (x) { return Math.abs(x) < 0.05 ? NaN : -1 / x; }), color: C.ghost, width: 1.3, dash: [5, 4], label: '−1/ω' }
      ]);
      ch2.setHLine([]);
      ch2.setVLine([]);
      ch2.draw();

      /* 面积 */
      var area = trap(w, re);
      UI.clear(roBox);
      readouts(roBox, [
        { k: 'Re 峰值 1/α', v: UI.trim(1 / al), hi: true },
        { k: '半高宽', v: UI.trim(2 * al) + '（随 α 线性收缩）' },
        { k: 'Re 曲线下的面积', v: UI.trim(area) + ' → π = ' + UI.trim(PI), hi: true },
        { k: '结论', v: 'πδ(ω)（面积守恒、高度发散）' },
        { k: 'Im 在 ω=1 处', v: UI.trim(-1 / (al * al + 1)) },
        { k: 'α→0 后 u(t) 频谱', v: '1/(jω) + πδ(ω)' }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: '这就是「频谱密度发散但面积有限」的标准图像：α/(α²+ω²) 是 δ 的近似恒等序列，面积永远是 π，所以极限就是 πδ(ω)。' },
        { cls: 'warn', text: '很多同学只写 1/(jω) 丢掉 πδ(ω)，本质上是忽略了 u(t) 有非零的偶部（直流 ½）。用奇偶分解就不会漏。' }
      ]);
      if (ab.childNodes.length < 2) animButton(ab, function () { return st.alpha; }, function (v) { st.alpha = v; s.set(v); }, 0.02, 3, upd, 'α 扫描');
    }
    function trap(x, y) { var s = 0; for (var i = 0; i < x.length - 1; i++) s += (y[i] + y[i + 1]) * (x[i + 1] - x[i]) / 2; return s; }
    upd();
  }

  /* ================================================================ 专题 8 */
  function topicSampling(host) {
    var st = { T1: 1, T: 0.9, wc: 3.2 };
    head(host, '⑧ 理想抽样与采样定理',
      'x(t)·Σδ(t−nT) ⟷ (1/T)ΣX[j(ω−2πk/T)]：时域取样本，频域以 2π/T 为周期复制。' +
      '复制品不重叠的条件是 2π/T > 2ω_M，这就是奈奎斯特。');
    var g = grid(host), L = g.left, R = g.right;
    var stack = makeStack(L);
    var ch0 = panel(stack, '原信号 x(t) 与抽样点', 150);
    var ch1 = panel(stack, '原频谱 X(jω)（带宽 ω_M = π/T₁）', 180);
    var ch2 = panel(stack, '抽样后频谱：以 2π/T 复制、幅度 1/T', 185);
    var ch3 = panel(stack, '低通恢复：输出 vs 原信号（灰）', 175);

    var side = sidePanel(R, '参数');
    side.appendChild(UI.sliderRow({ key: 'T1', label: 'T_{1}', min: 0.4, max: 2.5, step: 0.05, desc: '门半宽（决定带宽）' }, st.T1, function (v) { st.T1 = v; upd(); }));
    var sT = UI.sliderRow({ key: 'T', label: 'T', min: 0.3, max: 4, step: 0.02, desc: '抽样周期' }, st.T, function (v) { st.T = v; upd(); });
    side.appendChild(sT);
    side.appendChild(UI.sliderRow({ key: 'wc', label: '\\omega_{c}', min: 0.5, max: 10, step: 0.1, desc: '恢复低通截止' }, st.wc, function (v) { st.wc = v; upd(); }));
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);
    var ab = UI.el('div', { class: 'btn-row' }); side.appendChild(ab);

    var lay = FT.getSignal('gate');
    var abInited = false;
    function upd() {
      var T1 = st.T1, T = st.T, wm = Math.max(14, 3 * TAU / T);
      var base = FT.buildBaseLayer(lay, { T1: T1 });
      var samp = FT.PROP.sample.apply(base, { T: T });
      var rec = FT.lpf(samp, st.wc, T);

      var tm = Math.max(4, T1 * 3);
      var r0 = FT.render(base, { tmin: -tm, tmax: tm, Nt: 500, wmin: -wm, wmax: wm, Nw: 6, wmaxAbs: wm, reconstructTime: false });
      var r1 = FT.render(base, { tmin: -1, tmax: 1, Nt: 6, wmin: -wm, wmax: wm, Nw: 1100, wmaxAbs: wm, reconstructTime: false });
      var r2 = FT.render(samp, { tmin: -1, tmax: 1, Nt: 6, wmin: -wm, wmax: wm, Nw: 1100, wmaxAbs: wm, reconstructTime: false });
      var r3 = FT.render(rec, { tmin: -tm, tmax: tm, Nt: 700, wmin: -wm, wmax: wm, Nw: 1100, wmaxAbs: wm, reconstructTime: true });

      ch0.setDomain(-tm, tm);
      ch0.setSeries([{ x: r0.t, y: r0.xre, color: C.x, width: 2, label: 'x' }]);
      ch0.setImpulses(r0.xre.length ? sampleMarkers(r0, T) : []);
      ch0.setVLine([]); ch0.setHLine([]);
      ch0.draw();

      ch1.setDomain(-wm, wm);
      ch1.setSeries([{ x: r1.w, y: mag(r1), color: C.mag, width: 2, label: '|X|' }]);
      ch1.setVLine([{ x: PI / T1, label: 'ω_M=π/T₁', color: C.y }, { x: -PI / T1, label: '−ω_M', color: C.y }]);
      ch1.setHLine([]); ch1.setImpulses([]);
      ch1.draw();

      ch2.setDomain(-wm, wm);
      ch2.setSeries([{ x: r2.w, y: mag(r2), color: C.y, width: 2, label: '|X_s|' }]);
      ch2.setVLine(replicaLines(T, wm));
      ch2.setHLine([]); ch2.setImpulses([]);
      ch2.draw();

      ch3.setDomain(-tm, tm);
      ch3.setSeries([
        { x: r0.t, y: r0.xre, color: C.ghost, width: 1.4, dash: [5, 4], label: '原' },
        { x: r3.t, y: r3.xre, color: C.phase, width: 2, label: '恢复' }
      ]);
      ch3.setImpulses([]); ch3.setVLine([]); ch3.setHLine([]);
      ch3.draw();

      var wM = PI / T1, ws = TAU / T;
      var ok = ws > 2 * wM * 1.0001;
      UI.clear(roBox);
      readouts(roBox, [
        { k: '信号带宽 ω_M = π/T₁', v: UI.trim(wM) + ' rad/s', hi: true },
        { k: '复制间隔 2π/T', v: UI.trim(ws) + ' rad/s', hi: true },
        { k: '奈奎斯特间隔上限', v: UI.trim(PI / wM) + ' s' },
        { k: '奈奎斯特率 2ω_M', v: UI.trim(2 * wM) + ' rad/s' },
        { k: '是否混叠', v: ok ? '否 —— 可以无失真恢复 ✓' : '是 —— 复制品重叠 ✗' },
        { k: '恢复低通截止 ωc', v: UI.trim(st.wc) + (st.wc > wM && st.wc < ws - wM ? '（合适）' : '（不合适）') }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: '不混叠的条件：ω_M < 2π/T − ω_M，即 T < π/ω_M。门函数的频谱有无限长尾，严格说永远会重叠一点，所以这里用主瓣宽度当作工程带宽。' },
        { cls: 'warn', text: '恢复用的理想低通截止要落在 ω_M 与 2π/T − ω_M 之间：太窄切掉信号，太宽放进复制品。' },
        { cls: 'tip', text: '抽样后幅度乘 1/T：把 T 调大（抽得稀）复制间隔变小、混叠更严重，同时每个复制品变高。' }
      ]);
      if (!abInited) {
        abInited = true;
        animButton(ab, function () { return st.T; }, function (v) { st.T = v; sT.set(v); }, 0.3, 4, upd, 'T 扫描');
      }
    }
    function mag(r) {
      var n = r.w.length, m = new Float64Array(n);
      for (var i = 0; i < n; i++) m[i] = Math.hypot(r.Xre[i], r.Xim[i]);
      return m;
    }
    function sampleMarkers(r, T) {
      var out = [], mx = 0;
      for (var i = 0; i < r.xre.length; i++) mx = Math.max(mx, r.xre[i]);
      for (var k = -Math.ceil(8 / T); k <= Math.ceil(8 / T); k++) {
        var t0 = k * T;
        if (t0 < r.t[0] || t0 > r.t[r.t.length - 1]) continue;
        var idx = Math.round((t0 - r.t[0]) / (r.t[1] - r.t[0]));
        out.push({ x: t0, y: r.xre[idx], color: C.phase, width: 1.6, label: '' });
      }
      return out;
    }
    function replicaLines(T, wm) {
      var ws = TAU / T, out = [];
      for (var k = -6; k <= 6; k++) {
        if (!k) continue;
        var w0 = k * ws;
        if (Math.abs(w0) > wm) continue;
        out.push({ x: w0, label: k + '·2π/T', color: '#c9d5e8' });
      }
      return out;
    }
    upd();
  }

  /* --------------------------------------------------------------- 注册 */
  var TOPICS = [
    { id: 'lines2cont', name: '离散谱 → 连续谱', run: topicLines },
    { id: 'uncertain', name: '时宽 ↔ 频宽', run: topicUncertainty },
    { id: 'gibbs', name: 'Gibbs 现象', run: topicGibbs },
    { id: 'bandwidth', name: '带宽的两种定义', run: topicBandwidth },
    { id: 'dual', name: '对偶性四宫格', run: topicDual },
    { id: 'parseval', name: 'Parseval 能量守恒', run: topicParseval },
    { id: 'stepspec', name: 'u(t) 的频谱', run: topicStep },
    { id: 'sampling', name: '采样定理', run: topicSampling }
  ];

  Topics.render = function () {
    var tabs = document.getElementById('topicTabs');
    UI.clear(tabs);
    TOPICS.forEach(function (t) {
      tabs.appendChild(UI.el('button', {
        class: 'topic-tab' + (t.id === current ? ' active' : ''), text: t.name,
        onclick: function () { current = t.id; Topics.render(); }
      }));
    });
    var body = document.getElementById('topicBody');
    UI.clear(body);
    live = [];
    var wrap = UI.el('div', { class: 'topic-panel' });
    body.appendChild(wrap);
    var fn = TOPICS.filter(function (t) { return t.id === current; })[0].run;
    fn(wrap);
  };

  Topics.resize = function () { live.forEach(function (c) { c.draw(); }); };

})(window);


/* ===== main.js ===== */
/* ==========================================================================
   main.js —— 入口：模式切换、抽屉/模态、公式速查、自定义信号面板、使用说明
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML;

  /* ----------------------------------------------------------- 模式切换 */
  var UI = global.UI;
  UI.go = function (mode) {
    var btns = document.querySelectorAll('#modeSwitch .mode-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('active', btns[i].dataset.mode === mode);
    var views = document.querySelectorAll('.view');
    for (var j = 0; j < views.length; j++) views[j].classList.toggle('active', views[j].id === 'view-' + mode);
    if (mode === 'props') FT.PropsView && FT.PropsView.render();
    if (mode === 'pairs') FT.PairsView && FT.PairsView.render();
    if (mode === 'sys') FT.Sys && FT.Sys.init();
    if (mode === 'mod') FT.Mod && FT.Mod.init();
    if (mode === 'topics') FT.Topics && FT.Topics.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  document.getElementById('modeSwitch').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mode]');
    if (b) UI.go(b.dataset.mode);
  });

  /* -------------------------------------------------------- 顶栏按钮 */
  document.getElementById('btnHelp').addEventListener('click', function () {
    UI.openModal('使用说明 · 三步理解傅里叶变换', [
      '<h4>1. 选信号</h4>',
      '<p>在实验台左侧点击一个信号芯片（如「单边指数」「矩形脉冲」「余弦」），下方会自动出现该信号的参数滑块。拖动滑块，四张图实时更新。</p>',
      '<h4>2. 加性质</h4>',
      '<p>在「性质变换」里点一个性质（如「时移 t₀」「频移 ω₀」「微分」），信号就会按该性质变换。可叠加多个性质，按顺序作用 —— 公式卡片会显示合成后的变换对。</p>',
      '<h4>3. 看频谱</h4>',
      '<p>四张图：时域波形、幅度谱 |X(jω)|、相位谱 ∠X(jω)、以及可切换的 实部/虚部 或 dB 或能量谱。鼠标移到图上可读数；双击图表可重置 y 范围。</p>',
      '<h4>其它模块</h4>',
      '<ul>',
      '<li><b>性质表</b>：每张卡片给出性质公式、金句、以及一个「变换前 → 变换后」的实算缩略图。点「载入实验台」可放大细看。</li>',
      '<li><b>变换对</b>：表 4.2 速查，带实时缩略图。点信号名即可在实验台打开。</li>',
      '<li><b>系统频响</b>：选一个输入信号 + 一个系统（理想低通、RC、自定义有理式……），看 |H|、φ_H、x(t)/y(t)、|X|/|Y|。两个预设分别是课件例 4.1.1 和课堂测试。</li>',
      '<li><b>调制搬移</b>：AM 调制 / 同步解调 / 可调带通 / 混叠演示。拖动 ω₀ 直观看到搬移和混叠。</li>',
      '<li><b>专题</b>：课件里那些「看图说话」的动画 —— 离散谱→连续谱、Gibbs、Parseval、u(t) 频谱、采样定理……</li>',
      '</ul>',
      '<h4>自定义信号</h4>',
      '<p>点「自定义 x(t)」打开抽屉，输入表达式（如 <code class="kbd">exp(-3*t)*u(t)</code> 或 <code class="kbd">rect(t/2)</code>），工具会用数值积分算出它的频谱。支持 <code class="kbd">sin cos exp abs sqrt sign u step rect gate sa sinc tri</code> 等函数和参数 <code class="kbd">a b c w0 T</code>。</p>',
      '<h4>数值说明</h4>',
      '<ul>',
      '<li>解析式信号走闭包通道，变换对严格精确。</li>',
      '<li>含「微分 / 积分」的链会触发数值逆变换重建波形，截断会引起 sinc 振铃 —— 这是正常现象，不是 bug。</li>',
      '<li>周期信号的频谱是冲激串，工具用箭头画出来；幅度谱的 y 轴会自动包含箭头高度。</li>',
      '</ul>'
    ].join(''));
  });

  document.getElementById('btnReset').addEventListener('click', function () {
    UI.clearSave();
    location.reload();
  });

  document.getElementById('modalClose').addEventListener('click', UI.closeModal);
  document.getElementById('modal').addEventListener('click', function (e) { if (e.target.id === 'modal') UI.closeModal(); });

  document.getElementById('drawerClose').addEventListener('click', UI.closeDrawer);
  document.getElementById('customApply').addEventListener('click', function () {
    var expr = document.getElementById('customExpr').value.trim();
    if (!expr) { document.getElementById('customErr').textContent = '请输入表达式'; return; }
    try {
      FT.compile(expr);
    } catch (e) {
      document.getElementById('customErr').textContent = '解析失败：' + e.message;
      return;
    }
    document.getElementById('customErr').textContent = '';
    var st = FT.Lab.state;
    st.sigId = 'custom';
    st.custom.expr = expr;
    st.custom.window = parseFloat(document.getElementById('customWindow').value);
    var ps = {};
    (document.getElementById('customParams').value || '').split(',').forEach(function (kv) {
      var m = /^\s*([A-Za-z_]\w*)\s*=\s*(-?\d*\.?\d+(?:e[-+]?\d+)?)\s*$/i.exec(kv);
      if (m) ps[m[1]] = parseFloat(m[2]);
    });
    st.custom.params = ps;
    FT.Lab.pick('custom');
    UI.closeDrawer();
    UI.toast('已载入自定义信号');
  });

  document.getElementById('customWindow').addEventListener('input', function () {
    document.getElementById('customWindowVal').textContent = this.value;
  });

  /* 自定义预设 */
  var PRESETS = [
    { name: '单边指数', expr: 'exp(-3*t)*u(t)' },
    { name: '双边指数', expr: 'exp(-2*abs(t))' },
    { name: '门脉冲', expr: 'rect(t/2)' },
    { name: '三角脉冲', expr: 'tri(t/2)' },
    { name: 'Sa 型', expr: 'sa(3*t)' },
    { name: '阶跃', expr: 'u(t)' },
    { name: '符号函数', expr: 'sgn(t)' },
    { name: '拍频', expr: 'cos(5*t)*cos(t)' },
    { name: '衰减振荡', expr: 'exp(-t)*cos(4*t)*u(t)' },
    { name: '高斯', expr: 'exp(-t^2)' }
  ];
  var presetHost = document.getElementById('customPresets');
  PRESETS.forEach(function (p) {
    presetHost.appendChild(UI.chip(p.name, p.expr, false, function () {
      document.getElementById('customExpr').value = p.expr;
      document.getElementById('customErr').textContent = '';
    }));
  });

  /* 公式速查 */
  document.getElementById('btnFormula').addEventListener('click', function () {
    UI.openModal('公式速查 · 第四章', [
      '<h4>定义</h4>',
      '<p class="mx">' + M.render('X(j\\Wv)=\\int_{-\\infty}^{+\\infty}x(\\Tv)e^{-j\\Wv\\Tv}\\,d\\Tv') + '</p>',
      '<p class="mx">' + M.render('x(\\Tv)=\\frac{1}{2\\pi}\\int_{-\\infty}^{+\\infty}X(j\\Wv)e^{j\\Wv\\Tv}\\,d\\Wv') + '</p>',
      '<h4>周期信号的傅里叶变换</h4>',
      '<p class="mx">' + M.render('X(j\\Wv)=2\\pi\\sum_{k=-\\infty}^{+\\infty}a_{k}\\,\\delta(\\Wv-k\\omega_{0})') + '</p>',
      '<h4>收敛条件</h4>',
      '<ul><li>充分条件 A：平方可积 ∫|x|²dt &lt; ∞</li><li>充分条件 B：Dirichlet（绝对可积 + 有限极值 + 有限间断点）</li><li>两组条件<strong>不等价</strong>（反例 sin t / t）</li><li>间断点处收敛于<strong>左右极限平均值</strong>，附近出现 Gibbs 现象</li></ul>',
      '<h4>常用变换对（表 4.2 精选）</h4>',
      '<table><tr><th>x(t)</th><th>X(jω)</th></tr>',
      '<tr><td>' + M.render('e^{-a\\Tv}u(\\Tv)') + '</td><td>' + M.render('\\frac{1}{a+j\\Wv}') + '</td></tr>',
      '<tr><td>' + M.render('e^{-a|\\Tv|}') + '</td><td>' + M.render('\\frac{2a}{a^{2}+\\Wv^{2}}') + '</td></tr>',
      '<tr><td>' + M.render('\\text{门}_{2T_{1}}(\\Tv)') + '</td><td>' + M.render('2T_{1}\\mathrm{Sa}(\\Wv T_{1})') + '</td></tr>',
      '<tr><td>' + M.render('\\frac{\\sin W\\Tv}{\\pi\\Tv}') + '</td><td>' + M.render('\\text{门}_{2W}(\\Wv)') + '</td></tr>',
      '<tr><td>' + M.render('\\delta(\\Tv)') + '</td><td>1</td></tr>',
      '<tr><td>' + M.render('u(\\Tv)') + '</td><td>' + M.render('\\frac{1}{j\\Wv}+\\pi\\delta(\\Wv)') + '</td></tr>',
      '<tr><td>' + M.render('\\cos\\omega_{0}\\Tv') + '</td><td>' + M.render('\\pi[\\delta(\\Wv-\\omega_{0})+\\delta(\\Wv+\\omega_{0})]') + '</td></tr>',
      '<tr><td>' + M.render('\\sin\\omega_{0}\\Tv') + '</td><td>' + M.render('\\frac{\\pi}{j}[\\delta(\\Wv-\\omega_{0})-\\delta(\\Wv+\\omega_{0})]') + '</td></tr>',
      '<tr><td>' + M.render('\\sum_{n}\\delta(\\Tv-nT)') + '</td><td>' + M.render('\\frac{2\\pi}{T}\\sum_{k}\\delta(\\Wv-\\tfrac{2\\pi k}{T})') + '</td></tr>',
      '<tr><td>' + M.render('\\frac{\\Tv^{n-1}}{(n-1)!}e^{-a\\Tv}u(\\Tv)') + '</td><td>' + M.render('\\frac{1}{(a+j\\Wv)^{n}}') + '</td></tr>',
      '</table>',
      '<h4>性质（表 4.1）</h4>',
      '<table><tr><th>性质</th><th>公式</th></tr>',
      '<tr><td>线性</td><td>' + M.render('ax+by\\leftrightarrow aX+bY') + '</td></tr>',
      '<tr><td>时移</td><td>' + M.render('x(\\Tv-\\tau)\\leftrightarrow X(j\\Wv)e^{-j\\Wv\\tau}') + '</td></tr>',
      '<tr><td>频移</td><td>' + M.render('e^{j\\omega_{0}\\Tv}x\\leftrightarrow X[j(\\Wv-\\omega_{0})]') + '</td></tr>',
      '<tr><td>反转</td><td>' + M.render('x(-\\Tv)\\leftrightarrow X(-j\\Wv)') + '</td></tr>',
      '<tr><td>展缩</td><td>' + M.render('x(a\\Tv)\\leftrightarrow \\frac{1}{|a|}X(j\\frac{\\Wv}{a})') + '</td></tr>',
      '<tr><td>微分</td><td>' + M.render('\\frac{dx}{d\\Tv}\\leftrightarrow j\\Wv X(j\\Wv)') + '</td></tr>',
      '<tr><td>积分</td><td>' + M.render('\\int_{-\\infty}^{\\Tv}x\\,d\\tau\\leftrightarrow \\frac{X(j\\Wv)}{j\\Wv}+\\pi X(0)\\delta(\\Wv)') + '</td></tr>',
      '<tr><td>对偶</td><td>' + M.render('X(j\\Tv)\\leftrightarrow 2\\pi x(-\\Wv)') + '</td></tr>',
      '<tr><td>卷积</td><td>' + M.render('x*h\\leftrightarrow X\\cdot Y') + '</td></tr>',
      '<tr><td>相乘</td><td>' + M.render('xy\\leftrightarrow \\frac{1}{2\\pi}X*Y') + '</td></tr>',
      '<tr><td>Parseval</td><td>' + M.render('\\int|x|^{2}dt=\\frac{1}{2\\pi}\\int|X|^{2}d\\Wv') + '</td></tr>',
      '</table>',
      '<h4>LTI 系统</h4>',
      '<p class="mx">' + M.render('H(j\\Wv)=\\frac{Y(j\\Wv)}{X(j\\Wv)}=\\frac{b_{M}(j\\Wv)^{M}+\\cdots+b_{0}}{(j\\Wv)^{N}+a_{N-1}(j\\Wv)^{N-1}+\\cdots+a_{0}}') + '</p>',
      '<p>冲激响应 h(t) 与频率响应 H(jω) 是一对傅里叶变换。四步法：求 X → 求 H → 相乘得 Y → 逆变换得 y。</p>'
    ].join(''));
  });

  /* -------------------------------------------------------- 窗口自适应 */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (FT.Lab && FT.Lab.charts) Object.keys(FT.Lab.charts).forEach(function (k) { FT.Lab.charts[k].draw(); });
      if (FT.Topics) FT.Topics.resize();
    }, 200);
  });

  /* -------------------------------------------------------- 启动 */
  window.addEventListener('DOMContentLoaded', function () {
    FT.Lab.init();
  });

})(window);

