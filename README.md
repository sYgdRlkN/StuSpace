# StuSpace

StuSpace 是一个学习空间预约系统：后端 Django 提供 JSON API，前端使用原生 JavaScript 通过 `fetch` 调用，数据库为 MySQL。

本项目的数据库作业加分点：
 - [docs/schema.sql](docs/schema.sql) 与当前系统表结构完全对齐（含约束/索引）
 - 额外提供 1 个视图 `v_space_today_stats`（便于统计展示）
 - 额外提供 1 个存储过程 `sp_create_reservation`（在数据库层完成一致性校验与并发控制示例）

## 运行环境

 - Python 3.10+
 - MySQL 8.0+（建议，需支持 CHECK 约束；较老版本会忽略 CHECK）

## 快速启动

1) 安装依赖

```bash
pip install -r requirements.txt
```

2) 初始化数据库（两种方式二选一）

 - A. 直接用 Django 迁移（开发推荐）

```bash
cd backend
python manage.py migrate
```

 - B. 直接执行交作业用 DDL（老师验收/演示推荐）

在 MySQL 中执行 [docs/schema.sql](docs/schema.sql)。

3) 启动后端

```bash
cd backend
python manage.py runserver
```

4) 启动前端

必须使用静态服务器（例如 VS Code Live Server）打开：
 - [fronted/login.html](fronted/login.html)

## 数据库设计：3NF 说明（面向答辩）

核心表：`user`、`study_space`、`reservation`、`usage_record`、`abnormal_behavior`、`feedback`。

 - 1NF：所有字段均为原子值（如 `start_time/end_time`、`credit_score`、`rating` 等），无重复组。
 - 2NF：所有非主属性都完全依赖于主键。
   - 例如 `reservation(status,start_time,end_time, user_id,space_id)` 完全依赖 `reservation_id`，而不会只依赖复合键的一部分。
 - 3NF：不存在非主属性对非主属性的传递依赖。
   - 用户信用分 `credit_score` 只在 `user` 表维护，预约与违规表仅通过 `user_id` 关联，不复制用户信息。
   - 空间容量 `capacity` 只在 `study_space` 表维护，预约表不冗余容量字段。
   - 评价 `feedback` 通过 `reservation_id` 关联，不把用户/空间信息重复存储在评价表中。

这种拆分保证：更新用户/空间属性不需要级联修改多张业务表，减少更新异常。

## 索引/约束/视图/过程：为何能提升一致性与性能

对应实现见 [docs/schema.sql](docs/schema.sql)。

 - 关键约束（Consistency）
   - `reservation.status` 使用约束限制为 `reserved/in_use/cancelled/completed`，避免非法状态。
   - `reservation(end_time > start_time)` 防止时间段错误。
   - `feedback.rating` 限制 1~5。
   - `uniq_feedback_reservation` 保证 1 个预约最多 1 条评价（避免重复打分）。

 - 关键索引（Performance）
   - `idx_reservation_space_time(space_id, start_time, end_time, status)`：
     - 支持“空间在某时间段是否已满/是否冲突”的区间重叠查询（预约时的核心热点）。
   - `idx_reservation_user_time(user_id, start_time, end_time, status)`：
     - 支持“用户是否有时间冲突”的查询。
   - `idx_abnormal_user_time / idx_abnormal_space_time`：
     - 支持管理端按用户/空间、按时间统计异常。

 - 视图（View）
   - `v_space_today_stats`：把“空间维度 + 当天预约/完成/异常统计”封装为可直接查询的逻辑视图，方便演示数据库层的报表能力。

 - 存储过程（Stored Procedure）
   - `sp_create_reservation`：在数据库事务里完成：
     - 信用分限制（低于 60 直接拒绝）
     - 空间容量校验（时间段重叠计数与 capacity 对比）
     - 用户时间冲突校验
     - 并发控制（`SELECT ... FOR UPDATE` 锁住空间与相关查询）
   - 作用：把一致性校验下沉到数据库层，避免多端调用时逻辑分散导致的绕过。

## 功能清单

 - 登录（学生/管理员）
 - 空间列表与预约（支持自定义开始/结束时间）
 - 取消预约（释放占用）
 - 我的预约：签到 / 签退 / 状态展示
 - 违规检测：未签到(no_show) / 超时(overtime) 记录与处理
 - 信用分：违约扣分、低分限制预约
 - 评价：已完成预约可提交评分与评论
 - 管理端：概览统计、触发违规检测、用户信用分列表

## 演示步骤（从 0 到全功能）

1) 初始化并造演示数据

```bash
cd backend
python manage.py migrate
python populate_db.py
```

2) 登录演示账号（populate_db 会创建）

 - 管理员：`admin / adminpassword`
 - 学生（不同信用分）：
   - `demo_low / 123456`（55：应被限制预约）
   - `demo_mid / 123456`（60：刚好可预约）
   - `demo_good / 123456`（80）
   - `demo_high / 123456`（95）

3) 学生端演示

 - 使用 `demo_mid` 或 `demo_good` 登录
 - 在首页选择空间，填写开始/结束时间并预约
 - 进入“我的预约”：
   - 在预约开始前 15 分钟到开始后 30 分钟内，点击“签到”
   - 使用后点击“签退”，预约变为 `completed`
   - 对已完成预约点击“评价”，提交评分与评论

4) 违规与信用分演示

 - 用 `demo_mid` 预约一个即将开始的时间段，但不要签到
 - 切换到管理员页，点击“运行违规检测”
 - 系统会把未签到的预约处理为 `cancelled` 并记录 `no_show`，同时扣减信用分
 - 刷新“用户信用管理”列表可看到信用分变化

5) 视图与存储过程演示（数据库层）

在 MySQL 中执行：

```sql
USE study_space_db;

-- 视图：当天空间统计
SELECT * FROM v_space_today_stats;

-- 存储过程：创建预约（展示 DB 层一致性校验）
CALL sp_create_reservation(2, 1, NOW() + INTERVAL 1 HOUR, NOW() + INTERVAL 2 HOUR);
```

## 备注

 - 前端需要用 Live Server 等静态服务器打开，否则跨域/路径可能异常。
 - 后端时区配置为 `Asia/Shanghai`，避免前后端时间不一致。
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

---

#### 修复注册功能：

问题原因：login.html 缺少 Bootstrap JS 库，导致“登录/注册”标签页无法切换，用户无法看到注册表单。
修复：已在 login.html 中引入 bootstrap.bundle.min.js。

#### 对齐预约面板表格：

更新了 main.js 中的 loadSpaces 函数，确保生成的表格行包含 5 列（名称、位置、容量、剩余座位、操作），并添加了 ps-4 和 pe-4 类以与表头完美对齐。

#### 新增“取消预约”功能：

后端：在 views.py 中添加了 cancel_reservation 接口，允许用户取消状态为 reserved 的预约。
前端：在“我的预约”列表中，为“已预约”状态的条目添加了“取消”按钮。点击后会弹出确认框，确认后调用后端接口取消预约并释放资源。

#### 签到/签退功能检查与确认：

实现逻辑：
签到：调用 /api/check_in/，后端检查时间（需在开始时间前后 15 分钟内），成功后状态变为 in_use。
签退：调用 /api/check_out/，后端记录结束时间并计算时长，状态变为 completed。
前端展示：loadMyReservations 会根据预约状态动态显示“签到”或“签退”按钮。

#### 管理员页面

增加退出登录功能

#### **管理员界面检查与增强**：

- 在 [admin.html] 中新增了 **“用户信用管理”** 面板。
- 现在管理员可以查看所有用户的 ID、用户名、角色以及 **信用分 (Credit Score)**。
- 信用分低于 60 的用户会以红色高亮显示，低于 80 的以黄色显示。

#### **高级数据库功能 (3NF 合规)**：

- 用户信用体系：
  - 在 [User] 表中新增 [credit_score]字段（默认 100）。
  - 业务逻辑：
    - **违规扣分**：在 [check_violations] 接口中，如果检测到“未签到 (No Show)”，自动扣除用户 10 分信用分。
    - **预约限制**：在 [reserve_space] 接口中，如果用户信用分低于 60，将禁止预约。
- 评价反馈系统：
  - 新增 [Feedback] 表（[feedback_id], [reservation_id], [rating], [comment], [created_at]。
  - 该表通过 [reservation_id] 关联到具体的预约记录，符合 **第三范式 (3NF)**，避免了数据冗余（不需要重复存储 user_id 或 space_id）。
  - **前端实现**：在“我的预约”页面，对于状态为“已完成”的预约，新增了 **“评价”** 按钮。点击后弹出模态框，允许用户打分（1-5星）并填写评论。

#### **如何演示给老师看：**

1. **展示 3NF**：打开数据库模型代码 ([models.py])，解释 [Feedback] 表只关联 [Reservation]，没有传递依赖；[User]表的 [credit_score] 直接依赖于主键。
2. 演示信用扣分：
   - 创建一个预约，故意不签到。
   - 在管理员界面点击“运行检测”。
   - 刷新管理员界面，展示该用户的信用分减少了（例如从 100 变 90）。
3. 演示评价功能：
   - 正常签到并签退一个预约（状态变为“已完成”）。
   - 在“我的预约”中点击“评价”，提交评分。
   - （可选）展示数据库中新增的 [Feedback] 记录。

- 直接用 `demo_good / 123456` 登录：能看到“即将开始”的预约并可签到
- 用 `demo_high / 123456` 登录：能看到“使用中/超时未签退”的样例
- 管理员用 [admin / adminpassword] 登录：看“用户信用管理”表里不同信用分的效果