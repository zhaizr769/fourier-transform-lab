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
      if (this.s[this.i] === '\\' && this.s[this.i + 1] === 'e' && /^\\end[{]/.test(this.s.slice(this.i))) {
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
