(function () {
  var config = window.APP_CONFIG || {};
  var apiBase = String(config.API_BASE || "");
  var endpoints = config.ENDPOINTS || {};
  var currentUser = config.CURRENT_USER || { id: "resident-1001", name: "王阿姨" };

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

  var state = {
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
      content: "已开启周边市场运力协同，常规时段90分钟内送达。"
    },
    request: {
      title: "我的任务",
      content: "客户端仅支持新增和删除任务，任务状态由后台管理员处理。"
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

  async function requestApi(path, options) {
    var response = await fetch(apiUrl(path), options || {});
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
    var query = ["userId=" + encodeURIComponent(currentUser.id)];
    if (statusFilter.value) {
      query.push("status=" + encodeURIComponent(statusFilter.value));
    }

    try {
      taskEmpty.style.display = "block";
      taskEmpty.textContent = "正在加载任务...";
      var data = await requestApi(endpoints.tasks + "?" + query.join("&"), { method: "GET" });
      state.tasks = Array.isArray(data.items) ? data.items : [];
      renderTaskList();
      renderStats();
      taskEmpty.textContent = "暂无任务，先提交一条试试。";
    } catch (error) {
      state.tasks = [];
      renderTaskList();
      renderStats();
      taskEmpty.style.display = "block";
      taskEmpty.textContent = "任务加载失败，请先启动后端服务。";
      showToast("任务加载失败：" + error.message);
    }
  }

  async function createTask(payload) {
    return requestApi(endpoints.tasks, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  async function deleteTask(taskId) {
    return requestApi(endpoints.taskById(taskId), { method: "DELETE" });
  }

  async function handleEmergency() {
    var confirmed = window.confirm("是否发起应急求助？系统将同步通知社区网格员和紧急联系人。");
    if (!confirmed) return;
    try {
      await createTask({
        userId: currentUser.id,
        title: "应急求助",
        category: "其他",
        priority: "urgent",
        detail: "居民在客户端发起应急一键通请求",
        status: "pending"
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
      userId: currentUser.id,
      title: taskTitle.value.trim(),
      category: taskCategory.value.trim(),
      priority: taskPriority.value.trim(),
      detail: taskDetail.value.trim(),
      status: "pending"
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

  function bindEvents() {
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
  }

  function bootstrap() {
    if (currentUserIdEl) {
      currentUserIdEl.textContent = currentUser.id;
    }
    setToday();
    bindEvents();
    loadTasks();
  }

  bootstrap();
})();
