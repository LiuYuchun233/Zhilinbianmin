(function () {
  var revealElements = document.querySelectorAll(".reveal");
  var tabButtons = document.querySelectorAll(".tab-btn");
  var tabPanels = document.querySelectorAll(".module-panel");
  var zoneNodes = document.querySelectorAll(".board-map .node");

  var charts = {
    trend: null,
    service: null,
    category: null
  };

  var scenarioData = {
    normal: {
      label: "常态运营",
      stats: { intent: 92, close: 98, availability: 99.9, pending: 26, dispatchHit: 96, response: 198 },
      zoneDelta: { open: 0, done: 0, sla: 0 },
      trend: {
        "7d": {
          labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
          closeRate: [96.6, 96.8, 97.0, 97.4, 97.6, 97.8, 98.0],
          responseMs: [214, 209, 205, 201, 198, 194, 191]
        },
        "30d": {
          labels: ["第1周", "第2周", "第3周", "第4周"],
          closeRate: [96.8, 97.3, 97.7, 98.0],
          responseMs: [216, 205, 198, 192]
        }
      },
      service: [
        { name: "便民办事", value: 33 },
        { name: "生活服务", value: 27 },
        { name: "城市治理", value: 24 },
        { name: "应急联动", value: 16 }
      ],
      categoryBase: {
        "养老关怀": 17,
        "市政设施": 24,
        "环境卫生": 19,
        "邻里纠纷": 12,
        "政务咨询": 18
      }
    },
    peak: {
      label: "业务高峰",
      stats: { intent: 90.7, close: 95.9, availability: 99.5, pending: 39, dispatchHit: 93.5, response: 236 },
      zoneDelta: { open: 8, done: -1.8, sla: 8 },
      trend: {
        "7d": {
          labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
          closeRate: [95.2, 95.6, 95.7, 95.9, 96.0, 96.1, 95.9],
          responseMs: [246, 241, 238, 236, 231, 229, 235]
        },
        "30d": {
          labels: ["第1周", "第2周", "第3周", "第4周"],
          closeRate: [95.0, 95.5, 95.8, 95.9],
          responseMs: [252, 246, 239, 236]
        }
      },
      service: [
        { name: "便民办事", value: 29 },
        { name: "生活服务", value: 31 },
        { name: "城市治理", value: 25 },
        { name: "应急联动", value: 15 }
      ],
      categoryBase: {
        "养老关怀": 15,
        "市政设施": 27,
        "环境卫生": 22,
        "邻里纠纷": 14,
        "政务咨询": 22
      }
    },
    emergency: {
      label: "应急联动",
      stats: { intent: 89.8, close: 93.4, availability: 99.1, pending: 52, dispatchHit: 91.8, response: 284 },
      zoneDelta: { open: 15, done: -3.4, sla: 16 },
      trend: {
        "7d": {
          labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
          closeRate: [93.8, 93.6, 93.4, 93.5, 93.2, 93.1, 93.4],
          responseMs: [296, 292, 288, 284, 279, 276, 281]
        },
        "30d": {
          labels: ["第1周", "第2周", "第3周", "第4周"],
          closeRate: [94.6, 94.1, 93.8, 93.4],
          responseMs: [306, 298, 290, 284]
        }
      },
      service: [
        { name: "便民办事", value: 24 },
        { name: "生活服务", value: 24 },
        { name: "城市治理", value: 28 },
        { name: "应急联动", value: 24 }
      ],
      categoryBase: {
        "养老关怀": 21,
        "市政设施": 20,
        "环境卫生": 18,
        "邻里纠纷": 10,
        "政务咨询": 12
      }
    }
  };

  var zoneBaseData = {
    "A区": { open: 7, doneRate: 97.8, sla: 17 },
    "B区": { open: 5, doneRate: 98.3, sla: 14 },
    "C区": { open: 8, doneRate: 96.9, sla: 19 },
    "D区": { open: 6, doneRate: 97.2, sla: 16 }
  };

  var levelMeta = {
    high: { short: "高", text: "高风险", className: "high" },
    medium: { short: "中", text: "中风险", className: "medium" },
    low: { short: "低", text: "低风险", className: "low" }
  };

  var state = {
    scenario: "normal",
    range: "7d",
    selectedZone: "A区",
    search: "",
    level: "all",
    tickerIndex: 0,
    tickerTimer: null,
    events: [
      { id: "E-20260301-01", time: "09:12", level: "high", zone: "A区", category: "养老关怀", summary: "独居老人突发不适，已联动社区卫生站与网格员", status: "处理中", source: "热线" },
      { id: "E-20260301-02", time: "09:46", level: "medium", zone: "C区", category: "市政设施", summary: "井盖松动存在隐患，已派市政维修队前往", status: "待签收", source: "网格上报" },
      { id: "E-20260301-03", time: "10:05", level: "medium", zone: "B区", category: "环境卫生", summary: "垃圾清运高峰拥堵，调度备用车辆补位", status: "处理中", source: "APP" },
      { id: "E-20260301-04", time: "10:38", level: "low", zone: "D区", category: "政务咨询", summary: "居住证办理材料咨询，AI 助手已推送办理指引", status: "已办结", source: "APP" },
      { id: "E-20260301-05", time: "11:20", level: "medium", zone: "A区", category: "邻里纠纷", summary: "小区停车纠纷，街道调解员已介入协同处理", status: "处理中", source: "窗口" }
    ],
    tickets: []
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHTML(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function formatNowTime() {
    var now = new Date();
    return pad(now.getHours()) + ":" + pad(now.getMinutes());
  }

  function formatTimestampForId() {
    var now = new Date();
    return (
      now.getFullYear() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      "-" +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds())
    );
  }

  function renderNumber(value, digits) {
    if (digits > 0) return Number(value).toFixed(digits);
    return Math.round(Number(value)).toString();
  }

  function animateValue(el, target, digits) {
    if (!el) return;
    var current = Number(el.dataset.current || el.textContent || 0);
    var end = Number(target);
    var start = performance.now();
    var duration = 500;

    function tick(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = current + (end - current) * eased;
      el.textContent = renderNumber(value, digits);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = renderNumber(end, digits);
        el.dataset.current = String(end);
      }
    }

    requestAnimationFrame(tick);
  }

  function initRevealObserver() {
    if (!("IntersectionObserver" in window)) {
      revealElements.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach(function (el) {
      observer.observe(el);
    });
  }

  function initModuleTabs() {
    tabButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-target");
        tabButtons.forEach(function (item) {
          item.classList.remove("is-active");
          item.setAttribute("aria-selected", "false");
        });
        tabPanels.forEach(function (panel) {
          panel.classList.remove("is-active");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");
        var activePanel = document.getElementById(target);
        if (activePanel) activePanel.classList.add("is-active");
      });
    });
  }

  function getFilteredEvents() {
    var keyword = state.search.trim().toLowerCase();
    return state.events.filter(function (event) {
      var matchesLevel = state.level === "all" || event.level === state.level;
      var rawText = (event.summary + " " + event.zone + " " + event.category + " " + event.status).toLowerCase();
      var matchesKeyword = !keyword || rawText.indexOf(keyword) >= 0;
      return matchesLevel && matchesKeyword;
    });
  }

  function stopTicker() {
    if (!state.tickerTimer) return;
    window.clearInterval(state.tickerTimer);
    state.tickerTimer = null;
    state.tickerIndex = 0;
  }

  function startTicker() {
    stopTicker();
    var items = document.querySelectorAll("#eventList li[data-event-id]");
    if (items.length <= 1) return;

    items.forEach(function (item) {
      item.classList.remove("is-active");
    });
    items[0].classList.add("is-active");
    state.tickerIndex = 1;

    state.tickerTimer = window.setInterval(function () {
      var currentItems = document.querySelectorAll("#eventList li[data-event-id]");
      if (currentItems.length <= 1) return;
      currentItems.forEach(function (item) {
        item.classList.remove("is-active");
      });
      var nextIndex = state.tickerIndex % currentItems.length;
      currentItems[nextIndex].classList.add("is-active");
      state.tickerIndex = nextIndex + 1;
    }, 2800);
  }

  function renderEventList() {
    var eventList = document.getElementById("eventList");
    var eventMeta = document.getElementById("eventMeta");
    if (!eventList || !eventMeta) return;

    var filtered = getFilteredEvents();
    eventMeta.textContent = "共 " + filtered.length + " 条事件";

    if (!filtered.length) {
      stopTicker();
      eventList.innerHTML = '<li class="event-empty">未匹配到事件，请调整筛选条件。</li>';
      return;
    }

    eventList.innerHTML = filtered
      .map(function (event) {
        var level = levelMeta[event.level] || levelMeta.medium;
        return (
          '<li data-event-id="' +
          escapeHTML(event.id) +
          '">' +
          '<p class="event-main">' +
          '<span class="tag ' +
          level.className +
          '">' +
          level.short +
          "</span>" +
          "<strong>" +
          escapeHTML(event.time + " " + event.zone) +
          "</strong>" +
          " " +
          escapeHTML(event.summary) +
          "</p>" +
          '<p class="event-sub">[' +
          escapeHTML(level.text) +
          "] " +
          escapeHTML(event.category) +
          " · " +
          escapeHTML(event.status) +
          " · 来源：" +
          escapeHTML(event.source) +
          "</p>" +
          "</li>"
        );
      })
      .join("");

    startTicker();
  }

  function initEventFilters() {
    var searchInput = document.getElementById("eventSearch");
    var levelFilter = document.getElementById("eventLevelFilter");
    var resetButton = document.getElementById("eventFilterReset");

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.search = searchInput.value || "";
        renderEventList();
      });
    }

    if (levelFilter) {
      levelFilter.addEventListener("change", function () {
        state.level = levelFilter.value || "all";
        renderEventList();
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        state.search = "";
        state.level = "all";
        if (searchInput) searchInput.value = "";
        if (levelFilter) levelFilter.value = "all";
        renderEventList();
      });
    }
  }

  function countTicketsByZone(zone) {
    return state.tickets.filter(function (ticket) {
      return ticket.zone === zone;
    }).length;
  }

  function countTicketsByCategory() {
    var map = {
      "养老关怀": 0,
      "市政设施": 0,
      "环境卫生": 0,
      "邻里纠纷": 0,
      "政务咨询": 0
    };
    state.tickets.forEach(function (ticket) {
      map[ticket.category] = (map[ticket.category] || 0) + 1;
    });
    return map;
  }

  function getZoneSnapshot(zone) {
    var base = zoneBaseData[zone];
    var scenario = scenarioData[state.scenario];
    if (!base || !scenario) return { open: 0, doneRate: 0, sla: 0 };

    var newTickets = countTicketsByZone(zone);
    return {
      open: base.open + scenario.zoneDelta.open + newTickets,
      doneRate: clamp(base.doneRate + scenario.zoneDelta.done - newTickets * 0.35, 86, 99.9),
      sla: base.sla + scenario.zoneDelta.sla + newTickets * 2
    };
  }

  function updateZonePanel() {
    var title = document.getElementById("zoneTitle");
    var openCount = document.getElementById("zoneOpenCount");
    var doneRate = document.getElementById("zoneDoneRate");
    var sla = document.getElementById("zoneSla");

    var zone = state.selectedZone;
    var snapshot = getZoneSnapshot(zone);

    if (title) title.textContent = zone + " · 社区运行状态";
    if (openCount) openCount.textContent = String(snapshot.open);
    if (doneRate) doneRate.textContent = snapshot.doneRate.toFixed(1) + "%";
    if (sla) sla.textContent = Math.round(snapshot.sla) + " 分钟";
  }

  function initZoneNodes() {
    zoneNodes.forEach(function (node) {
      node.addEventListener("click", function () {
        var zone = node.getAttribute("data-zone");
        if (!zone) return;
        state.selectedZone = zone;
        zoneNodes.forEach(function (item) {
          item.classList.remove("is-selected");
        });
        node.classList.add("is-selected");
        updateZonePanel();
      });
    });
  }

  function updateScenarioButtons() {
    var scenarioLabel = document.getElementById("scenarioStatus");
    var scenario = scenarioData[state.scenario];
    if (scenarioLabel && scenario) {
      scenarioLabel.textContent = "当前场景：" + scenario.label;
    }

    document.querySelectorAll(".scenario-btn").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-scenario") === state.scenario);
    });
    document.querySelectorAll(".range-btn").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-range") === state.range);
    });
  }

  function getDashboardMetrics() {
    var base = scenarioData[state.scenario].stats;
    var newCount = state.tickets.length;
    return {
      intent: clamp(base.intent - newCount * 0.03, 86, 99.9),
      close: clamp(base.close - newCount * 0.08, 85, 99.9),
      availability: clamp(base.availability - newCount * 0.01, 98.2, 100),
      pending: base.pending + newCount,
      dispatchHit: clamp(base.dispatchHit - newCount * 0.2, 88, 99.9),
      response: base.response + newCount * 2,
      newTicket: newCount
    };
  }

  function updateMetrics() {
    var metrics = getDashboardMetrics();
    animateValue(document.getElementById("statIntent"), metrics.intent, 1);
    animateValue(document.getElementById("statClose"), metrics.close, 1);
    animateValue(document.getElementById("statAvailability"), metrics.availability, 1);
    animateValue(document.getElementById("pendingMetric"), metrics.pending, 0);
    animateValue(document.getElementById("dispatchHitMetric"), metrics.dispatchHit, 1);
    animateValue(document.getElementById("responseMetric"), metrics.response, 0);
    animateValue(document.getElementById("newTicketMetric"), metrics.newTicket, 0);
  }

  function initScenarioControls() {
    document.querySelectorAll(".scenario-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        var scenario = button.getAttribute("data-scenario");
        if (!scenario || scenario === state.scenario) return;
        state.scenario = scenario;
        updateScenarioButtons();
        updateMetrics();
        updateZonePanel();
        updateCharts();
      });
    });

    document.querySelectorAll(".range-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        var range = button.getAttribute("data-range");
        if (!range || range === state.range) return;
        state.range = range;
        updateScenarioButtons();
        updateCharts();
      });
    });
  }

  function buildTrendOption() {
    var scenario = scenarioData[state.scenario];
    var trendData = scenario.trend[state.range];
    return {
      color: ["#0f5ba6", "#cc2f2f"],
      tooltip: { trigger: "axis" },
      legend: {
        data: ["诉求办结率", "平均响应时长(ms)"],
        top: 6,
        textStyle: { color: "#355474", fontSize: 12 }
      },
      grid: { left: 40, right: 24, top: 40, bottom: 28 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: trendData.labels,
        axisLine: { lineStyle: { color: "#b8c9dc" } },
        axisLabel: { color: "#476686" }
      },
      yAxis: [
        {
          type: "value",
          min: 90,
          max: 100,
          axisLabel: { formatter: "{value}%", color: "#476686" },
          splitLine: { lineStyle: { color: "#e5eef8" } }
        },
        {
          type: "value",
          min: 150,
          max: 320,
          axisLabel: { color: "#476686" },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: "诉求办结率",
          type: "line",
          smooth: true,
          yAxisIndex: 0,
          areaStyle: { opacity: 0.12 },
          data: trendData.closeRate
        },
        {
          name: "平均响应时长(ms)",
          type: "line",
          smooth: true,
          yAxisIndex: 1,
          data: trendData.responseMs
        }
      ]
    };
  }

  function buildServiceOption() {
    var scenario = scenarioData[state.scenario];
    return {
      color: ["#0f5ba6", "#2f7ec6", "#72a8dd", "#cc2f2f"],
      tooltip: { trigger: "item" },
      title: {
        text: "场景覆盖结构",
        left: "center",
        top: 6,
        textStyle: { color: "#304f70", fontSize: 13, fontWeight: 600 }
      },
      series: [
        {
          type: "pie",
          radius: ["44%", "70%"],
          center: ["50%", "58%"],
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
          label: { color: "#466686", fontSize: 12 },
          data: scenario.service
        }
      ]
    };
  }

  function buildCategoryOption() {
    var scenario = scenarioData[state.scenario];
    var ticketMap = countTicketsByCategory();
    var categories = ["养老关怀", "市政设施", "环境卫生", "邻里纠纷", "政务咨询"];
    var values = categories.map(function (category) {
      return (scenario.categoryBase[category] || 0) + (ticketMap[category] || 0);
    });

    return {
      color: ["#0f5ba6"],
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 45, right: 18, top: 36, bottom: 20 },
      title: {
        text: "诉求类型分布（含新增工单）",
        left: "center",
        top: 6,
        textStyle: { color: "#304f70", fontSize: 13, fontWeight: 600 }
      },
      xAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#b8c9dc" } },
        splitLine: { lineStyle: { color: "#e5eef8" } },
        axisLabel: { color: "#466686" }
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: { color: "#466686" },
        axisLine: { lineStyle: { color: "#b8c9dc" } }
      },
      series: [
        {
          type: "bar",
          barWidth: 14,
          data: values,
          itemStyle: { borderRadius: [0, 6, 6, 0] },
          label: { show: true, position: "right", color: "#274a6e" }
        }
      ]
    };
  }

  function initCharts() {
    if (!window.echarts) return;
    var trendEl = document.getElementById("trendChart");
    var serviceEl = document.getElementById("serviceChart");
    var categoryEl = document.getElementById("categoryChart");
    if (!trendEl || !serviceEl || !categoryEl) return;

    charts.trend = window.echarts.init(trendEl);
    charts.service = window.echarts.init(serviceEl);
    charts.category = window.echarts.init(categoryEl);

    updateCharts();

    window.addEventListener("resize", function () {
      if (charts.trend) charts.trend.resize();
      if (charts.service) charts.service.resize();
      if (charts.category) charts.category.resize();
    });
  }

  function updateCharts() {
    if (charts.trend) charts.trend.setOption(buildTrendOption(), true);
    if (charts.service) charts.service.setOption(buildServiceOption(), true);
    if (charts.category) charts.category.setOption(buildCategoryOption(), true);
  }

  function getSlaByLevel(level) {
    if (level === "high") return 15;
    if (level === "medium") return 60;
    return 240;
  }

  function getDispatchPlan(category, level) {
    var categoryTeamMap = {
      "养老关怀": "社区卫生站 + 网格员",
      "市政设施": "市政维护队 + 巡检专员",
      "环境卫生": "环卫中心 + 保洁调度",
      "邻里纠纷": "街道调解员 + 社区民警",
      "政务咨询": "政务专员 + AI 助手回访"
    };

    var base = categoryTeamMap[category] || "综合服务中心";
    if (level === "high") return base + " + 街道应急值班";
    if (level === "medium") return base + " + 社区协同专员";
    return base + " + 线上远程处理";
  }

  function renderTicketResult(ticket) {
    var resultEl = document.getElementById("ticketResult");
    if (!resultEl) return;
    var level = levelMeta[ticket.level] || levelMeta.medium;
    resultEl.classList.remove("is-empty");
    resultEl.innerHTML =
      '<p><strong>工单号：</strong>' +
      escapeHTML(ticket.id) +
      "</p>" +
      '<p><strong>事件等级：</strong><span class="inline-tag ' +
      level.className +
      '">' +
      escapeHTML(level.text) +
      "</span></p>" +
      '<p><strong>派单建议：</strong>' +
      escapeHTML(ticket.dispatchPlan) +
      "</p>" +
      '<p><strong>预计 SLA：</strong>' +
      escapeHTML(String(ticket.sla)) +
      " 分钟</p>" +
      '<p><strong>受理摘要：</strong>' +
      escapeHTML(ticket.description) +
      "</p>";
  }

  function renderTicketList() {
    var listEl = document.getElementById("ticketList");
    if (!listEl) return;

    if (!state.tickets.length) {
      listEl.innerHTML = '<li class="ticket-empty">当前还没有工单记录。</li>';
      return;
    }

    listEl.innerHTML = state.tickets
      .slice(0, 6)
      .map(function (ticket) {
        var level = levelMeta[ticket.level] || levelMeta.medium;
        return (
          "<li>" +
          "<strong>" +
          escapeHTML(ticket.id) +
          "</strong>" +
          '<p><span class="inline-tag ' +
          level.className +
          '">' +
          escapeHTML(level.text) +
          "</span>" +
          escapeHTML(ticket.zone + " · " + ticket.category + " · " + ticket.time) +
          "</p>" +
          "</li>"
        );
      })
      .join("");
  }

  function syncZoneSelection(zone) {
    state.selectedZone = zone;
    zoneNodes.forEach(function (node) {
      node.classList.toggle("is-selected", node.getAttribute("data-zone") === zone);
    });
    updateZonePanel();
  }

  function initSimulator() {
    var form = document.getElementById("requestForm");
    if (!form) return;
    var isAutoResetting = false;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var formData = new FormData(form);

      var description = String(formData.get("description") || "").trim();
      if (description.length < 8) {
        return;
      }

      var level = String(formData.get("level") || "medium");
      var zone = String(formData.get("zone") || "A区");
      var category = String(formData.get("category") || "政务咨询");
      var time = formatNowTime();
      var ticket = {
        id: "BM-" + formatTimestampForId(),
        resident: String(formData.get("residentName") || "").trim(),
        contact: String(formData.get("contact") || "").trim(),
        zone: zone,
        category: category,
        channel: String(formData.get("channel") || "APP"),
        level: level,
        description: description,
        dispatchPlan: getDispatchPlan(category, level),
        sla: getSlaByLevel(level),
        time: time
      };

      state.tickets.unshift(ticket);
      if (state.tickets.length > 20) state.tickets.pop();

      state.events.unshift({
        id: "EV-" + formatTimestampForId(),
        time: time,
        level: level,
        zone: zone,
        category: category,
        summary: description,
        status: "已生成智能派单，等待签收",
        source: ticket.channel
      });
      if (state.events.length > 50) state.events.pop();

      renderTicketResult(ticket);
      renderTicketList();
      renderEventList();
      syncZoneSelection(zone);
      updateMetrics();
      updateCharts();
      isAutoResetting = true;
      form.reset();
      isAutoResetting = false;
    });

    form.addEventListener("reset", function () {
      if (isAutoResetting) return;
      var resultEl = document.getElementById("ticketResult");
      if (resultEl) {
        resultEl.classList.add("is-empty");
        resultEl.textContent = "已清空表单。填写后可再次生成派单结果。";
      }
    });
  }

  function initSnapshotExport() {
    var exportButton = document.getElementById("exportSnapshot");
    if (!exportButton) return;

    exportButton.addEventListener("click", function () {
      var metrics = getDashboardMetrics();
      var payload = {
        generatedAt: new Date().toISOString(),
        scenario: state.scenario,
        scenarioLabel: scenarioData[state.scenario].label,
        range: state.range,
        selectedZone: state.selectedZone,
        zoneSnapshot: getZoneSnapshot(state.selectedZone),
        metrics: metrics,
        filters: {
          keyword: state.search,
          level: state.level
        },
        visibleEvents: getFilteredEvents().slice(0, 20),
        recentTickets: state.tickets.slice(0, 20)
      };

      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "zhilinbianmin-snapshot-" + formatTimestampForId() + ".json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    });
  }

  initRevealObserver();
  initModuleTabs();
  initEventFilters();
  initZoneNodes();
  initScenarioControls();
  initSimulator();
  initSnapshotExport();
  initCharts();
  updateScenarioButtons();
  renderTicketList();
  renderEventList();
  updateZonePanel();
  updateMetrics();
})();
