# 智邻便民后台管理页

## 页面地址
- `http://localhost:3000/admin/`

## 主要能力
- 按居民 `userId` 切换并管理任务
- 任务筛选（状态、关键词）
- 后台代录新增任务
- 状态流转（待受理 -> 处理中 -> 已办结）
- 编辑任务（标题、描述）
- 删除任务

## 接口依赖
- `GET /api/users`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `PATCH /api/tasks/:id/status`
- `DELETE /api/tasks/:id`

## 目录结构
```
admin/
  index.html
  README.md
  assets/
    css/
      style.css
    js/
      main.js
```
