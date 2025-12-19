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

- 在 [admin.html](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 中新增了 **“用户信用管理”** 面板。
- 现在管理员可以查看所有用户的 ID、用户名、角色以及 **信用分 (Credit Score)**。
- 信用分低于 60 的用户会以红色高亮显示，低于 80 的以黄色显示。

#### **高级数据库功能 (3NF 合规)**：

- 用户信用体系：
  - 在 [User](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 表中新增 [credit_score](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 字段（默认 100）。
  - 业务逻辑：
    - **违规扣分**：在 [check_violations](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 接口中，如果检测到“未签到 (No Show)”，自动扣除用户 10 分信用分。
    - **预约限制**：在 [reserve_space](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 接口中，如果用户信用分低于 60，将禁止预约。
- 评价反馈系统：
  - 新增 [Feedback](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 表（[feedback_id](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html), [reservation_id](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html), [rating](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html), [comment](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html), [created_at](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)）。
  - 该表通过 [reservation_id](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 关联到具体的预约记录，符合 **第三范式 (3NF)**，避免了数据冗余（不需要重复存储 user_id 或 space_id）。
  - **前端实现**：在“我的预约”页面，对于状态为“已完成”的预约，新增了 **“评价”** 按钮。点击后弹出模态框，允许用户打分（1-5星）并填写评论。

#### **如何演示给老师看：**

1. **展示 3NF**：打开数据库模型代码 ([models.py](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html))，解释 [Feedback](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 表只关联 [Reservation](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html)，没有传递依赖；[User](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 表的 [credit_score](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 直接依赖于主键。
2. 演示信用扣分：
   - 创建一个预约，故意不签到。
   - 在管理员界面点击“运行检测”。
   - 刷新管理员界面，展示该用户的信用分减少了（例如从 100 变 90）。
3. 演示评价功能：
   - 正常签到并签退一个预约（状态变为“已完成”）。
   - 在“我的预约”中点击“评价”，提交评分。
   - （可选）展示数据库中新增的 [Feedback](vscode-file://vscode-app/c:/Users/jiangqinru/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html) 记录。