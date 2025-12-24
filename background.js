// 初始化安装时设置基础数据
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['lastRuleId', 'totalBlocked']);

  // 仅在首次安装时初始化，不覆盖已有规则
  if (data.lastRuleId === undefined) {
    chrome.storage.local.set({
      lastRuleId: 0,
      totalBlocked: 0
    });
  }
  updateBadge();
});

// 更新图标上的统计数字
async function updateBadge() {
  const data = await chrome.storage.local.get({ totalBlocked: 0 });
  const count = data.totalBlocked;
  if (count > 0) {
    chrome.action.setBadgeText({ text: count > 9999 ? '9k+' : count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// 监听规则命中事件 (仅在开发模式/已解压加载时有效)
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  const { rule, request } = info;

  chrome.storage.local.get({ blockedLogs: [], totalBlocked: 0, isPaused: false }, (data) => {
    if (data.isPaused) return; // 暂停记录

    const timestamp = Date.now();
    const fullUrl = request.url;
    const domain = new URL(fullUrl).hostname;

    let logs = data.blockedLogs;
    let totalBlocked = data.totalBlocked + 1;

    // 记录详细日志，限制 50 条
    logs.unshift({
      domain: domain,
      url: fullUrl,
      method: request.method,
      action: rule.action ? rule.action.type : 'block',
      count: 1,
      lastTime: timestamp,
      ruleId: rule.ruleId
    });

    chrome.storage.local.set({
      blockedLogs: logs.slice(0, 50),
      totalBlocked: totalBlocked
    });

    updateBadge();
  });
});

// 点击插件图标时打开侧边栏
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
