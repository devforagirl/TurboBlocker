// 会话计数本地缓存（防止并发请求下的异步竞态问题）
let sessionCountCache = 0;

// 更新图标文字
function updateBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? (count > 999 ? '999+' : count.toString()) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' });
}

// 监听切换标签页
chrome.tabs.onActivated.addListener(() => {
  sessionCountCache = 0;
  chrome.storage.session.set({ currentSessionCount: 0 });
  updateBadge(0);
});

// 监听页面刷新/跳转
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 仅在主框架 (main frame) 刷新且状态为 loading 时重置计数
  if (changeInfo.status === 'loading' && tab.url && !tab.url.startsWith('chrome://')) {
    sessionCountCache = 0;
    chrome.storage.session.set({ currentSessionCount: 0 });
    updateBadge(0);
  }
});

// 初始化安装时设置基础数据
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['lastRuleId', 'totalBlocked']);
  if (data.lastRuleId === undefined) {
    chrome.storage.local.set({ lastRuleId: 0, totalBlocked: 0 });
  }
  // 初始化会话存储
  sessionCountCache = 0;
  chrome.storage.session.set({ currentSessionCount: 0 });
});

// 监听规则命中事件
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  const { rule, request } = info;

  chrome.storage.local.get({ blockedLogs: [], totalBlocked: 0, isPaused: false, customRules: [] }, (data) => {
    if (data.isPaused) return;

    // 同步更新缓存并更新图标，随后异步同步到 session storage
    sessionCountCache++;
    updateBadge(sessionCountCache);
    chrome.storage.session.set({ currentSessionCount: sessionCountCache });

    const timestamp = Date.now();
    const domain = new URL(request.url).hostname;

    // 修复隐患：从存储的自定义规则中查找对应的 Action 类型
    // 因为 onRuleMatchedDebug 返回的 rule 对象通常只包含 ruleId，不包含完整的 action 定义
    const actualRule = data.customRules.find(r => r.id === rule.ruleId);
    const actionType = actualRule ? actualRule.action.type : 'block';

    let logs = data.blockedLogs;
    let totalBlocked = data.totalBlocked + 1;

    // 记录日志
    logs.unshift({
      domain: domain,
      url: request.url,
      method: request.method,
      action: actionType,
      count: 1,
      lastTime: timestamp,
      ruleId: rule.ruleId
    });

    chrome.storage.local.set({
      blockedLogs: logs.slice(0, 50),
      totalBlocked: totalBlocked
    });
  });
});

// 点击插件图标时打开侧边栏
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
