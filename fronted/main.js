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
                    <td class="ps-4">${space.name}</td>
                    <td>${space.location}</td>
                    <td class="text-center fw-bold ${capacityClass}">
                        ${space.available} / ${space.capacity}
                    </td>
                    <td class="text-center pe-4">
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
                let statusBadge = "";
                let actionBtn = "";
                
                if (r.status === "reserved") {
                    statusBadge = `<span class="badge bg-primary">已预约</span>`;
                    actionBtn = `
                        <button class="btn btn-sm btn-success me-1" onclick="checkIn(${r.reservation_id})">签到</button>
                        <button class="btn btn-sm btn-danger" onclick="cancelReservation(${r.reservation_id})">取消</button>
                    `;
                } else if (r.status === "in_use") {
                    statusBadge = `<span class="badge bg-warning text-dark">使用中</span>`;
                    actionBtn = `<button class="btn btn-sm btn-danger" onclick="checkOut(${r.reservation_id})">签退</button>`;
                } else if (r.status === "completed") {
                    statusBadge = `<span class="badge bg-secondary">已完成</span>`;
                    actionBtn = `<button class="btn btn-sm btn-outline-primary" onclick="openFeedback(${r.reservation_id})">评价</button>`;
                } else if (r.status === "cancelled") {
                    statusBadge = `<span class="badge bg-danger">已取消</span>`;
                }

                table.innerHTML += `
                <tr>
                    <td>${r.space_name}</td>
                    <td>${r.location}</td>
                    <td>${new Date(r.start_time).toLocaleString()} <br> ~ ${new Date(r.end_time).toLocaleString()}</td>
                    <td>${statusBadge}</td>
                    <td>${actionBtn}</td>
                </tr>`;
            });
        });
}

function checkIn(reservationId) {
    const userId = localStorage.getItem("user_id");
    fetch(`${API_BASE}/check_in/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({reservation_id: reservationId, user_id: userId})
    })
    .then(res => res.json())
    .then(data => {
        if(data.msg === "success") {
            alert("签到成功");
            loadMyReservations();
        } else {
            alert("签到失败: " + data.msg);
        }
    });
}

function checkOut(reservationId) {
    const userId = localStorage.getItem("user_id");
    fetch(`${API_BASE}/check_out/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({reservation_id: reservationId, user_id: userId})
    })
    .then(res => res.json())
    .then(data => {
        if(data.msg === "success") {
            alert("签退成功");
            loadMyReservations();
        } else {
            alert("签退失败: " + data.msg);
        }
    });
}

function cancelReservation(reservationId) {
    if(!confirm("确定要取消预约吗？")) return;
    
    const userId = localStorage.getItem("user_id");
    fetch(`${API_BASE}/cancel_reservation/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({reservation_id: reservationId, user_id: userId})
    })
    .then(res => res.json())
    .then(data => {
        if(data.msg === "success") {
            alert("取消成功");
            loadMyReservations();
        } else {
            alert("取消失败: " + data.msg);
        }
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
            loadUserList(); // Refresh user list to show updated credit scores
        })
        .catch(err => {
            alert("检测失败: " + err);
        });
}

function loadUserList() {
    const userId = localStorage.getItem("user_id");
    fetch(`${API_BASE}/admin/users/?user_id=${userId}`)
    .then(res => res.json())
    .then(data => {
        const table = document.getElementById("userTable");
        if(!table) return;
        table.innerHTML = "";
        data.forEach(u => {
            let rowClass = "";
            if(u.credit_score < 60) rowClass = "table-danger";
            else if(u.credit_score < 80) rowClass = "table-warning";
            
            table.innerHTML += `
            <tr class="${rowClass}">
                <td>${u.user_id}</td>
                <td>${u.username}</td>
                <td>${u.role}</td>
                <td>${u.credit_score}</td>
            </tr>
            `;
        });
    });
}

function openFeedback(reservationId) {
    document.getElementById("feedbackReservationId").value = reservationId;
    new bootstrap.Modal(document.getElementById('feedbackModal')).show();
}

function submitFeedback() {
    const reservationId = document.getElementById("feedbackReservationId").value;
    const rating = document.getElementById("feedbackRating").value;
    const comment = document.getElementById("feedbackComment").value;
    
    fetch(`${API_BASE}/submit_feedback/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            reservation_id: reservationId,
            rating: rating,
            comment: comment
        })
    })
    .then(res => res.json())
    .then(data => {
        if(data.msg === "success") {
            alert("评价提交成功！");
            bootstrap.Modal.getInstance(document.getElementById('feedbackModal')).hide();
        } else {
            alert("提交失败: " + data.msg);
        }
    });
}

function loadMyStats() {
    const userId = localStorage.getItem("user_id");

    fetch(`${API_BASE}/my_stats/?user_id=${userId}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("statTotalCount").innerText =
                data.total_reservations;

            document.getElementById("statTotalHours").innerText =
                data.total_hours;

            if (data.last_reservation) {
                document.getElementById("statLast").innerText =
                    `${data.last_reservation.space_name}
                     (${data.last_reservation.start_time})`;
            } else {
                document.getElementById("statLast").innerText = "暂无";
            }
        });
}

document.addEventListener("DOMContentLoaded", loadMyStats);


document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("spaceTable")) loadSpaces();
});
