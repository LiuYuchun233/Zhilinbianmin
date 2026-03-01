(function () {
  var config = window.APP_CONFIG || {};
  var apiBase = String(config.API_BASE || "");
  var endpoints = config.ENDPOINTS || {};
  var storageKeys = config.STORAGE_KEYS || {};

  var FAVORITES_KEY = "zlbm_favorite_services";
  var ACCESSIBILITY_KEY = "zlbm_accessibility_pref";
  var ACTIVITY_KEY = "zlbm_recent_activity";

  var authGate = document.getElementById("authGate");
  var authTabs = document.querySelectorAll(".auth-tab");
  var authForms = document.querySelectorAll(".auth-form");
  var loginForm = document.getElementById("loginForm");
  var registerForm = document.getElementById("registerForm");
  var loginBtn = document.getElementById("loginBtn");
  var registerBtn = document.getElementById("registerBtn");

  var appShell = document.getElementById("appShell");
  var todayDate = document.getElementById("todayDate");
  var navButtons = document.querySelectorAll(".nav-btn");
  var pages = document.querySelectorAll(".tab-page");
  var toast = document.getElementById("toast");
  var dialog = document.getElementById("actionDialog");
  var dialogTitle = document.getElementById("dialogTitle");
  var dialogContent = document.getElementById("dialogContent");

  var serviceSearch = document.getElementById("serviceSearch");
  var quickServiceGrid = document.getElementById("quickServiceGrid");
  var favoriteList = document.getElementById("favoriteList");

  var noticeFilters = document.getElementById("noticeFilters");
  var noticeList = document.getElementById("noticeList");

  var templateGrid = document.getElementById("templateGrid");
  var taskForm = document.getElementById("taskForm");
  var taskSubmitBtn = document.getElementById("taskSubmitBtn");
  var taskTitle = document.getElementById("taskTitle");
  var taskCategory = document.getElementById("taskCategory");
  var taskPriority = document.getElementById("taskPriority");
  var taskDetail = document.getElementById("taskDetail");
  var statusFilter = document.getElementById("statusFilter");
  var taskList = document.getElementById("taskList");
  var taskEmpty = document.getElementById("taskEmpty");

  var orderSimForm = document.getElementById("orderSimForm");
  var orderPhone = document.getElementById("orderPhone");
  var orderNeed = document.getElementById("orderNeed");
  var orderSimBtn = document.getElementById("orderSimBtn");

  var toggleLargeFont = document.getElementById("toggleLargeFont");
  var toggleContrast = document.getElementById("toggleContrast");
  var voiceRead = document.getElementById("voiceRead");
  var logoutBtn = document.getElementById("logoutBtn");
  var activityList = document.getElementById("activityList");

  var currentUserIdEl = document.getElementById("currentUserId");
  var currentUserPhoneEl = document.getElementById("currentUserPhone");
  var profileUserNameEl = document.getElementById("profileUserName");
  var profileUserMetaEl = document.getElementById("profileUserMeta");
  var taskCount = document.getElementById("taskCount");
  var taskDoneRate = document.getElementById("taskDoneRate");
  var taskPendingCount = document.getElementById("taskPendingCount");
  var homeTotalTasks = document.getElementById("homeTotalTasks");
  var homePendingTasks = document.getElementById("homePendingTasks");
  var homeDoneRate = document.getElementById("homeDoneRate");

  var state = {
    authToken: readLocal(storageKeys.authToken),
    currentUser: normalizeUser(readLocalJson(storageKeys.currentUser)),
    tasks: [],
    noticeType: "all",
    favoriteServices: normalizeStringArray(readLocalJson(FAVORITES_KEY)),
    accessibility: readLocalJson(ACCESSIBILITY_KEY) || {
      largeFont: false,
      highContrast: false
    },
    activities: normalizeActivityList(readLocalJson(ACTIVITY_KEY))
  };

  var actionText = {
    assistant: {
      title: "AI便民助手",
      content: "支持自然语言办理咨询，可直接输入“我要报修路灯”或“帮我预约社区窗口”。"
    },
    code: {
      title: "一码通城",
      content: "开通后可用于社区门禁、活动签到、便民服务核验等场景。"
    },
    pay: {
      title: "生活缴费",
      content: "集中处理水电燃、物业费和停车费，后续可扩展自动提醒。"
    },
    booking: {
      title: "办事预约",
      content: "支持社区窗口、医保事项与街道便民专窗时段预约。"
    },
    home: {
      title: "到家服务",
      content: "系统将按距离、评分和服务时段推荐人员，支持在线预约。"
    },
    fresh: {
      title: "生鲜配送",
      content: "接入社区周边商超，常规时段90分钟内送达。"
    },
    request: {
      title: "我的任务",
      content: "你可以在任务页创建、跟踪、筛选和删除个人便民任务。"
    }
  };

  var notices = [
    {
      id: "n1",
      type: "service",
      time: "09:10",
      title: "社区服务中心新增午间值班窗口",
      desc: "工作日 12:00-14:00 可办理基础事务，缓解高峰排队。"
    },
    {
      id: "n2",
      type: "safety",
      time: "10:20",
      title: "3号楼电梯今日例行检修",
      desc: "检修时段 14:00-16:30，请住户尽量避开高峰使用。"
    },
    {
      id: "n3",
      type: "activity",
      time: "11:00",
      title: "周末长者健康讲座开放报名",
      desc: "社区卫生站联合举办，名额有限，可在办事预约中报名。"
    },
    {
      id: "n4",
      type: "service",
      time: "11:40",
      title: "便民缴费系统升级完成",
      desc: "新增物业账单明细展示，缴费记录支持按月筛选。"
    }
  ];

  var noticeTypeLabel = {
    service: "服务",
    safety: "安全",
    activity: "活动"
  };

  var statusLabelMap = {
    pending: "待受理",
    in_progress: "处理中",
    completed: "已办结"
  };

  var statusClassMap = {
    pending: "pending",
    in_progress: "running",
    completed: "done"
  };

  var priorityLabelMap = {
    low: "低",
    normal: "普通",
    high: "高",
    urgent: "紧急"
  };

  function readLocal(key) {
    try {
      return key ? window.localStorage.getItem(key) || "" : "";
    } catch (_error) {
      return "";
    }
  }

  function readLocalJson(key) {
    try {
      if (!key) return null;
      var raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  function writeLocal(key, value) {
    try {
      if (!key) return;
      if (!value) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    } catch (_error) {
      // ignore
    }
  }

  function writeLocalJson(key, payload) {
    try {
      if (!key) return;
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch (_error) {
      // ignore
    }
  }

  function normalizeStringArray(input) {
    if (!Array.isArray(input)) return [];
    return input
      .map(function (item) {
        return String(item || "").trim();
      })
      .filter(Boolean)
      .slice(0, 12);
  }

  function normalizeActivityList(input) {
    if (!Array.isArray(input)) return [];
    return input
      .map(function (item) {
        return {
          time: String(item.time || ""),
          text: String(item.text || "")
        };
      })
      .filter(function (item) {
        return item.text;
      })
      .slice(0, 15);
  }

  function normalizeUser(user) {
    var next = user || {};
    return {
      id: String(next.id || ""),
      name: String(next.name || "居民用户"),
      community: String(next.community || ""),
      phone: String(next.phone || "")
    };
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getNowTimeLabel() {
    var now = new Date();
    return (
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0")
    );
  }

  function setToday() {
    if (!todayDate) return;
    var now = new Date();
    var week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    todayDate.textContent =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0") +
      " " +
      week[now.getDay()];
  }

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  function logActivity(text) {
    if (!text) return;
    state.activities.unshift({
      time: getNowTimeLabel(),
      text: String(text)
    });
    state.activities = state.activities.slice(0, 12);
    writeLocalJson(ACTIVITY_KEY, state.activities);
    renderActivityList();
  }

  function renderActivityList() {
    if (!activityList) return;
    if (!state.activities.length) {
      activityList.innerHTML = '<li class="activity-item"><p class="activity-text">暂无动态记录</p></li>';
      return;
    }
    activityList.innerHTML = state.activities
      .map(function (item) {
        return (
          '<li class="activity-item">' +
          '<p class="activity-time">' +
          escapeHtml(item.time) +
          "</p>" +
          '<p class="activity-text">' +
          escapeHtml(item.text) +
          "</p>" +
          "</li>"
        );
      })
      .join("");
  }

  function switchTab(tab) {
    navButtons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.tab === tab);
    });
    pages.forEach(function (page) {
      page.classList.toggle("is-active", page.dataset.page === tab);
    });
  }

  function setAuthTab(tab) {
    authTabs.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.authTab === tab);
    });
    authForms.forEach(function (form) {
      form.classList.toggle("is-active", form.id === tab + "Form");
    });
  }

  function showAuthView() {
    if (authGate) authGate.classList.remove("is-hidden");
    if (appShell) appShell.classList.add("is-hidden");
  }

  function showAppView() {
    if (authGate) authGate.classList.add("is-hidden");
    if (appShell) appShell.classList.remove("is-hidden");
  }

  function updateUserInfo() {
    var user = normalizeUser(state.currentUser);
    if (currentUserIdEl) currentUserIdEl.textContent = user.phone || "-";
    if (currentUserPhoneEl) currentUserPhoneEl.textContent = user.phone || "-";
    if (profileUserNameEl) profileUserNameEl.textContent = user.name || "居民用户";
    if (profileUserMetaEl) {
      var parts = [];
      if (user.id) parts.push("账号ID：" + user.id);
      if (user.community) parts.push("社区：" + user.community);
      if (!parts.length) parts.push("请先完成登录");
      profileUserMetaEl.textContent = parts.join(" | ");
    }
  }

  function persistAuth() {
    writeLocal(storageKeys.authToken, state.authToken || "");
    writeLocal(storageKeys.currentUser, state.currentUser ? JSON.stringify(state.currentUser) : "");
  }

  function clearAuth() {
    state.authToken = "";
    state.currentUser = null;
    persistAuth();
  }

  function applyAccessibilityFromState() {
    if (!appShell) return;
    var enabledLargeFont = Boolean(state.accessibility && state.accessibility.largeFont);
    var enabledContrast = Boolean(state.accessibility && state.accessibility.highContrast);
    appShell.classList.toggle("large-font", enabledLargeFont);
    appShell.classList.toggle("high-contrast", enabledContrast);
    updateAccessibilityButtonText();
  }

  function persistAccessibility() {
    writeLocalJson(ACCESSIBILITY_KEY, {
      largeFont: Boolean(appShell && appShell.classList.contains("large-font")),
      highContrast: Boolean(appShell && appShell.classList.contains("high-contrast"))
    });
  }

  function updateAccessibilityButtonText() {
    if (toggleLargeFont) {
      var isLarge = appShell && appShell.classList.contains("large-font");
      toggleLargeFont.textContent = "大字模式：" + (isLarge ? "开" : "关");
    }
    if (toggleContrast) {
      var isContrast = appShell && appShell.classList.contains("high-contrast");
      toggleContrast.textContent = "高对比：" + (isContrast ? "开" : "关");
    }
  }

  function renderNoticeList() {
    if (!noticeList) return;
    var type = state.noticeType || "all";
    var items = notices.filter(function (item) {
      return type === "all" || item.type === type;
    });
    if (!items.length) {
      noticeList.innerHTML = '<li class="notice-item"><p class="notice-title">暂无该分类公告</p></li>';
      return;
    }
    noticeList.innerHTML = items
      .map(function (item) {
        return (
          '<li class="notice-item">' +
          '<div class="notice-top">' +
          '<span class="notice-type">' +
          escapeHtml(noticeTypeLabel[item.type] || "公告") +
          "</span>" +
          '<span class="notice-time">' +
          escapeHtml(item.time) +
          "</span>" +
          "</div>" +
          '<p class="notice-title">' +
          escapeHtml(item.title) +
          "</p>" +
          '<p class="notice-desc">' +
          escapeHtml(item.desc) +
          "</p>" +
          "</li>"
        );
      })
      .join("");
  }

  function renderNoticeFilterState() {
    if (!noticeFilters) return;
    var buttons = noticeFilters.querySelectorAll("[data-notice-type]");
    buttons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.noticeType === state.noticeType);
    });
  }

  function setNoticeType(type) {
    state.noticeType = type || "all";
    renderNoticeFilterState();
    renderNoticeList();
  }

  function getServiceTileByKey(key) {
    if (!quickServiceGrid) return null;
    return quickServiceGrid.querySelector('.service-tile[data-service-key="' + key + '"]');
  }

  function getServiceNameByKey(key) {
    var tile = getServiceTileByKey(key);
    if (!tile) return actionText[key] ? actionText[key].title : key;
    return String(tile.dataset.serviceName || key);
  }

  function persistFavorites() {
    writeLocalJson(FAVORITES_KEY, state.favoriteServices);
  }

  function renderFavoriteButtons() {
    if (!quickServiceGrid) return;
    var buttons = quickServiceGrid.querySelectorAll("[data-fav]");
    buttons.forEach(function (btn) {
      var key = String(btn.dataset.fav || "");
      var active = state.favoriteServices.indexOf(key) >= 0;
      btn.classList.toggle("is-active", active);
      btn.textContent = active ? "★" : "☆";
    });
  }

  function renderFavoriteList() {
    if (!favoriteList) return;
    if (!state.favoriteServices.length) {
      favoriteList.innerHTML =
        '<li class="favorite-item"><span class="favorite-name">暂无收藏，点击服务卡片右上角星标可加入</span></li>';
      return;
    }
    favoriteList.innerHTML = state.favoriteServices
      .map(function (key) {
        var name = getServiceNameByKey(key);
        return (
          '<li class="favorite-item">' +
          '<span class="favorite-name">' +
          escapeHtml(name) +
          "</span>" +
          '<button type="button" class="favorite-open" data-action="' +
          escapeHtml(key) +
          '">打开</button>' +
          "</li>"
        );
      })
      .join("");
  }

  function toggleFavorite(key) {
    var next = normalizeStringArray(state.favoriteServices);
    var index = next.indexOf(key);
    var added = false;
    if (index >= 0) {
      next.splice(index, 1);
    } else {
      next.unshift(key);
      next = next.slice(0, 8);
      added = true;
    }
    state.favoriteServices = next;
    persistFavorites();
    renderFavoriteButtons();
    renderFavoriteList();
    showToast(added ? "已加入常用服务" : "已取消收藏");
    logActivity((added ? "收藏服务：" : "取消收藏：") + getServiceNameByKey(key));
  }

  function filterServiceCards(keyword) {
    if (!quickServiceGrid) return;
    var value = String(keyword || "").trim().toLowerCase();
    var cards = quickServiceGrid.querySelectorAll(".service-tile");
    cards.forEach(function (card) {
      var name = String(card.dataset.serviceName || "").toLowerCase();
      var text = String(card.textContent || "").toLowerCase();
      var visible = !value || name.indexOf(value) >= 0 || text.indexOf(value) >= 0;
      card.classList.toggle("is-hidden", !visible);
    });
  }

  function fillTaskTemplate(button) {
    if (!button || !taskForm) return;
    taskTitle.value = String(button.dataset.title || "");
    taskCategory.value = String(button.dataset.category || "");
    taskPriority.value = String(button.dataset.priority || "normal");
    taskDetail.value = String(button.dataset.detail || "");
    switchTab("services");
    taskDetail.focus();
    showToast("模板已填充，可直接提交");
  }

  function readNoticeVoice() {
    if (!("speechSynthesis" in window)) {
      showToast("当前浏览器不支持语音播报");
      return;
    }
    var text = Array.prototype.map
      .call(noticeList.querySelectorAll(".notice-title"), function (node) {
        return node.textContent;
      })
      .join("。");
    if (!text) {
      showToast("暂无可播报内容");
      return;
    }
    var speech = new SpeechSynthesisUtterance("社区公告播报：" + text);
    speech.lang = "zh-CN";
    speech.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
    showToast("已开始语音播报");
  }

  function apiUrl(path) {
    return apiBase + String(path || "");
  }

  function buildHeaders(options, withAuth) {
    var headers = Object.assign({}, (options && options.headers) || {});
    if (withAuth && state.authToken) {
      headers.Authorization = "Bearer " + state.authToken;
    }
    return headers;
  }

  async function requestApi(path, options, withAuth) {
    var requestOptions = Object.assign({}, options || {});
    requestOptions.headers = buildHeaders(options, withAuth !== false);

    var response = await fetch(apiUrl(path), requestOptions);
    var payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    if (!response.ok) {
      var message = payload && payload.message ? payload.message : "请求失败";
      throw new Error(message);
    }
    return payload;
  }

  function renderTaskList() {
    if (!taskList || !taskEmpty) return;
    taskList.innerHTML = "";
    if (!state.tasks.length) {
      taskEmpty.style.display = "block";
      return;
    }
    taskEmpty.style.display = "none";

    state.tasks.forEach(function (task) {
      var item = document.createElement("li");
      item.className = "task-item";
      item.dataset.id = task.id;
      var statusClass = statusClassMap[task.status] || "pending";
      var statusText = statusLabelMap[task.status] || "待受理";
      var priorityText = priorityLabelMap[task.priority] || "普通";

      item.innerHTML =
        '<p class="task-title">' +
        escapeHtml(task.title) +
        "</p>" +
        '<p class="task-meta">' +
        '<span class="status ' +
        escapeHtml(statusClass) +
        '">' +
        escapeHtml(statusText) +
        "</span>" +
        '<span class="meta-chip">' +
        escapeHtml(task.category || "其他") +
        "</span>" +
        '<span class="meta-chip">优先级：' +
        escapeHtml(priorityText) +
        "</span>" +
        "</p>" +
        '<p class="task-detail">' +
        escapeHtml(task.detail || "无") +
        "</p>" +
        '<div class="task-actions single">' +
        '<button type="button" class="mini-btn danger" data-op="delete">删除任务</button>' +
        "</div>";
      taskList.appendChild(item);
    });
  }

  function renderStats() {
    var total = state.tasks.length;
    var done = state.tasks.filter(function (task) {
      return task.status === "completed";
    }).length;
    var pending = state.tasks.filter(function (task) {
      return task.status !== "completed";
    }).length;
    var doneRateText = total ? Math.round((done / total) * 100) + "%" : "0%";

    if (taskCount) taskCount.textContent = String(total);
    if (taskPendingCount) taskPendingCount.textContent = String(pending);
    if (taskDoneRate) taskDoneRate.textContent = doneRateText;

    if (homeTotalTasks) homeTotalTasks.textContent = String(total);
    if (homePendingTasks) homePendingTasks.textContent = String(pending);
    if (homeDoneRate) homeDoneRate.textContent = doneRateText;
  }

  async function loadTasks() {
    if (!taskEmpty) return;
    var query = [];
    if (statusFilter && statusFilter.value) {
      query.push("status=" + encodeURIComponent(statusFilter.value));
    }
    var queryText = query.length ? "?" + query.join("&") : "";
    try {
      taskEmpty.style.display = "block";
      taskEmpty.textContent = "正在加载任务...";
      var data = await requestApi(endpoints.myTasks + queryText, { method: "GET" }, true);
      state.tasks = Array.isArray(data.items) ? data.items : [];
      renderTaskList();
      renderStats();
      taskEmpty.textContent = "暂无任务，先提交一条试试。";
    } catch (error) {
      state.tasks = [];
      renderTaskList();
      renderStats();
      taskEmpty.style.display = "block";
      taskEmpty.textContent = "任务加载失败，请重新登录。";
      showToast("任务加载失败：" + error.message);
      if (String(error.message || "").toLowerCase().indexOf("unauthorized") >= 0) {
        doLogout(false);
      }
    }
  }

  function createTask(payload) {
    return requestApi(endpoints.myTasks, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  function deleteTask(taskId) {
    return requestApi(endpoints.myTaskById(taskId), { method: "DELETE" }, true);
  }

  async function handleEmergency() {
    var confirmed = window.confirm("是否发起应急求助？系统将同步通知网格员。");
    if (!confirmed) return;
    try {
      await createTask({
        title: "应急求助",
        category: "其他",
        priority: "urgent",
        detail: "居民从客户端发起应急求助，请尽快联系处理。"
      });
      showToast("应急求助已发送");
      logActivity("发起应急求助");
      await loadTasks();
      switchTab("services");
    } catch (error) {
      showToast("发送失败：" + error.message);
    }
  }

  function openActionDialog(key) {
    if (!key) return;
    if (key === "request") {
      switchTab("services");
      return;
    }
    if (key === "assistant") {
      window.location.href = "./assistant.html";
      return;
    }
    if (key === "emergency") {
      handleEmergency();
      return;
    }
    var content = actionText[key];
    if (!content) return;
    if (dialogTitle) dialogTitle.textContent = content.title;
    if (dialogContent) dialogContent.textContent = content.content;
    if (dialog && typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      alert(content.title + "：" + content.content);
    }
    logActivity("查看服务：" + content.title);
  }

  async function onTaskFormSubmit(event) {
    event.preventDefault();
    var payload = {
      title: String(taskTitle.value || "").trim(),
      category: String(taskCategory.value || "").trim(),
      priority: String(taskPriority.value || "").trim(),
      detail: String(taskDetail.value || "").trim()
    };
    if (!payload.title || !payload.category || !payload.detail) {
      showToast("请先填写完整任务信息");
      return;
    }
    taskSubmitBtn.disabled = true;
    taskSubmitBtn.textContent = "提交中...";
    try {
      await createTask(payload);
      taskForm.reset();
      taskPriority.value = "normal";
      showToast("任务创建成功");
      logActivity("创建任务：" + payload.title);
      await loadTasks();
      switchTab("services");
    } catch (error) {
      showToast("提交失败：" + error.message);
    } finally {
      taskSubmitBtn.disabled = false;
      taskSubmitBtn.textContent = "提交任务";
    }
  }

  async function onTaskListClick(event) {
    var button = event.target.closest("button[data-op]");
    if (!button) return;
    var item = button.closest(".task-item");
    if (!item) return;
    var taskId = item.dataset.id;
    if (!taskId) return;

    if (button.dataset.op === "delete") {
      var confirmed = window.confirm("确认删除该任务？");
      if (!confirmed) return;
      try {
        await deleteTask(taskId);
        showToast("任务已删除");
        logActivity("删除任务");
        await loadTasks();
      } catch (error) {
        showToast("删除失败：" + error.message);
      }
    }
  }

  async function onOrderSimSubmit(event) {
    event.preventDefault();
    var phone = String(orderPhone.value || "").trim();
    var need = String(orderNeed.value || "").trim();
    if (!/^1\d{10}$/.test(phone)) {
      showToast("请填写正确的11位手机号");
      return;
    }
    if (!need) {
      showToast("请填写服务需求");
      return;
    }

    orderSimBtn.disabled = true;
    orderSimBtn.textContent = "提交中...";
    try {
      await createTask({
        title: "生活服务订单",
        category: "生活服务",
        priority: "normal",
        detail: "联系电话：" + phone + "；需求：" + need
      });
      orderSimForm.reset();
      showToast("订单模拟已提交，并同步为任务");
      logActivity("提交生活服务模拟订单");
      await loadTasks();
      switchTab("services");
    } catch (error) {
      showToast("提交失败：" + error.message);
    } finally {
      orderSimBtn.disabled = false;
      orderSimBtn.textContent = "提交模拟订单";
    }
  }

  async function applyAuthPayload(payload) {
    state.authToken = String(payload.token || "");
    state.currentUser = normalizeUser(payload.user || {});
    persistAuth();
    updateUserInfo();
    showAppView();
    switchTab("home");
    logActivity("登录系统：" + (state.currentUser.phone || "未知账号"));
    await loadTasks();
  }

  async function onLoginSubmit(event) {
    event.preventDefault();
    var formData = new FormData(loginForm);
    var phone = String(formData.get("phone") || "").trim();
    var password = String(formData.get("password") || "");
    if (!/^1\d{10}$/.test(phone)) {
      showToast("请输入正确的11位手机号");
      return;
    }
    if (password.length < 6) {
      showToast("密码至少6位");
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "登录中...";
    try {
      var payload = await requestApi(
        endpoints.authLogin,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone, password: password })
        },
        false
      );
      await applyAuthPayload(payload);
      loginForm.reset();
      showToast("登录成功");
    } catch (error) {
      showToast("登录失败：" + error.message);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "登录";
    }
  }

  async function onRegisterSubmit(event) {
    event.preventDefault();
    var formData = new FormData(registerForm);
    var name = String(formData.get("name") || "").trim();
    var phone = String(formData.get("phone") || "").trim();
    var community = String(formData.get("community") || "").trim();
    var password = String(formData.get("password") || "");
    var confirmPassword = String(formData.get("confirmPassword") || "");

    if (!name) {
      showToast("请输入姓名");
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      showToast("请输入正确的11位手机号");
      return;
    }
    if (!community) {
      showToast("请输入社区名称");
      return;
    }
    if (password.length < 6) {
      showToast("密码至少6位");
      return;
    }
    if (password !== confirmPassword) {
      showToast("两次密码输入不一致");
      return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = "注册中...";
    try {
      var payload = await requestApi(
        endpoints.authRegister,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name,
            phone: phone,
            community: community,
            password: password
          })
        },
        false
      );
      await applyAuthPayload(payload);
      registerForm.reset();
      showToast("注册成功，已自动登录");
      logActivity("完成注册：" + phone);
    } catch (error) {
      showToast("注册失败：" + error.message);
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = "注册并登录";
    }
  }

  async function doLogout(showMessage) {
    try {
      if (state.authToken) {
        await requestApi(endpoints.authLogout, { method: "POST" }, true);
      }
    } catch (_error) {
      // logout best effort
    }
    clearAuth();
    state.tasks = [];
    renderTaskList();
    renderStats();
    showAuthView();
    setAuthTab("login");
    if (showMessage) {
      showToast("已退出登录");
    }
  }

  async function tryRestoreSession() {
    if (!state.authToken) return false;
    try {
      var payload = await requestApi(endpoints.authMe, { method: "GET" }, true);
      state.currentUser = normalizeUser(payload.user || {});
      persistAuth();
      updateUserInfo();
      showAppView();
      await loadTasks();
      return true;
    } catch (_error) {
      clearAuth();
      return false;
    }
  }

  function bindEvents() {
    authTabs.forEach(function (tabBtn) {
      tabBtn.addEventListener("click", function () {
        setAuthTab(tabBtn.dataset.authTab || "login");
      });
    });

    if (loginForm) loginForm.addEventListener("submit", onLoginSubmit);
    if (registerForm) registerForm.addEventListener("submit", onRegisterSubmit);
    if (taskForm) taskForm.addEventListener("submit", onTaskFormSubmit);
    if (taskList) taskList.addEventListener("click", onTaskListClick);
    if (statusFilter) statusFilter.addEventListener("change", loadTasks);
    if (orderSimForm) orderSimForm.addEventListener("submit", onOrderSimSubmit);

    navButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.dataset.tab || "home");
      });
    });

    if (serviceSearch) {
      serviceSearch.addEventListener("input", function () {
        filterServiceCards(serviceSearch.value);
      });
    }

    if (noticeFilters) {
      noticeFilters.addEventListener("click", function (event) {
        var button = event.target.closest("[data-notice-type]");
        if (!button) return;
        setNoticeType(button.dataset.noticeType || "all");
      });
    }

    if (templateGrid) {
      templateGrid.addEventListener("click", function (event) {
        var button = event.target.closest(".template-btn");
        if (!button) return;
        fillTaskTemplate(button);
      });
    }

    if (appShell) {
      appShell.addEventListener("click", function (event) {
        var favBtn = event.target.closest("[data-fav]");
        if (favBtn) {
          toggleFavorite(String(favBtn.dataset.fav || ""));
          return;
        }
        var actionBtn = event.target.closest("[data-action]");
        if (actionBtn) {
          openActionDialog(String(actionBtn.dataset.action || ""));
        }
      });
    }

    if (toggleLargeFont) {
      toggleLargeFont.addEventListener("click", function () {
        if (!appShell) return;
        var enabled = appShell.classList.toggle("large-font");
        state.accessibility.largeFont = enabled;
        updateAccessibilityButtonText();
        persistAccessibility();
        showToast(enabled ? "已开启大字模式" : "已关闭大字模式");
        logActivity((enabled ? "开启" : "关闭") + "大字模式");
      });
    }

    if (toggleContrast) {
      toggleContrast.addEventListener("click", function () {
        if (!appShell) return;
        var enabled = appShell.classList.toggle("high-contrast");
        state.accessibility.highContrast = enabled;
        updateAccessibilityButtonText();
        persistAccessibility();
        showToast(enabled ? "已开启高对比" : "已关闭高对比");
        logActivity((enabled ? "开启" : "关闭") + "高对比模式");
      });
    }

    if (voiceRead) {
      voiceRead.addEventListener("click", function () {
        readNoticeVoice();
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        doLogout(true);
      });
    }
  }

  async function bootstrap() {
    setToday();
    setAuthTab("login");
    setNoticeType("all");
    renderFavoriteButtons();
    renderFavoriteList();
    renderTaskList();
    renderStats();
    renderActivityList();
    applyAccessibilityFromState();
    updateUserInfo();
    bindEvents();

    var restored = await tryRestoreSession();
    if (!restored) {
      showAuthView();
    }
  }

  bootstrap();
})();
