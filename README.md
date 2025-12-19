## 环境配置
```bash
conda create -n space python=3.10
conda activate space
pip install -r requirements.txt
```
## 后端启动
```bash
cd backend
python manage.py runserver
```

## 前端
直接用 VSCode Live Server 打开 index.html

---

### 已完成以下更新：

#### 1.数据库迁移修复：

解决了 AbnormalBehavior 表已存在导致的迁移错误（使用了 --fake 选项）。
创建脚本backend\populate_db.py向数据库插入数据。

#### 2.后端功能实现 (views.py)：

增加注册功能

自定义预约时间：reserve_space 接口已支持接收前端传递的 start_time 和 end_time。

签到 (check_in)：新增接口，允许用户在预约开始前后 15 分钟内签到，状态更新为 in_use，并创建 UsageRecord。

签退 (check_out)：新增接口，用户签退后状态更新为 completed，并记录使用时长。

违规检测 (check_violations)：新增接口，用于检测“未签到”（No Show）和“超时未签退”（Overtime）的情况，并记录到 AbnormalBehavior 表中。

#### 3.前端界面更新：

登录界面双面板，可注册

预约弹窗 (index.html)：点击“预约”现在会弹出一个模态框，允许用户选择开始和结束时间。

我的预约页面 (my_reservations.html)：创建了新页面，展示预约历史，并根据状态显示“签到”或“签退”按钮。

管理员控制台 (admin.html)：增加了“违规检测”面板，管理员可以手动触发检测逻辑。

逻辑更新 (main.js)：添加了相应的 API 调用逻辑。

#### 4.如何测试：

预约：在首页点击预约，选择时间。

签到/签退：进入“我的预约”页面，点击对应按钮（注意时间限制，签到需在开始时间前后 15 分钟内）。

违规检测：登录管理员账号（需在数据库设置role='admin'），在控制台点击“运行检测”。