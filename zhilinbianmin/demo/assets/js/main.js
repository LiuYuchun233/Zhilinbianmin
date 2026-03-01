(function () {
  var revealElements = document.querySelectorAll(".reveal");
  var counterElements = document.querySelectorAll(".count-number");
  var eventItems = document.querySelectorAll(".event-list li");
  var tabButtons = document.querySelectorAll(".tab-btn");
  var tabPanels = document.querySelectorAll(".module-panel");

  function animateCounter(el) {
    if (!el || el.dataset.animated === "true") return;

    var target = Number(el.dataset.target || 0);
    var hasDecimal = String(target).indexOf(".") >= 0;
    var duration = 1300;
    var startAt = performance.now();

    function update(now) {
      var progress = Math.min((now - startAt) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = target * eased;
      el.textContent = hasDecimal ? value.toFixed(1) : Math.floor(value).toString();

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = hasDecimal ? target.toFixed(1) : Math.floor(target).toString();
        el.dataset.animated = "true";
      }
    }

    requestAnimationFrame(update);
  }

  function initRevealObserver() {
    if (!("IntersectionObserver" in window)) {
      revealElements.forEach(function (el) {
        el.classList.add("is-visible");
      });
      counterElements.forEach(animateCounter);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          entry.target.querySelectorAll(".count-number").forEach(animateCounter);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18 }
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

  function initEventTicker() {
    if (!eventItems.length) return;

    var index = 1;
    eventItems[0].classList.add("is-active");

    window.setInterval(function () {
      eventItems.forEach(function (item) {
        item.classList.remove("is-active");
      });

      eventItems[index].classList.add("is-active");
      index = (index + 1) % eventItems.length;
    }, 2600);
  }

  function initCharts() {
    if (!window.echarts) return;

    var trendEl = document.getElementById("trendChart");
    var serviceEl = document.getElementById("serviceChart");
    if (!trendEl || !serviceEl) return;

    var trendChart = window.echarts.init(trendEl);
    var serviceChart = window.echarts.init(serviceEl);

    trendChart.setOption({
      color: ["#0f5ba6", "#cc2f2f"],
      tooltip: { trigger: "axis" },
      legend: {
        data: ["诉求办结率", "平均响应时长(ms)"],
        top: 4,
        textStyle: { color: "#304f70", fontSize: 12 }
      },
      grid: { left: 34, right: 20, top: 38, bottom: 26 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: ["一月", "二月", "三月", "四月", "五月", "六月"],
        axisLine: { lineStyle: { color: "#b8c9dc" } },
        axisLabel: { color: "#456482" }
      },
      yAxis: [
        {
          type: "value",
          min: 92,
          max: 100,
          axisLabel: { formatter: "{value}%", color: "#456482" },
          splitLine: { lineStyle: { color: "#e5eef8" } }
        },
        {
          type: "value",
          min: 140,
          max: 260,
          axisLabel: { color: "#456482" },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: "诉求办结率",
          type: "line",
          smooth: true,
          yAxisIndex: 0,
          data: [95, 95.8, 96.4, 97.1, 97.6, 98.1],
          areaStyle: { opacity: 0.12 }
        },
        {
          name: "平均响应时长(ms)",
          type: "line",
          smooth: true,
          yAxisIndex: 1,
          data: [245, 228, 213, 205, 199, 188]
        }
      ]
    });

    serviceChart.setOption({
      color: ["#0f5ba6", "#2f7ec6", "#72a8dd", "#cc2f2f"],
      tooltip: { trigger: "item" },
      title: {
        text: "场景覆盖结构",
        left: "center",
        top: 6,
        textStyle: {
          color: "#304f70",
          fontSize: 13,
          fontWeight: 600
        }
      },
      series: [
        {
          type: "pie",
          radius: ["44%", "70%"],
          center: ["50%", "56%"],
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
          label: { color: "#456482", fontSize: 12 },
          data: [
            { value: 34, name: "便民办事" },
            { value: 26, name: "生活服务" },
            { value: 22, name: "城市治理" },
            { value: 18, name: "应急联动" }
          ]
        }
      ]
    });

    window.addEventListener("resize", function () {
      trendChart.resize();
      serviceChart.resize();
    });
  }

  initRevealObserver();
  initModuleTabs();
  initEventTicker();
  initCharts();
})();
