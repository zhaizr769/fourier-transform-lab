# 傅里叶变换可视化实验台 - 公式显示修复总结

## 修复时间
2026-11-23

## 主要问题
1. 性质表、变换对表格中的公式显示为 LaTeX 乱码（如 `longleftrightarrow`、`\frac{}` 等）
2. 实验台信号选择后公式加载不出来
3. 自定义信号手动输入功能不工作
4. 变换图像不显示
5. 幅度谱需要改为频域和时域对称显示

## 修复内容

### 1. signals.js - 信号库公式
- ✅ 所有 22 个信号的 formulaT 和 formulaX 已从 LaTeX 改为纯文本 Unicode
- 示例：`e^{-at}u(t)` 代替 `\text{...}`，`1/(a+jω)` 代替 `\frac{1}{a+j\omega}`

### 2. props.js - 性质算子公式
- ✅ 11 个性质的 formula 和 opFormula 已改为纯文本
- 包括：时移、频移、反转、展缩、共轭、微分、积分、频域微分、对偶、调制、抽样
- 示例：`x(at)  (1/|a|)X(jω/a)` 代替 `x(at)\;\longleftrightarrow\;\frac{1}{|a|}X\left(j\frac{\omega}{a}\right)`

### 3. propsview.js - 性质卡片公式
- ✅ EXTRA 数组中的卷积、相乘、帕塞瓦尔、共轭对称性公式已改为纯文本
- 示例：`_{-∞}^{+∞}|x(t)|²dt = (1/2π)∫_{-∞}^{+}|X(jω)|²dω`

### 4. pairsview.js - 变换对表格
- ✅ 不再使用 M.render()，直接使用纯文本 formulaT/formulaX
- ✅ 总纲行的求和符号已改为纯文本：`Σ_{k=-∞}^{+} a_k e^{jkω₀t}`

### 5. lab.js - 实验台核心逻辑
- ✅ updateFormula 函数使用 escapeHtml() 安全显示纯文本
- ✅ 所有 compose 函数的公式已改为纯文本（11 个算子）
- ✅ 绘图范围已设置为对称：-wmax 到 +wmax（频域），-tmax 到 +tmax（时域）
- ✅ 自定义信号功能正常工作

### 6. main.js - 首页公式速查
- ✅ 定义、周期信号 FT、常用变换对、性质表、LTI 系统的所有公式已改为纯文本
- 共修复 19 处 LaTeX 残留

### 7. modview.js - 调制模块
- ✅ 相乘性质、余弦变换、调幅波公式已改为纯文本

### 8. sysview.js - 系统模块
- ✅ 6 种预设系统的 formula 已改为纯文本（RC 低通/高通、二阶低通、微分器、积分器、延时、线性相位低通）
- ✅ 自定义有理式公式已改为纯文本
- ✅ polyLatex → polyText，odeLatex → odeText（辅助函数）

## 技术细节

### LaTeX → Unicode 转换规则
```latex
\frac{a}{b}           →  a/b
\sum_{k=-∞}^{+∞}      →  Σ_{k=-}^{+∞}
\int_{-∞}^{+∞}        →  _{-∞}^{+∞}
\delta(ω)             →  δ(ω)
\cdot                 →  ·
\longleftrightarrow   →  ⟷
\omega                →  ω
\pi                   →  π
\infty                →  ∞
\tau                  →  τ
^{}                   →  ^
_{}                   →  _
```

### 安全性增强
- 所有用户输入的表达式都经过 escapeHtml() 转义
- 防止 XSS 攻击

### 绘图优化
- 幅度谱和相位谱使用对称范围（-ωmax 到 +ωmax）
- 时域波形使用对称范围（-tmax 到 +tmax）
- 冲激谱线正确显示在对称范围内

## 测试验证

### 已验证功能
1. ✅ 点击任意信号按钮，公式正确显示
2. ✅ 性质变换链中，每步的公式正确复合
3. ✅ 变换对表格中，x(t) 和 X(jω) 对照清晰
4. ✅ 自定义信号可以正常输入和计算
5. ✅ 幅度谱和相位谱对称显示
6. ✅ 所有公式均为教材风格纯文本，无 LaTeX 乱码

### 待部署
- 本地 HTML 文件：`傅里叶变换可视化实验台.html` (203 KB)
- 可上传至 GitHub Pages / Netlify / Vercel 等静态托管服务
- 或使用 Python HTTP 服务器临时测试：`python -m http.server 8080`

## 文件清单
- src/js/signals.js - 信号库（22 个信号）
- src/js/core.js - 复数运算、傅里叶层、数值变换
- src/js/lab.js - 实验台核心逻辑
- src/js/props.js - 性质算子（11 个）
- src/js/propsview.js - 性质卡片视图
- src/js/pairsview.js - 变换对表格视图
- src/js/ui.js - UI 组件
- src/js/main.js - 首页和全局控制
- src/js/modview.js - 调制模块
- src/js/sysview.js - 系统模块
- src/js/mml.js - MathML 渲染器（已弃用，保留兼容）
- src/js/chart.js - 图表绘制
- src/js/topics.js - 专题模块（已移除）

## 注意事项
1. 所有公式使用 Unicode 字符，确保浏览器支持 UTF-8
2. 自定义信号表达式解析器支持标准数学函数（sin, cos, exp, abs 等）
3. 数值傅里叶变换使用梯形积分法，截断窗口由用户设置
4. 冲激谱线单独处理，不参与连续频谱的数值积分

## 下一步
1. 将本地 HTML 部署到公网 URL（GitHub Pages / Netlify / Vercel）
2. 添加更多预设信号（如有需要）
3. 优化数值计算的精度和性能
4. 添加导出功能（PNG / SVG / PDF）

---

**修复完成日期**: 2026-11-23  
**维护者**: Qoder Assistant
