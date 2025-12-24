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
  const base = chrome.i18n.getMessage(`action${action.charAt(0).toUpperCase() + action.slice(1)}`) || action;
  return `${base}${ruleId ? ` #${ruleId}` : ''}`;
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
    const container = document.getElementById('log-container');
    const logs = data.blockedLogs;

    // 应用动作过滤
    const filteredLogs = logs.filter(log => {
      if (filterAction === 'all') return true;
      return log.action === filterAction;
    });

    if (filteredLogs.length === 0) {
      container.innerHTML = '<div class="empty">暂无符合条件的记录</div>';
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
            <span class="domain">${log.domain}</span>
            ${actionBadge}
          </div>
          <div class="log-meta">
            <span class="time">${timeAgo(log.lastTime)}</span>
          </div>
          <div class="full-url">
            <div class="detail-row"><span class="detail-label">${chrome.i18n.getMessage('labelFilter')}:</span>${log.url}</div>
            <div class="flex-between detail-actions">
              <span><span class="detail-label">${chrome.i18n.getMessage('method')}:</span>${log.method || 'GET'}</span>
              <button class="quick-add-btn" data-url="${log.url}">${chrome.i18n.getMessage('joinRule')}</button>
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
  const rules = await chrome.declarativeNetRequest.getDynamicRules();

  if (rules.length === 0) {
    container.innerHTML = '<div class="empty">暂无自定义规则</div>';
    return;
  }

  container.innerHTML = rules.map(rule => `
    <div class="rule-card">
      <span class="delete-btn" data-id="${rule.id}">&times;</span>
      <div class="rule-title">${rule.condition.urlFilter || rule.condition.regexFilter || 'Unknown'}</div>
      <div class="rule-info">
        <span>${chrome.i18n.getMessage('labelAction')}: ${rule.action.type.toUpperCase()}</span> | 
        <span>${chrome.i18n.getMessage('labelPriority')}: ${rule.priority}</span>
      </div>
      <div class="rule-secondary-info">
        ${chrome.i18n.getMessage('labelResource')}: ${rule.condition.resourceTypes ? rule.condition.resourceTypes.join(', ') : 'ALL'}
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [id]
      });
      renderDynamicRules();
    });
  });
}

document.getElementById('add-rule').addEventListener('click', async () => {
  const filter = document.getElementById('rule-filter').value.trim();
  const actionType = document.getElementById('rule-action').value;
  const priority = parseInt(document.getElementById('rule-priority').value) || 1;
  const resourceTypes = Array.from(document.querySelectorAll('#resource-types input:checked')).map(cb => cb.value);

  if (!filter) {
    alert(chrome.i18n.getMessage('alertEmpty'));
    return;
  }

  // 基础防错
  if (filter === '*' || filter === '**') {
    alert(chrome.i18n.getMessage('alertDangerous'));
    return;
  }

  try {
    const { lastRuleId = 0 } = await chrome.storage.local.get('lastRuleId');
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

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [newRule]
    });

    await chrome.storage.local.set({ lastRuleId: newId });
    document.getElementById('rule-filter').value = '';
    renderDynamicRules();
  } catch (error) {
    console.error(error);
    alert('添加失败: ' + error.message);
  }
});

// --- Import / Export ---

// 导出规则
document.getElementById('export-rules').addEventListener('click', async () => {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
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

      // 获取当前最大的 ID 以后续继续自增，且避免覆盖
      let maxId = 0;
      importedRules.forEach(r => { if (r.id > maxId) maxId = r.id; });

      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: importedRules,
        removeRuleIds: importedRules.map(r => r.id) // 先删后加，确保覆盖或更新
      });

      await chrome.storage.local.set({ lastRuleId: maxId });
      renderDynamicRules();
      alert('导入成功！');
    } catch (err) {
      alert('导入失败: ' + err.message);
    }
    e.target.value = ''; // 重置文件选择
  };
  reader.readAsText(file);
});

// --- Initial Setup ---
renderLogs();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockedLogs) renderLogs();
});
