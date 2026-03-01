(function () {
  var search = new URLSearchParams(window.location.search);
  var baseFromQuery = search.get("apiBase");

  window.APP_CONFIG = {
    API_BASE: baseFromQuery || "",
    CURRENT_USER: {
      id: "resident-1001",
      name: "王阿姨"
    },
    ENDPOINTS: {
      users: "/api/users",
      tasks: "/api/tasks",
      taskById: function (id) {
        return "/api/tasks/" + encodeURIComponent(id);
      },
      taskStatus: function (id) {
        return "/api/tasks/" + encodeURIComponent(id) + "/status";
      }
    }
  };
})();
