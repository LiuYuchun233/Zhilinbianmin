(function () {
  var search = new URLSearchParams(window.location.search);
  var baseFromQuery = search.get("apiBase");

  window.APP_CONFIG = {
    API_BASE: baseFromQuery || "",
    STORAGE_KEYS: {
      authToken: "zlbm_auth_token",
      currentUser: "zlbm_current_user"
    },
    ENDPOINTS: {
      users: "/api/users",
      authRegister: "/api/auth/register",
      authLogin: "/api/auth/login",
      authMe: "/api/auth/me",
      authLogout: "/api/auth/logout",
      myTasks: "/api/me/tasks",
      myTaskById: function (id) {
        return "/api/me/tasks/" + encodeURIComponent(id);
      },
      tasks: "/api/tasks",
      taskStatus: function (id) {
        return "/api/tasks/" + encodeURIComponent(id) + "/status";
      }
    }
  };
})();
