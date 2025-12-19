const API_BASE = "http://127.0.0.1:8000/api";

/* ======================
   登录
====================== */
function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (!username || !password) {
        alert("请输入用户名和密码");
        return;
    }

    fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.msg === "success") {
            localStorage.setItem("user_id", data.user_id);
            localStorage.setItem("role", data.role);

            if (data.role === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }
        } else {
            alert("登录失败：" + (data.msg || "未知错误"));
        }
    })
    .catch(() => {
        alert("无法连接后端服务");
    });
}

/* ======================
   注册
====================== */
function register() {
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;

    if (!username || !password) {
        alert("请输入用户名和密码");
        return;
    }

    fetch(`${API_BASE}/register/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.msg === "success") {
            alert("注册成功，正在自动登录...");

            // 自动登录逻辑
            localStorage.setItem("user_id", data.user_id);
            localStorage.setItem("role", "student"); // 默认注册为学生

            // 可选：也保存用户名
            localStorage.setItem("username", username);

            // 跳转到主页
            window.location.href = "index.html";
        } else {
            alert("注册失败: " + data.msg);
        }
    })
    .catch(error => {
        console.error("注册请求失败:", error);
        alert("网络错误，请稍后重试");
    });
}

/* ======================
   学习空间列表
====================== */
function loadSpaces() {
    fetch(`${API_BASE}/spaces/`)
        .then(res => res.json())
        .then(data => {
            const table = document.getElementById("spaceTable");
            if (!table) return;

            table.innerHTML = "";

            data.forEach(space => {
                let capacityClass = "text-success";
                if (space.available <= 0) capacityClass = "text-danger";
                else if (space.available <= 10) capacityClass = "text-warning";

                const disabled = space.available <= 0 ? "disabled" : "";

                table.innerHTML += `
                <tr>
                    <td>${space.name}</td>
                    <td>${space.location}</td>
                    <td class="fw-bold ${capacityClass}">
                        ${space.available} / ${space.capacity}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-success"
                            ${disabled}
                            onclick="reserve(${space.space_id})">
                            预约
                        </button>
                    </td>
                </tr>`;
            });
        });
}

/* ======================
   预约（模态框）
====================== */
function reserve(spaceId) {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("请先登录");
        return;
    }

    document.getElementById("modalSpaceId").value = spaceId;

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

    document.getElementById("startTime").value = now.toISOString().slice(0, 16);
    document.getElementById("endTime").value =
        new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);

    new bootstrap.Modal(document.getElementById("reserveModal")).show();
}

function confirmReserve() {
    const userId = localStorage.getItem("user_id");

    fetch(`${API_BASE}/reserve/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            user_id: userId,
            space_id: document.getElementById("modalSpaceId").value,
            start_time: new Date(document.getElementById("startTime").value).toISOString(),
            end_time: new Date(document.getElementById("endTime").value).toISOString()
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.msg === "success") {
            alert("预约成功！");
            bootstrap.Modal.getInstance(
                document.getElementById("reserveModal")
            ).hide();
            loadSpaces();
        } else {
            alert(data.msg || "预约失败");
        }
    });
}

/* ======================
   我的预约
====================== */
function loadMyReservations() {
    const userId = localStorage.getItem("user_id");

    fetch(`${API_BASE}/my_reservations/?user_id=${userId}`)
        .then(res => res.json())
        .then(data => {
            const table = document.getElementById("myTable");
            if (!table) return;

            table.innerHTML = "";

            data.forEach(r => {
                table.innerHTML += `
                <tr>
                    <td>${r.space_name}</td>
                    <td>${r.location}</td>
                    <td>${new Date(r.start_time).toLocaleString()}</td>
                    <td>${r.status}</td>
                </tr>`;
            });
        });
}

/* ======================
   管理员概览
====================== */
function loadAdminOverview() {
    const userId = localStorage.getItem("user_id");

    fetch(`${API_BASE}/admin/overview/?user_id=${userId}`)
        .then(res => {
            if (res.status === 403) {
                alert("权限不足");
                window.location.href = "index.html";
                return;
            }
            return res.json();
        })
        .then(data => {
            if (!data) return;

            document.getElementById("totalSpaces").innerText = data.total_spaces;
            document.getElementById("totalCapacity").innerText = data.total_capacity;
            document.getElementById("activeReservations").innerText = data.active_reservations;
            document.getElementById("historyReservations").innerText = data.history_reservations;
        })
        .catch(error => {
            console.error("加载管理概览失败:", error);
            alert("加载数据失败，请检查网络连接");
        });
}

/* ======================
   退出登录
====================== */
function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

function showLogin() {
    console.log("showLogin 函数被调用");

    const modal = document.getElementById("loginModal");
    if (modal) {
        // 显示模态框
        modal.style.display = "flex";

        // 添加动画效果
        setTimeout(() => {
            modal.style.opacity = "1";
        }, 10);

        // 重置到登录标签页（默认）
        const loginTab = document.getElementById('login-tab');
        if (loginTab) {
            console.log("切换到登录标签页");
            const bsTab = new bootstrap.Tab(loginTab);
            bsTab.show();
        }

        // 聚焦到用户名输入框
        setTimeout(() => {
            const usernameInput = document.getElementById("username");
            if (usernameInput) {
                usernameInput.focus();
            }
        }, 100);
    } else {
        console.error("错误：未找到 #loginModal 元素");
    }
}

function closeLogin() {
    const modal = document.getElementById("loginModal");
    if (modal) {
        modal.style.opacity = "0";
        setTimeout(() => {
            modal.style.display = "none";
        }, 300);
    }
}

function hideLogin() {
    document.getElementById("loginModal").classList.remove("show");
}

function runViolationCheck() {
    fetch(`${API_BASE}/check_violations/`)
        .then(res => res.json())
        .then(data => {
            const resultDiv = document.getElementById("violationResult");
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div class="alert alert-info">
                        检测完成。<br>
                        处理未签到: ${data.processed_no_shows}<br>
                        当前超时: ${data.current_overtimes}
                    </div>
                `;
            }
            loadAdminOverview();
        })
        .catch(err => {
            alert("检测失败: " + err);
        });
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("spaceTable")) loadSpaces();
});
