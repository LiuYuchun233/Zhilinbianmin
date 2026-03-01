(function () {
  var config = window.APP_CONFIG || {};
  var apiBase = String(config.API_BASE || "");
  var endpoints = config.ENDPOINTS || {};
  var storageKeys = config.STORAGE_KEYS || {};

  var CHAT_HISTORY_KEY = "zlbm_ai_chat_history_v1";
  var MAX_PERSISTED_MESSAGES = 40;
  var MAX_CONTEXT_MESSAGES = 12;

  var chatLog = document.getElementById("chatLog");
  var chatForm = document.getElementById("chatForm");
  var chatInput = document.getElementById("chatInput");
  var sendBtn = document.getElementById("sendBtn");
  var clearBtn = document.getElementById("clearBtn");
  var promptStrip = document.getElementById("promptStrip");
  var chatStatus = document.getElementById("chatStatus");

  var roleLabelMap = {
    user: "你",
    assistant: "助手",
    system: "系统"
  };

  if (window.marked && typeof window.marked.setOptions === "function") {
    window.marked.setOptions({
      gfm: true,
      breaks: true
    });
  }

  var state = {
    authToken: readLocal(storageKeys.authToken),
    history: normalizeHistory(readLocalJson(CHAT_HISTORY_KEY)),
    sending: false
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

  function writeLocalJson(key, value) {
    try {
      if (!key) return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
      // ignore write failures
    }
  }

  function normalizeHistory(input) {
    if (!Array.isArray(input)) return [];
    return input
      .map(function (item) {
        if (!item || typeof item !== "object") return null;
        var role = String(item.role || "").trim();
        var content = String(item.content || "").trim();
        var time = String(item.time || "");
        if (!roleLabelMap[role] || !content) return null;
        return {
          role: role,
          content: content.slice(0, 5000),
          time: time || new Date().toISOString()
        };
      })
      .filter(Boolean)
      .slice(-MAX_PERSISTED_MESSAGES);
  }

  function persistHistory() {
    writeLocalJson(CHAT_HISTORY_KEY, state.history);
  }

  function pushHistory(role, content) {
    state.history.push({
      role: role,
      content: String(content || ""),
      time: new Date().toISOString()
    });
    state.history = state.history.slice(-MAX_PERSISTED_MESSAGES);
    persistHistory();
  }

  function formatTime(timeString) {
    var date = new Date(timeString);
    if (Number.isNaN(date.getTime())) {
      return "--:--";
    }
    return (
      String(date.getHours()).padStart(2, "0") +
      ":" +
      String(date.getMinutes()).padStart(2, "0")
    );
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderMarkdown(text) {
    var source = String(text || "");

    if (
      window.marked &&
      typeof window.marked.parse === "function" &&
      window.DOMPurify &&
      typeof window.DOMPurify.sanitize === "function"
    ) {
      try {
        var html = window.marked.parse(source);
        return window.DOMPurify.sanitize(html, {
          USE_PROFILES: { html: true }
        });
      } catch (_error) {
        // fall through to plain mode
      }
    }

    return "<p>" + escapeHtml(source).replace(/\n/g, "<br>") + "</p>";
  }

  function shouldRenderMarkdown(role, className) {
    if (role !== "assistant") return false;
    if (String(className || "").indexOf("is-thinking") >= 0) return false;
    if (String(className || "").indexOf("is-error") >= 0) return false;
    return true;
  }

  async function copyText(text) {
    var value = String(text || "");
    if (!value) return false;

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    var textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    var success = false;
    try {
      success = document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }

    if (!success) {
      throw new Error("copy_failed");
    }
    return true;
  }

  function createCopyButton(rawText) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "msg-copy-btn";
    button.textContent = "复制";

    button.addEventListener("click", function () {
      if (button.disabled) return;
      button.disabled = true;
      copyText(rawText)
        .then(function () {
          button.textContent = "已复制";
        })
        .catch(function () {
          button.textContent = "复制失败";
        })
        .finally(function () {
          window.setTimeout(function () {
            button.disabled = false;
            button.textContent = "复制";
          }, 1200);
        });
    });

    return button;
  }

  function setBubbleContent(item, bubble, content) {
    var role = String(item.dataset.role || "system");
    var text = String(content || "");
    var className = item.className;

    var oldBtn = item.querySelector(".msg-copy-btn");
    if (oldBtn) {
      oldBtn.remove();
    }

    if (shouldRenderMarkdown(role, className)) {
      bubble.classList.add("md-content");
      bubble.innerHTML = renderMarkdown(text);
      var copyButton = createCopyButton(text);
      var meta = item.querySelector(".msg-meta");
      if (meta) {
        item.insertBefore(copyButton, meta);
      } else {
        item.appendChild(copyButton);
      }
      return;
    }

    bubble.classList.remove("md-content");
    bubble.textContent = text;
  }

  function createMessageNode(role, content, time, extraClass) {
    var item = document.createElement("article");
    item.className = "msg msg-" + role + (extraClass ? " " + extraClass : "");
    item.dataset.role = role;

    var bubble = document.createElement("div");
    bubble.className = "msg-bubble";

    var meta = document.createElement("p");
    meta.className = "msg-meta";
    meta.textContent = (roleLabelMap[role] || "消息") + " | " + formatTime(time);

    item.appendChild(bubble);
    item.appendChild(meta);
    setBubbleContent(item, bubble, content);
    return item;
  }

  function scrollToBottom() {
    if (!chatLog) return;
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function renderHistory() {
    if (!chatLog) return;
    chatLog.innerHTML = "";

    state.history.forEach(function (item) {
      chatLog.appendChild(createMessageNode(item.role, item.content, item.time));
    });
    scrollToBottom();
  }

  function setStatus(text, isError) {
    if (!chatStatus) return;
    chatStatus.textContent = String(text || "");
    chatStatus.classList.toggle("error", Boolean(isError));
  }

  function setSending(next) {
    state.sending = Boolean(next);
    if (sendBtn) {
      sendBtn.disabled = state.sending;
      sendBtn.textContent = state.sending ? "发送中..." : "发送";
    }
  }

  function buildChatUrl() {
    return apiBase + String(endpoints.aiChat || "/api/ai/chat");
  }

  function buildRequestHeaders() {
    var headers = {
      "Content-Type": "application/json"
    };
    if (state.authToken) {
      headers.Authorization = "Bearer " + state.authToken;
    }
    return headers;
  }

  function buildContextHistory() {
    return state.history
      .filter(function (item) {
        return item.role === "user" || item.role === "assistant";
      })
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(function (item) {
        return {
          role: item.role,
          content: item.content
        };
      });
  }

  async function requestAssistant(message) {
    var response = await fetch(buildChatUrl(), {
      method: "POST",
      headers: buildRequestHeaders(),
      body: JSON.stringify({
        message: String(message || ""),
        history: buildContextHistory()
      })
    });

    var payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      var messageText = payload && payload.message ? payload.message : "请求失败";
      throw new Error(messageText);
    }

    var content = payload && typeof payload.content === "string" ? payload.content.trim() : "";
    if (!content) {
      throw new Error("AI 未返回有效内容");
    }
    return content;
  }

  function createThinkingMessage() {
    var node = createMessageNode("assistant", "正在思考...", new Date().toISOString(), "is-thinking");
    if (chatLog) chatLog.appendChild(node);
    scrollToBottom();
    return node;
  }

  function updateThinkingMessage(node, text, isError) {
    if (!node) return;
    node.classList.remove("is-thinking");
    if (isError) {
      node.classList.add("is-error");
    }
    var bubble = node.querySelector(".msg-bubble");
    var meta = node.querySelector(".msg-meta");
    if (bubble) setBubbleContent(node, bubble, text);
    if (meta) meta.textContent = "助手 | " + formatTime(new Date().toISOString());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (state.sending) return;

    var message = String((chatInput && chatInput.value) || "").trim();
    if (!message) {
      setStatus("请输入问题后再发送。", true);
      return;
    }

    if (!state.authToken) {
      setStatus("当前未登录，请先返回首页登录后再使用 AI 助手。", true);
      return;
    }

    if (chatInput) chatInput.value = "";
    if (chatLog) chatLog.appendChild(createMessageNode("user", message, new Date().toISOString()));
    pushHistory("user", message);
    scrollToBottom();

    var thinkingNode = createThinkingMessage();
    setSending(true);
    setStatus("请求已发出，等待 AI 返回结果...", false);

    try {
      var reply = await requestAssistant(message);
      updateThinkingMessage(thinkingNode, reply, false);
      pushHistory("assistant", reply);
      setStatus("已收到 AI 回复。", false);
    } catch (error) {
      var text = "请求失败：" + (error && error.message ? error.message : "未知错误");
      updateThinkingMessage(thinkingNode, text, true);
      setStatus(text, true);
    } finally {
      setSending(false);
      if (chatInput) chatInput.focus();
      scrollToBottom();
    }
  }

  function clearConversation() {
    if (!window.confirm("确认清空当前会话记录？")) return;
    state.history = [];
    persistHistory();
    renderHistory();
    setStatus("会话记录已清空。", false);
  }

  function onPromptClick(event) {
    var button = event.target.closest("button[data-prompt]");
    if (!button || !chatInput) return;
    chatInput.value = String(button.dataset.prompt || "");
    chatInput.focus();
  }

  function onInputKeydown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (chatForm && typeof chatForm.requestSubmit === "function") {
        chatForm.requestSubmit();
      } else if (chatForm) {
        chatForm.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    }
  }

  function bindEvents() {
    if (chatForm) chatForm.addEventListener("submit", handleSubmit);
    if (clearBtn) clearBtn.addEventListener("click", clearConversation);
    if (promptStrip) promptStrip.addEventListener("click", onPromptClick);
    if (chatInput) chatInput.addEventListener("keydown", onInputKeydown);
  }

  function bootstrap() {
    renderHistory();
    bindEvents();

    if (state.authToken) {
      setStatus("已连接到 AI 接口，可以开始提问。", false);
    } else {
      setStatus("未检测到登录状态，请先返回首页登录。", true);
    }

    if (chatInput) chatInput.focus();
  }

  bootstrap();
})();
