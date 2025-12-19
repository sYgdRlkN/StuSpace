# StuSpace AI 编码指南

## 项目概览
StuSpace 是一个学习空间预约系统，由 Django 后端和原生 JavaScript 前端组成。架构是解耦的：后端提供 JSON API，前端通过 `fetch` 调用。

## 架构与结构
- **后端 (`backend/`)**: Django 项目。
  - `backend/backend/`: 项目设置和主 URL 配置。
  - `backend/space/`: 包含模型、视图和业务逻辑的主应用。
  - **API 风格**: 自定义 JSON API，使用 `django.http.JsonResponse`（未使用 Django Rest Framework）。
- **前端 (`fronted/`)**: 静态 HTML/JS 文件。
  - `index.html`, `login.html`: UI 页面。
  - `my_reservations.html`: 用户预约历史页面。
  - `ui.css`: 全局样式。
  - `main.js`: API 客户端和 UI 逻辑。
- **数据库**: **MySQL**（在 `settings.py` 中配置），使用 `pymysql` 作为驱动。

## 使用指南 (How to Use)

### 1. 环境准备
确保已安装 Python 3.10+ 和 MySQL。
```bash
# 创建并激活环境
conda create -n space python=3.10
conda activate space

# 安装依赖
pip install -r requirements.txt
```

### 2. 数据库设置
1. 启动 MySQL 服务。
2. 创建数据库：`CREATE DATABASE study_space_db;`
3. 确认 `backend/backend/settings.py` 中的数据库配置（用户名/密码）正确。
4. 应用迁移：
   ```bash
   cd backend
   python manage.py migrate
   ```

### 3. 启动后端
```bash
cd backend
python manage.py runserver
```
后端将在 `http://127.0.0.1:8000` 运行。

### 4. 启动前端
**重要**：必须使用静态文件服务器运行前端，不能直接打开文件。
- **推荐方式**：在 VS Code 中安装 "Live Server" 插件。
- **操作**：右键点击 `fronted/login.html` -> 选择 "Open with Live Server"。

### 5. 操作流程
1. 打开浏览器访问前端页面（通常是 `http://127.0.0.1:5500/fronted/login.html`）。
2. **登录/注册**：使用现有账号登录，或直接在数据库添加用户（目前暂无注册页面）。
3. **预约**：登录后跳转至首页，查看可用空间并点击“预约”。
4. **查看记录**：点击“我的预约”查看历史记录。

## 代码规范与模式

### 后端 (Django)
- **视图**:
    - 位于 `backend/space/views.py`。
    - 使用基于函数的视图。
    - 使用 `@csrf_exempt` 装饰 API 视图。
    - **输入**: `data = json.loads(request.body)`
    - **输出**: `return JsonResponse({"msg": "success", ...})`
- **认证**:
    - 使用自定义 `User` 模型。
    - 基于 `user_id` 的简单认证。
- **CORS**:
    - 已配置 `django-cors-headers`。
    - 注意处理 `OPTIONS` 请求。

### 前端 (JavaScript)
- **API 调用**:
    - 基地址: `http://127.0.0.1:8000/api`。
    - 使用 `fetch`，POST 请求需设置 `Content-Type: application/json`。
- **状态**:
    - `user_id` 存储在 `localStorage`。

## 常见任务
- **添加 API**:
    1. `views.py` 定义视图。
    2. `urls.py` 添加路由。
    3. `main.js` 添加调用函数。
- **调试**:
    - 后端看终端输出。
    - 前端看浏览器控制台 (F12)。
