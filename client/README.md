# 智邻便民客户端演示页

## 角色说明
- 当前客户端身份固定为：`resident-1001`（王阿姨）
- 客户端权限：`新增任务`、`删除任务`
- 客户端不提供：编辑任务、修改状态（由后台管理员处理）

## 运行方式
1. 在项目根目录启动 Node 服务：
   - `npm.cmd start`
2. 浏览器访问：
   - 客户端：`http://localhost:3000/`

## 接口说明（客户端实际使用）
- `GET /api/tasks?userId=resident-1001`
- `POST /api/tasks`
- `DELETE /api/tasks/:id`

## 目录结构
```
客户端/
  index.html
  README.md
  assets/
    css/
      style.css
    js/
      config.js
      main.js
    images/
      user-avatar.svg
```
