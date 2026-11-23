/* 测试脚本：验证所有公式是否已改为纯文本格式 */

// 检查 signals.js
const fs = require('fs');
const path = require('path');

const files = [
  'src/js/signals.js',
  'src/js/props.js',
  'src/js/propsview.js',
  'src/js/pairsview.js',
  'src/js/lab.js'
];

let hasErrors = false;

files.forEach(file => {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  
  // 检查是否还有 LaTeX 命令
  const latexPatterns = [
    /\\frac\{/,
    /\\sum_/,
    /\\int_/,
    /\\delta\(/,
    /\\cdot/,
    /\\left\[|\\\right\]/,
    /\\longleftrightarrow/,
    /\^{[\w\\]+}/,
    /_{[\w\\]+}/,
    /\\omega/,
    /\\pi/,
    /\\infty/,
    /\\tau/,
    /\\cos\(|\\sin\(|\\tan\(/,
    /\\exp\(/,
    /\\ln\(|\\log\(/,
    /\\sqrt\{/,
    /\\abs\{/,
    /\\text\{/
  ];
  
  latexPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      console.error(`❌ ${file} 中仍包含 LaTeX 命令: ${pattern}`);
      hasErrors = true;
    }
  });
});

if (!hasErrors) {
  console.log('✅ 所有文件中的公式都已成功转换为纯文本格式！');
} else {
  console.log('\n⚠️  发现 LaTeX 残留，需要进一步清理。');
  process.exit(1);
}
