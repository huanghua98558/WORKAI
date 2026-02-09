/**
 * 测试报告生成脚本
 * 解析 Playwright 测试结果并生成详细的 HTML 报告
 */

const fs = require('fs');
const path = require('path');

// 读取测试结果 JSON 文件
const testResultsPath = path.join(__dirname, '../test-results.json');

if (!fs.existsSync(testResultsPath)) {
  console.log('⚠ 未找到测试结果文件 test-results.json');
  console.log('请先运行测试: npx playwright test');
  process.exit(1);
}

const testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));

// 生成 HTML 报告
function generateHTMLReport(results) {
  const totalTests = results.suites.reduce((sum, suite) => sum + suite.specs.length, 0);
  const passedTests = results.suites.reduce((sum, suite) =>
    sum + suite.specs.filter(spec => spec.tests.some(t => t.results[0].status === 'passed')).length, 0);
  const failedTests = totalTests - passedTests;
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0;

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkTool AI 前端测试报告</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    .header h1 {
      font-size: 36px;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .header p {
      font-size: 16px;
      opacity: 0.9;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 40px;
      background: #f8f9fa;
    }

    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .stat-card .value {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .stat-card .label {
      font-size: 14px;
      color: #666;
      font-weight: 600;
    }

    .stat-card.total .value { color: #667eea; }
    .stat-card.passed .value { color: #10b981; }
    .stat-card.failed .value { color: #ef4444; }
    .stat-card.rate .value { color: #8b5cf6; }

    .content {
      padding: 40px;
    }

    .section-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 24px;
      color: #1f2937;
    }

    .test-suite {
      background: #f9fafb;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      border-left: 4px solid #667eea;
    }

    .test-suite-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1f2937;
    }

    .test-item {
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .test-item.passed {
      border-left: 4px solid #10b981;
    }

    .test-item.failed {
      border-left: 4px solid #ef4444;
    }

    .test-name {
      font-weight: 600;
      color: #1f2937;
    }

    .test-status {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }

    .test-status.passed {
      background: #d1fae5;
      color: #065f46;
    }

    .test-status.failed {
      background: #fee2e2;
      color: #991b1b;
    }

    .test-details {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #666;
    }

    .error-message {
      color: #ef4444;
      font-weight: 500;
    }

    .footer {
      text-align: center;
      padding: 40px;
      background: #f9fafb;
      color: #666;
      font-size: 14px;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 WorkTool AI 前端测试报告</h1>
      <p>测试时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>

    <div class="summary">
      <div class="stat-card total">
        <div class="value">${totalTests}</div>
        <div class="label">总测试数</div>
      </div>
      <div class="stat-card passed">
        <div class="value">${passedTests}</div>
        <div class="label">通过</div>
      </div>
      <div class="stat-card failed">
        <div class="value">${failedTests}</div>
        <div class="label">失败</div>
      </div>
      <div class="stat-card rate">
        <div class="value">${successRate}%</div>
        <div class="label">成功率</div>
      </div>
    </div>

    <div class="content">
      <h2 class="section-title">📋 测试详情</h2>

      ${results.suites.map(suite => {
        const suiteTests = suite.specs.flatMap(spec => spec.tests);
        const suitePassed = suiteTests.filter(t => t.results[0].status === 'passed').length;
        const suiteFailed = suiteTests.length - suitePassed;

        return `
          <div class="test-suite">
            <div class="test-suite-title">
              📂 ${suite.title}
              <span style="font-size: 14px; color: #666; margin-left: 12px;">
                (${suitePassed}/${suiteTests.length} 通过)
              </span>
            </div>

            ${suite.specs.map(spec => {
              const test = spec.tests[0];
              const status = test.results[0].status;

              return `
                <div class="test-item ${status}">
                  <div>
                    <div class="test-name">${spec.title}</div>
                    ${status === 'failed' ? `
                      <div class="test-details">
                        <div class="error-message">❌ ${test.results[0].error?.message || '测试失败'}</div>
                      </div>
                    ` : ''}
                  </div>
                  <span class="test-status ${status}">
                    ${status === 'passed' ? '✅ 通过' : '❌ 失败'}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }).join('')}
    </div>

    <div class="footer">
      <p>生成时间: ${new Date().toLocaleString('zh-CN')} | Playwright 测试报告</p>
    </div>
  </div>
</body>
</html>
  `;

  // 写入文件
  const reportPath = path.join(__dirname, '../test-report-detailed.html');
  fs.writeFileSync(reportPath, html);

  console.log('✅ 详细测试报告已生成: test-report-detailed.html');
  console.log('');
  console.log('📊 测试结果统计:');
  console.log(`   总测试数: ${totalTests}`);
  console.log(`   通过: ${passedTests}`);
  console.log(`   失败: ${failedTests}`);
  console.log(`   成功率: ${successRate}%`);
  console.log('');
}

// 运行报告生成
try {
  generateHTMLReport(testResults);
} catch (error) {
  console.error('❌ 生成报告失败:', error.message);
  process.exit(1);
}
