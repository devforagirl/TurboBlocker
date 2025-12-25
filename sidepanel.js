// --- 国际化支持 ---
function applyI18n() {
  // 翻译 textContent
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });
  // 翻译 title/tooltip
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.title = msg;
  });
  // 翻译 placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.placeholder = msg;
  });
}

// 辅助函数：根据规则状态返回翻译后的行为文本
function getActionText(action, ruleId) {
  if (!action) return 'Unknown';
  let key = `action${action.charAt(0).toUpperCase() + action.slice(1)}`;
  if (action === 'allowAllRequests') key = 'actionAllowAll';
  const base = chrome.i18n.getMessage(key) || action;
  return `${base}${ruleId ? ` #${ruleId}` : ''}`;
}

// 辅助函数：将资源类型代码转换为翻译后的文本
function getResourceTypeText(types) {
  if (!types || types.length === 0) return 'ALL';
  const typeMap = {
    'main_frame': 'resMain',
    'sub_frame': 'resSub',
    'script': 'resScript',
    'image': 'resImage',
    'stylesheet': 'resStyle',
    'font': 'resFont',
    'xmlhttprequest': 'resXhr',
    'ping': 'resPing',
    'beacon': 'resBeacon',
    'websocket': 'resWs',
    'media': 'resMedia',
    'other': 'resOther'
  };
  return types.map(t => chrome.i18n.getMessage(typeMap[t]) || t).join(', ');
}

function timeAgo(timestamp) {
  const seconds = Math.floor((new Date() - timestamp) / 1000);
  if (seconds < 5) return chrome.i18n.getMessage('justNow');
  if (seconds < 60) return chrome.i18n.getMessage('secondsAgo', [seconds]);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return chrome.i18n.getMessage('minutesAgo', [minutes]);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return chrome.i18n.getMessage('hoursAgo', [hours]);
  return new Date(timestamp).toLocaleDateString();
}

// 辅助函数：安全地转义 HTML 字符串
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Tab Switching ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(tab.dataset.target).classList.add('active');

    if (tab.dataset.target === 'rules') {
      renderDynamicRules();
    }
  });
});

// --- Monitoring Logic ---
let expandedItemTime = null; // 记录当前展开项目的唯一时间戳，用于在重新渲染时保持展开状态

function renderLogs() {
  const filterAction = document.getElementById('filter-action-monitor').value;

  chrome.storage.local.get({ blockedLogs: [] }, (data) => {
    console.log('Retrieved logs from storage:', data.blockedLogs);
    const container = document.getElementById('log-container');
    const logs = data.blockedLogs;

    // 应用动作过滤
    const filteredLogs = logs.filter(log => {
      if (filterAction === 'all') return true;
      return log.action === filterAction;
    });

    if (filteredLogs.length === 0) {
      container.innerHTML = `<div class="empty">${chrome.i18n.getMessage('statusEmpty')}</div>`;
      return;
    }

    container.innerHTML = filteredLogs.map((log, index) => {
      const actionClass = log.action === 'block' ? 'action-block' : (log.action === 'allow' ? 'action-allow' : 'action-other');
      const actionText = getActionText(log.action, log.ruleId);
      const actionBadge = `<span class="action-badge ${actionClass}">${actionText}</span>`;
      const isExpanded = log.lastTime === expandedItemTime;

      return `
        <div class="log-item ${isExpanded ? 'expanded' : ''}" data-time="${log.lastTime}" style="cursor: pointer;">
          <div class="flex-between log-header">
            <span class="domain">${escapeHTML(log.domain)}</span>
            ${actionBadge}
          </div>
          <div class="log-meta">
            <span class="time">${timeAgo(log.lastTime)}</span>
          </div>
          <div class="full-url">
            <div class="detail-row"><span class="detail-label">${chrome.i18n.getMessage('labelFilter')}:</span>${escapeHTML(log.url)}</div>
            <div class="flex-between detail-actions">
              <span><span class="detail-label">${chrome.i18n.getMessage('method')}:</span>${escapeHTML(log.method || 'GET')}</span>
              <button class="quick-add-btn" data-url="${escapeHTML(log.url)}">${chrome.i18n.getMessage('joinRule')}</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // 点击展开逻辑：单选模式，且点击已展开项不折叠
    document.querySelectorAll('.log-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.classList.contains('expanded')) return;

        expandedItemTime = parseInt(item.dataset.time); // 记录当前展开的唯一时间戳

        // 收起其他所有项目
        document.querySelectorAll('.log-item.expanded').forEach(el => {
          el.classList.remove('expanded');
        });

        // 展开当前项
        item.classList.add('expanded');
      });
    });

    // 绑定“加入规则”按钮事件
    document.querySelectorAll('.quick-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止触发折叠
        const url = btn.dataset.url;

        // 1. 切换到规则管理标签
        const rulesTab = document.querySelector('.tab[data-target="rules"]');
        rulesTab.click();

        // 2. 填充 URL 地址
        const filterInput = document.getElementById('rule-filter');
        filterInput.value = url;
        filterInput.focus();

        // 滚动到顶部以看到输入框
        document.getElementById('rules').scrollTop = 0;
      });
    });

    // 悬停显示完整内容 (仅在文本被截断时显示)
    document.querySelectorAll('.detail-row').forEach(row => {
      row.addEventListener('mouseenter', () => {
        if (row.scrollWidth > row.clientWidth) {
          row.title = row.textContent;
        } else {
          row.removeAttribute('title');
        }
      });
    });
  });
}

document.getElementById('filter-action-monitor').addEventListener('change', () => {
  expandedItemTime = null; // 切换过滤条件时重置展开状态
  renderLogs();
});

// --- 按钮控制逻辑 ---
document.getElementById('record-toggle').addEventListener('click', () => {
  chrome.storage.local.get({ isPaused: false }, (data) => {
    const newState = !data.isPaused;
    chrome.storage.local.set({ isPaused: newState }, () => {
      updateRecordButton(newState);
    });
  });
});

function updateRecordButton(isPaused) {
  const btn = document.getElementById('record-toggle');
  if (isPaused) {
    btn.textContent = chrome.i18n.getMessage('btnResume');
    btn.style.background = '#10b981'; // 绿色表示可以开始
    btn.style.color = 'white';
  } else {
    btn.textContent = chrome.i18n.getMessage('btnPause');
    btn.style.background = '#eee'; // 灰色表示正在运行，可以暂停
    btn.style.color = '#333';
  }
}

// 初始化按钮状态
chrome.storage.local.get({ isPaused: false }, (data) => {
  updateRecordButton(data.isPaused);
});

document.getElementById('clear-logs').addEventListener('click', () => {
  chrome.storage.local.set({ blockedLogs: [] });
});

// --- Dynamic Rules Logic ---

async function renderDynamicRules() {
  const container = document.getElementById('rule-list-container');
  // 从 storage 读取所有规则（包括已禁用的）
  const { customRules = [] } = await chrome.storage.local.get('customRules');

  if (customRules.length === 0) {
    container.innerHTML = `<div class="empty">${chrome.i18n.getMessage('emptyRules')}</div>`;
    return;
  }

  // 反转数组，使新规则（ID 较大或最后添加的）显示在最上方
  const sortedRules = [...customRules].reverse();

  container.innerHTML = sortedRules.map(rule => {
    const isPaused = rule.disabled === true;
    const filterText = rule.condition.urlFilter || rule.condition.regexFilter || 'Unknown';
    return `
      <div class="rule-card ${isPaused ? 'is-paused' : ''}">
        <div class="rule-title" title="Click to copy">${escapeHTML(filterText)}</div>
        <div class="rule-info flex-between">
          <div>
            <span>${chrome.i18n.getMessage('labelAction')}: ${
              rule.action.type === 'allowAllRequests' ? chrome.i18n.getMessage('actionAllowAll') : 
              (chrome.i18n.getMessage('action' + rule.action.type.charAt(0).toUpperCase() + rule.action.type.slice(1)) || rule.action.type.toUpperCase())
            }</span> | 
            <span>${chrome.i18n.getMessage('labelPriority')}: ${rule.priority}</span> |
            <span>ID: ${rule.id}</span>
          </div>
          <div class="rule-actions">
            <span class="toggle-btn ${isPaused ? 'paused' : 'active'}" data-id="${rule.id}" title="${isPaused ? 'Resume' : 'Pause'}">
              ${isPaused ? '▶' : '||'}
            </span>
            <span class="delete-btn" data-id="${rule.id}">&times;</span>
          </div>
        </div>
        <div class="rule-secondary-info" style="margin-top: 5px;">
          ${chrome.i18n.getMessage('labelResource')}: ${getResourceTypeText(rule.condition.resourceTypes)}
        </div>
      </div>
    `;
  }).join('');

  // 绑定点击复制事件
  document.querySelectorAll('.rule-title').forEach(el => {
    el.addEventListener('click', () => {
      const text = el.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = el.textContent;
        el.textContent = 'Copied!';
        setTimeout(() => { el.textContent = originalText; }, 1000);
      });
    });
  });

  // 绑定删除事件
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      
      const { customRules = [] } = await chrome.storage.local.get('customRules');
      const updatedRules = customRules.filter(r => r.id !== id);
      
      await chrome.storage.local.set({ customRules: updatedRules });
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [id]
      });
      renderDynamicRules();
    });
  });

  // 绑定暂停/恢复事件
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const { customRules = [] } = await chrome.storage.local.get('customRules');
      
      const ruleIndex = customRules.findIndex(r => r.id === id);
      if (ruleIndex === -1) return;

      const rule = customRules[ruleIndex];
      rule.disabled = !rule.disabled;

      await chrome.storage.local.set({ customRules });

      if (rule.disabled) {
        // 暂停：从引擎移除
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [id]
        });
      } else {
        // 恢复：添加到引擎
        const ruleToEnable = { ...rule };
        delete ruleToEnable.disabled; // 移除 UI 专用的属性
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: [ruleToEnable]
        });
      }
      renderDynamicRules();
    });
  });
}

// --- Resource Types Toggle ---
document.getElementById('toggle-resource-types').addEventListener('click', () => {
  const group = document.getElementById('resource-types');
  const arrow = document.getElementById('resource-arrow');
  const isHidden = group.style.display === 'none';
  
  group.style.display = isHidden ? 'grid' : 'none';
  arrow.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
});

document.getElementById('add-rule').addEventListener('click', async () => {
  const filter = document.getElementById('rule-filter').value.trim();
  const actionType = document.getElementById('rule-action').value;
  const priority = parseInt(document.getElementById('rule-priority').value) || 1;
  const resourceTypes = Array.from(document.querySelectorAll('#resource-types input:checked')).map(cb => cb.value);

  if (!filter) {
    alert(chrome.i18n.getMessage('alertEmpty'));
    return;
  }

  if (resourceTypes.length === 0) {
    alert(chrome.i18n.getMessage('alertNoResource'));
    // 自动展开以便用户选择
    const group = document.getElementById('resource-types');
    const arrow = document.getElementById('resource-arrow');
    group.style.display = 'grid';
    arrow.style.transform = 'rotate(90deg)';
    return;
  }

  if (filter === '*' || filter === '**') {
    alert(chrome.i18n.getMessage('alertDangerous'));
    return;
  }

  try {
    const { lastRuleId = 0, customRules = [] } = await chrome.storage.local.get(['lastRuleId', 'customRules']);
    const newId = lastRuleId + 1;

    const newRule = {
      id: newId,
      priority: priority,
      action: { type: actionType },
      condition: {
        urlFilter: filter,
        resourceTypes: resourceTypes.length > 0 ? resourceTypes : undefined
      }
    };

    // 保存到 storage
    customRules.push(newRule);
    await chrome.storage.local.set({ customRules, lastRuleId: newId });

    // 添加到引擎
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [newRule]
    });

    document.getElementById('rule-filter').value = '';
    renderDynamicRules();
  } catch (error) {
    console.error(error);
    alert(chrome.i18n.getMessage('addError') + error.message);
  }
});

// --- Import / Export ---

// 导出规则
document.getElementById('export-rules').addEventListener('click', async () => {
  const { customRules = [] } = await chrome.storage.local.get('customRules');
  const blob = new Blob([JSON.stringify(customRules, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dnr_rules_${new Date().getTime()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// 触发导入文件选择
document.getElementById('import-trigger').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

// 处理文件读取与规则更新
document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const importedRules = JSON.parse(event.target.result);
      if (!Array.isArray(importedRules)) throw new Error('无效的规则格式');

      let maxId = 0;
      importedRules.forEach(r => { if (r.id > maxId) maxId = r.id; });

      // 更新 storage
      await chrome.storage.local.set({ customRules: importedRules, lastRuleId: maxId });

      // 同步到引擎：仅添加未被禁用的规则
      const rulesToEnable = importedRules.filter(r => !r.disabled);
      
      // 先清空当前所有动态规则，再重新加载
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRules.map(r => r.id),
        addRules: rulesToEnable.map(r => {
          const cleanRule = { ...r };
          delete cleanRule.disabled;
          return cleanRule;
        })
      });

      renderDynamicRules();
      alert(chrome.i18n.getMessage('importSuccess'));
    } catch (err) {
      alert(chrome.i18n.getMessage('importError') + err.message);
    }
    e.target.value = ''; // 重置文件选择
  };
  reader.readAsText(file);
});

// --- Initial Setup ---
applyI18n();

// 强校验同步：确保引擎中的规则与 storage 中的 customRules 完全一致
async function syncRulesWithEngine() {
  const { customRules } = await chrome.storage.local.get('customRules');
  
  // 如果是首次运行（storage 为空），则尝试从引擎迁移或初始化
  if (!customRules) {
    const engineRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.storage.local.set({ customRules: engineRules || [] });
    renderLogs();
    renderDynamicRules();
    return;
  }

  // 获取引擎中当前的实际规则
  const engineRules = await chrome.declarativeNetRequest.getDynamicRules();
  const engineRuleIds = engineRules.map(r => r.id);

  // 计算应该处于启用状态的规则
  const rulesToEnable = customRules.filter(r => !r.disabled).map(r => {
    const cleanRule = { ...r };
    delete cleanRule.disabled;
    return cleanRule;
  });

  // 强行同步：先清空引擎中所有动态规则，再根据 storage 重新添加
  // 这样可以修复 ID 匹配但内容（如优先级、URL）不一致的潜在问题
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: engineRuleIds,
    addRules: rulesToEnable
  });

  console.log('Synchronization complete: Engine matches Storage.');
  renderLogs();
  renderDynamicRules();
}

syncRulesWithEngine();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockedLogs) renderLogs();
});
