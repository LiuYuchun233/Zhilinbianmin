(function () {
  var config = window.APP_CONFIG || {};
  var apiBase = String(config.API_BASE || "");
  var endpoints = config.ENDPOINTS || {};
  var storageKeys = config.STORAGE_KEYS || {};

  var authGate = document.getElementById("authGate");
  var authTabs = document.querySelectorAll(".auth-tab");
  var authForms = document.querySelectorAll(".auth-form");
  var loginForm = document.getElementById("loginForm");
  var registerForm = document.getElementById("registerForm");
  var loginBtn = document.getElementById("loginBtn");
  var registerBtn = document.getElementById("registerBtn");

  var appShell = document.getElementById("appShell");
  var todayDate = document.getElementById("todayDate");
  var toggleLargeFont = document.getElementById("toggleLargeFont");
  var toggleContrast = document.getElementById("toggleContrast");
  var voiceRead = document.getElementById("voiceRead");
  var navButtons = document.querySelectorAll(".nav-btn");
  var pages = document.querySelectorAll(".tab-page");
  var actionButtons = document.querySelectorAll(".action-btn[data-action], .ghost-btn[data-action]");
  var dialog = document.getElementById("actionDialog");
  var dialogTitle = document.getElementById("dialogTitle");
  var dialogContent = document.getElementById("dialogContent");
  var toast = document.getElementById("toast");
  var newsList = document.getElementById("newsList");
  var taskForm = document.getElementById("taskForm");
  var taskSubmitBtn = document.getElementById("taskSubmitBtn");
  var taskTitle = document.getElementById("taskTitle");
  var taskCategory = document.getElementById("taskCategory");
  var taskPriority = document.getElementById("taskPriority");
  var taskDetail = document.getElementById("taskDetail");
  var taskList = document.getElementById("taskList");
  var taskEmpty = document.getElementById("taskEmpty");
  var statusFilter = document.getElementById("statusFilter");
  var taskCount = document.getElementById("taskCount");
  var taskDoneRate = document.getElementById("taskDoneRate");
  var taskPendingCount = document.getElementById("taskPendingCount");
  var currentUserIdEl = document.getElementById("currentUserId");
  var currentUserPhoneEl = document.getElementById("currentUserPhone");
  var profileUserNameEl = document.getElementById("profileUserName");
  var profileUserMetaEl = document.getElementById("profileUserMeta");
  var logoutBtn = document.getElementById("logoutBtn");

  var state = {
    authToken: readLocal(storageKeys.authToken),
    currentUser: readLocalJson(storageKeys.currentUser),
    tasks: []
  };

  var actionText = {
    assistant: {
      title: "AI 便民助手",
      content: "请说出您的需求，例如：我要预约陪诊、我要报修路灯。"
    },
    code: {
      title: "一码通城",
      content: "统一电子码可用于社区门禁、办事签到和便民缴费。"
    },
    pay: {
      title: "生活缴费",
      content: "支持水电燃、物业、停车等常见生活缴费。"
    },
    booking: {
      title: "办事预约",
      content: "可预约社区服务窗口、医保事项和街道便民专窗。"
    },
    home: {
      title: "家政到家",
      content: "系统按距离、信用评分和空闲时段推荐服务人员。"
    },
    fresh: {
      title: "生鲜配送",
      content: "已开启周边市场运力协同，常规时段 90 分钟内送达。"
    },
    request: {
      title: "我的任务",
      content: "客户端支持新建和删除任务，任务状态由后台管理员处理。"
    }
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
      if (value === null || typeof value === "undefined" || value === "") {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    } catch (_error) {
      // ignore storage errors
    }
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

  function setToday() {
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
    toast.textContent = text;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
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
      var active = form.id === tab + "Form";
      form.classList.toggle("is-active", active);
    });
  }

  function openActionDialog(key) {
    if (key === "emergency") {
      handleEmergency();
      return;
    }
    var item = actionText[key];
    if (!item) return;
    dialogTitle.textContent = item.title;
    dialogContent.textContent = item.content;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      alert(item.title + "：" + item.content);
    }
  }

  function readNews() {
    if (!("speechSynthesis" in window)) {
      showToast("当前浏览器不支持语音播报");
      return;
    }
    var mergedText = Array.prototype.map
      .call(newsList.querySelectorAll("li"), function (li) {
        return li.textContent;
      })
      .join("。");
    var utterance = new SpeechSynthesisUtterance("社区热点提醒：" + mergedText);
    utterance.lang = "zh-CN";
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    showToast("已开始语音播报");
  }

  function apiUrl(path) {
    return apiBase + path;
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

  function showAuthView() {
    authGate.classList.remove("is-hidden");
    appShell.classList.add("is-hidden");
  }

  function showAppView() {
    authGate.classList.add("is-hidden");
    appShell.classList.remove("is-hidden");
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

  function updateUserInfo() {
    var user = normalizeUser(state.currentUser);
    if (currentUserIdEl) currentUserIdEl.textContent = user.phone || "-";
    if (currentUserPhoneEl) currentUserPhoneEl.textContent = user.phone || "-";
    if (profileUserNameEl) profileUserNameEl.textContent = user.name || "居民用户";
    if (profileUserMetaEl) {
      var segments = [];
      if (user.id) segments.push("账号ID：" + user.id);
      if (user.community) segments.push("社区：" + user.community);
      if (!segments.length) segments.push("请完成登录");
      profileUserMetaEl.textContent = segments.join(" | ");
    }
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderTaskList() {
    taskList.innerHTML = "";
    if (!state.tasks.length) {
      taskEmpty.style.display = "block";
      return;
    }
    taskEmpty.style.display = "none";

    state.tasks.forEach(function (task) {
      var li = document.createElement("li");
      li.className = "task-item";
      li.dataset.id = task.id;

      var statusClass = statusClassMap[task.status] || "pending";
      var statusText = statusLabelMap[task.status] || "待受理";
      var priorityText = priorityLabelMap[task.priority] || "普通";

      li.innerHTML =
        '<div class="task-main">' +
        '<p class="task-title">' + escapeHtml(task.title) + "</p>" +
        '<p class="task-meta"><span class="status ' + statusClass + '">' + statusText + "</span>" +
        '<span class="meta-chip">' + escapeHtml(task.category || "其他") + "</span>" +
        '<span class="meta-chip">优先级：' + escapeHtml(priorityText) + "</span></p>" +
        '<p class="task-detail">' + escapeHtml(task.detail || "无") + "</p>" +
        "</div>" +
        '<div class="task-actions single">' +
        '<button type="button" class="mini-btn danger" data-op="delete">删除任务</button>' +
        "</div>";
      taskList.appendChild(li);
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

    taskCount.textContent = String(total);
    taskPendingCount.textContent = String(pending);
    taskDoneRate.textContent = total ? Math.round((done / total) * 100) + "%" : "0%";
  }

  async function loadTasks() {
    var query = [];
    if (statusFilter.value) {
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
      if (String(error.message).toLowerCase().includes("unauthorized")) {
        doLogout(false);
      }
    }
  }

  async function createTask(payload) {
    return requestApi(endpoints.myTasks, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  async function deleteTask(taskId) {
    return requestApi(endpoints.myTaskById(taskId), { method: "DELETE" });
  }

  async function handleEmergency() {
    var confirmed = window.confirm("是否发起应急求助？系统将同步通知社区网格员和紧急联系人。");
    if (!confirmed) return;
    try {
      await createTask({
        title: "应急求助",
        category: "其他",
        priority: "urgent",
        detail: "居民在客户端发起应急一键通请求"
      });
      showToast("应急请求已发送，任务已创建");
      await loadTasks();
      switchTab("services");
    } catch (error) {
      showToast("应急发送失败：" + error.message);
    }
  }

  async function onTaskFormSubmit(event) {
    event.preventDefault();
    var payload = {
      title: taskTitle.value.trim(),
      category: taskCategory.value.trim(),
      priority: taskPriority.value.trim(),
      detail: taskDetail.value.trim()
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
        await loadTasks();
      } catch (error) {
        showToast("删除失败：" + error.message);
      }
    }
  }

  async function applyAuthPayload(payload) {
    state.authToken = String(payload.token || "");
    state.currentUser = normalizeUser(payload.user || {});
    persistAuth();
    updateUserInfo();
    showAppView();
    switchTab("home");
    await loadTasks();
  }

  async function onLoginSubmit(event) {
    event.preventDefault();
    var formData = new FormData(loginForm);
    var phone = String(formData.get("phone") || "").trim();
    var password = String(formData.get("password") || "");
    if (!/^1\d{10}$/.test(phone)) {
      showToast("请输入正确手机号");
      return;
    }
    if (password.length < 6) {
      showToast("密码至少 6 位");
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
      showToast("登录成功");
      loginForm.reset();
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
      showToast("请输入正确手机号");
      return;
    }
    if (!community) {
      showToast("请输入社区名称");
      return;
    }
    if (password.length < 6) {
      showToast("密码至少 6 位");
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
      showToast("注册成功，已自动登录");
      registerForm.reset();
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
      // logout is best effort
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
    authTabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setAuthTab(btn.dataset.authTab || "login");
      });
    });

    loginForm.addEventListener("submit", onLoginSubmit);
    registerForm.addEventListener("submit", onRegisterSubmit);

    toggleLargeFont.addEventListener("click", function () {
      var enabled = appShell.classList.toggle("large-font");
      toggleLargeFont.textContent = "大字模式：" + (enabled ? "开" : "关");
      showToast(enabled ? "已开启大字模式" : "已关闭大字模式");
    });

    toggleContrast.addEventListener("click", function () {
      var enabled = appShell.classList.toggle("high-contrast");
      toggleContrast.textContent = "高对比：" + (enabled ? "开" : "关");
      showToast(enabled ? "已开启高对比" : "已关闭高对比");
    });

    voiceRead.addEventListener("click", readNews);

    navButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.dataset.tab);
      });
    });

    actionButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        openActionDialog(btn.dataset.action);
      });
    });

    taskForm.addEventListener("submit", onTaskFormSubmit);
    taskList.addEventListener("click", onTaskListClick);
    statusFilter.addEventListener("change", loadTasks);
    logoutBtn.addEventListener("click", function () {
      doLogout(true);
    });
  }

  async function bootstrap() {
    setToday();
    bindEvents();
    renderTaskList();
    renderStats();
    setAuthTab("login");

    var restored = await tryRestoreSession();
    if (!restored) {
      showAuthView();
      updateUserInfo();
    }
  }

  bootstrap();
})();
