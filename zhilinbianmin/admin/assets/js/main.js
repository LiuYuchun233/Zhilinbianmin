(function () {
  var ENDPOINTS = {
    users: "/api/users",
    tasks: "/api/tasks",
    taskById: function (id) {
      return "/api/tasks/" + encodeURIComponent(id);
    },
    taskStatus: function (id) {
      return "/api/tasks/" + encodeURIComponent(id) + "/status";
    }
  };

  var state = {
    users: [],
    tasks: [],
    selectedUserId: ""
  };

  var adminNow = document.getElementById("adminNow");
  var userList = document.getElementById("userList");
  var selectedUserTitle = document.getElementById("selectedUserTitle");
  var selectedUserMeta = document.getElementById("selectedUserMeta");
  var statusFilter = document.getElementById("statusFilter");
  var keywordInput = document.getElementById("keywordInput");
  var queryBtn = document.getElementById("queryBtn");
  var resetBtn = document.getElementById("resetBtn");
  var taskTableBody = document.getElementById("taskTableBody");
  var emptyText = document.getElementById("emptyText");
  var statTotal = document.getElementById("statTotal");
  var statPending = document.getElementById("statPending");
  var statProgress = document.getElementById("statProgress");
  var statDone = document.getElementById("statDone");
  var createTaskForm = document.getElementById("createTaskForm");
  var createTaskBtn = document.getElementById("createTaskBtn");
  var taskTitle = document.getElementById("taskTitle");
  var taskCategory = document.getElementById("taskCategory");
  var taskPriority = document.getElementById("taskPriority");
  var taskStatus = document.getElementById("taskStatus");
  var taskDetail = document.getElementById("taskDetail");
  var editDialog = document.getElementById("editDialog");
  var editForm = document.getElementById("editForm");
  var editTaskId = document.getElementById("editTaskId");
  var editTitle = document.getElementById("editTitle");
  var editDetail = document.getElementById("editDetail");
  var cancelEditBtn = document.getElementById("cancelEditBtn");
  var toast = document.getElementById("toast");

  var statusTextMap = {
    pending: "待受理",
    in_progress: "处理中",
    completed: "已办结"
  };

  var priorityTextMap = {
    low: "低",
    normal: "普通",
    high: "高",
    urgent: "紧急"
  };

  function nowText() {
    var now = new Date();
    return (
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0") +
      " " +
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0")
    );
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  async function requestApi(path, options) {
    var response = await fetch(path, options || {});
    var payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    if (!response.ok) {
      throw new Error((payload && payload.message) || "请求失败");
    }
    return payload;
  }

  function selectedUser() {
    return state.users.find(function (item) {
      return item.id === state.selectedUserId;
    }) || null;
  }

  function renderUsers() {
    userList.innerHTML = "";
    state.users.forEach(function (user) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "user-btn" + (user.id === state.selectedUserId ? " is-active" : "");
      btn.dataset.userId = user.id;
      btn.innerHTML =
        '<p class="name">' + escapeHtml(user.name) + "</p>" +
        '<p class="meta">ID: ' + escapeHtml(user.id) + "</p>" +
        '<p class="meta">' + escapeHtml(user.community || "-") + " | " + escapeHtml(user.phone || "-") + "</p>";
      userList.appendChild(btn);
    });
  }

  function renderHeader() {
    var user = selectedUser();
    if (!user) {
      selectedUserTitle.textContent = "请选择居民用户";
      selectedUserMeta.textContent = "任务将按居民 userId 进行筛选与管理";
      return;
    }
    selectedUserTitle.textContent = user.name + "（" + user.id + "）";
    selectedUserMeta.textContent = "社区：" + (user.community || "-") + "，联系方式：" + (user.phone || "-");
  }

  function formatTime(iso) {
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("zh-CN", { hour12: false });
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderStats() {
    var total = state.tasks.length;
    var pending = state.tasks.filter(function (task) {
      return task.status === "pending";
    }).length;
    var progress = state.tasks.filter(function (task) {
      return task.status === "in_progress";
    }).length;
    var done = state.tasks.filter(function (task) {
      return task.status === "completed";
    }).length;

    statTotal.textContent = String(total);
    statPending.textContent = String(pending);
    statProgress.textContent = String(progress);
    statDone.textContent = String(done);
  }

  function renderTasks() {
    taskTableBody.innerHTML = "";
    if (!state.tasks.length) {
      emptyText.style.display = "block";
      return;
    }
    emptyText.style.display = "none";

    state.tasks.forEach(function (task) {
      var tr = document.createElement("tr");
      tr.dataset.taskId = task.id;
      tr.innerHTML =
        "<td>" + escapeHtml(task.id) + "</td>" +
        "<td>" + escapeHtml(task.userName || "-") + "<br><span class='meta-chip'>" + escapeHtml(task.userId || "-") + "</span></td>" +
        "<td><p class='row-title'>" + escapeHtml(task.title) + "</p><p class='row-detail'>" + escapeHtml(task.detail || "-") + "</p></td>" +
        "<td><span class='chip'>" + escapeHtml(task.category || "其他") + "</span><span class='chip'>优先级：" + escapeHtml(priorityTextMap[task.priority] || "普通") + "</span></td>" +
        "<td><span class='status " + escapeHtml(task.status) + "'>" + escapeHtml(statusTextMap[task.status] || "待受理") + "</span></td>" +
        "<td>" + escapeHtml(formatTime(task.updatedAt)) + "</td>" +
        "<td><div class='row-actions'>" +
        "<button type='button' class='mini-btn' data-op='status'>状态流转</button>" +
        "<button type='button' class='mini-btn' data-op='edit'>编辑任务</button>" +
        "<button type='button' class='mini-btn danger' data-op='delete'>删除任务</button>" +
        "</div></td>";
      taskTableBody.appendChild(tr);
    });
  }

  function nextStatus(current) {
    if (current === "pending") return "in_progress";
    if (current === "in_progress") return "completed";
    return "pending";
  }

  function findTask(taskId) {
    return state.tasks.find(function (item) {
      return item.id === taskId;
    }) || null;
  }

  async function loadUsers() {
    var data = await requestApi(ENDPOINTS.users, { method: "GET" });
    state.users = Array.isArray(data.items) ? data.items : [];
    if (!state.selectedUserId && state.users.length) {
      state.selectedUserId = state.users[0].id;
    }
    renderUsers();
    renderHeader();
  }

  async function loadTasks() {
    if (!state.selectedUserId) {
      state.tasks = [];
      renderTasks();
      renderStats();
      return;
    }

    var query = ["userId=" + encodeURIComponent(state.selectedUserId)];
    if (statusFilter.value) {
      query.push("status=" + encodeURIComponent(statusFilter.value));
    }
    if (keywordInput.value.trim()) {
      query.push("keyword=" + encodeURIComponent(keywordInput.value.trim()));
    }

    var data = await requestApi(ENDPOINTS.tasks + "?" + query.join("&"), { method: "GET" });
    state.tasks = Array.isArray(data.items) ? data.items : [];
    renderTasks();
    renderStats();
  }

  async function onCreateTask(event) {
    event.preventDefault();
    if (!state.selectedUserId) {
      showToast("请先选择居民用户");
      return;
    }

    var payload = {
      userId: state.selectedUserId,
      title: taskTitle.value.trim(),
      category: taskCategory.value.trim(),
      priority: taskPriority.value.trim(),
      status: taskStatus.value.trim(),
      detail: taskDetail.value.trim()
    };

    if (!payload.title || !payload.category || !payload.detail) {
      showToast("请填写完整任务信息");
      return;
    }

    createTaskBtn.disabled = true;
    createTaskBtn.textContent = "创建中...";
    try {
      await requestApi(ENDPOINTS.tasks, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      createTaskForm.reset();
      taskPriority.value = "normal";
      taskStatus.value = "pending";
      showToast("任务创建成功");
      await loadTasks();
    } catch (error) {
      showToast("创建失败：" + error.message);
    } finally {
      createTaskBtn.disabled = false;
      createTaskBtn.textContent = "创建任务";
    }
  }

  function openEdit(task) {
    editTaskId.value = task.id;
    editTitle.value = task.title;
    editDetail.value = task.detail;
    if (typeof editDialog.showModal === "function") {
      editDialog.showModal();
    } else {
      showToast("当前浏览器不支持弹窗编辑，请使用最新版浏览器");
    }
  }

  async function onEditSubmit(event) {
    event.preventDefault();
    var taskId = editTaskId.value;
    var task = findTask(taskId);
    if (!task) {
      showToast("任务不存在");
      return;
    }

    var payload = {
      userId: task.userId,
      title: editTitle.value.trim(),
      detail: editDetail.value.trim(),
      category: task.category,
      priority: task.priority,
      status: task.status
    };

    if (!payload.title || !payload.detail) {
      showToast("标题和描述不能为空");
      return;
    }

    try {
      await requestApi(ENDPOINTS.taskById(taskId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (typeof editDialog.close === "function") {
        editDialog.close();
      }
      showToast("任务已更新");
      await loadTasks();
    } catch (error) {
      showToast("编辑失败：" + error.message);
    }
  }

  async function onTableClick(event) {
    var btn = event.target.closest("button[data-op]");
    if (!btn) return;
    var row = btn.closest("tr[data-task-id]");
    if (!row) return;
    var taskId = row.dataset.taskId;
    var task = findTask(taskId);
    if (!task) return;

    if (btn.dataset.op === "status") {
      try {
        await requestApi(ENDPOINTS.taskStatus(taskId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus(task.status) })
        });
        showToast("任务状态已更新");
        await loadTasks();
      } catch (error) {
        showToast("状态更新失败：" + error.message);
      }
      return;
    }

    if (btn.dataset.op === "edit") {
      openEdit(task);
      return;
    }

    if (btn.dataset.op === "delete") {
      var confirmed = window.confirm("确认删除该任务？删除后不可恢复。");
      if (!confirmed) return;
      try {
        await requestApi(ENDPOINTS.taskById(taskId), { method: "DELETE" });
        showToast("任务已删除");
        await loadTasks();
      } catch (error) {
        showToast("删除失败：" + error.message);
      }
    }
  }

  function bindEvents() {
    userList.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-user-id]");
      if (!btn) return;
      state.selectedUserId = btn.dataset.userId;
      renderUsers();
      renderHeader();
      loadTasks().catch(function (error) {
        showToast("任务加载失败：" + error.message);
      });
    });

    queryBtn.addEventListener("click", function () {
      loadTasks().catch(function (error) {
        showToast("任务查询失败：" + error.message);
      });
    });

    resetBtn.addEventListener("click", function () {
      statusFilter.value = "";
      keywordInput.value = "";
      loadTasks().catch(function (error) {
        showToast("任务加载失败：" + error.message);
      });
    });

    createTaskForm.addEventListener("submit", onCreateTask);
    taskTableBody.addEventListener("click", onTableClick);
    editForm.addEventListener("submit", onEditSubmit);
    cancelEditBtn.addEventListener("click", function () {
      if (typeof editDialog.close === "function") {
        editDialog.close();
      }
    });
  }

  async function bootstrap() {
    adminNow.textContent = nowText();
    window.setInterval(function () {
      adminNow.textContent = nowText();
    }, 30 * 1000);

    bindEvents();
    await loadUsers();
    await loadTasks();
  }

  bootstrap().catch(function (error) {
    showToast("初始化失败：" + error.message);
  });
})();
