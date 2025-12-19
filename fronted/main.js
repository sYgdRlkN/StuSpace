const API_BASE = "http://127.0.0.1:8000/api";

// 登录
function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username, password})
    })
    .then(res => res.json())
    .then(data => {
        if (data.msg === "success") {
            localStorage.setItem("user_id", data.user_id);
            localStorage.setItem("role", data.role);
            
            if (data.role === 'admin') {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }
        } else {
            alert("登录失败: " + (data.msg || "未知错误"));
        }
    });
}

// 注册
function register() {
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;

    if (!username || !password) {
        alert("请输入用户名和密码");
        return;
    }

    fetch(`${API_BASE}/register/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username, password})
    })
    .then(res => res.json())
    .then(data => {
        if (data.msg === "success") {
            alert("注册成功，正在自动登录...");
            // 自动登录逻辑
            localStorage.setItem("user_id", data.user_id);
            localStorage.setItem("role", "student"); // 默认注册为学生
            window.location.href = "index.html";
        } else {
            alert("注册失败: " + data.msg);
        }
    });
}

// 加载学习空间
function loadSpaces() {
    fetch(`${API_BASE}/spaces/`)
        .then(res => res.json())
        .then(data => {
            const table = document.getElementById("spaceTable");
            if (!table) return;

            table.innerHTML = "";

            data.forEach(space => {
                // 容量颜色
                let capacityClass = "text-success";
                if (space.capacity <= 20) capacityClass = "text-danger";
                else if (space.capacity <= 50) capacityClass = "text-warning";

                const disabled = space.capacity <= 0 ? "disabled" : "";

                table.innerHTML += `
                <tr>
                    <td>${space.name}</td>
                    <td>${space.location}</td>
                    <td class="text-center fw-bold ${capacityClass}">
                        ${space.available} / ${space.capacity}
                    </td>
                    <td class="text-center">
                        <button class="btn btn-success btn-sm"
                                ${disabled}
                                onclick="reserve(${space.space_id})">
                            预约
                        </button>
                    </td>
                </tr>
                `;
            });
        });
}

// 预约 - 打开模态框
function reserve(spaceId) {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("请先登录");
        return;
    }
    
    document.getElementById("modalSpaceId").value = spaceId;
    
    // Set default time (now + 1h)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); 
    document.getElementById("startTime").value = now.toISOString().slice(0, 16);
    
    const end = new Date(now.getTime() + 60*60*1000);
    document.getElementById("endTime").value = end.toISOString().slice(0, 16);
    
    const modal = new bootstrap.Modal(document.getElementById('reserveModal'));
    modal.show();
}

function confirmReserve() {
    const userId = localStorage.getItem("user_id");
    const spaceId = document.getElementById("modalSpaceId").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    
    const startISO = new Date(startTime).toISOString();
    const endISO = new Date(endTime).toISOString();

    fetch(`${API_BASE}/reserve/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            user_id: userId,
            space_id: spaceId,
            start_time: startISO,
            end_time: endISO
        })
    })
    .then(async res => {
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.msg || "预约失败");
        }
        return res.json();
    })
    .then(data => {
        alert("预约成功！");
        const modalEl = document.getElementById('reserveModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        loadSpaces();
    })
    .catch(err => {
        alert(err.message);
    });
}


// 提示框
function showMsg(text, type) {
    const box = document.getElementById("msgBox");
    if (!box) return;

    box.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show">
            ${text}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

// 加载我的预约
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
                    actionBtn = `<button class="btn btn-sm btn-success" onclick="checkIn(${r.reservation_id})">签到</button>`;
                } else if (r.status === "in_use") {
                    statusBadge = `<span class="badge bg-warning text-dark">使用中</span>`;
                    actionBtn = `<button class="btn btn-sm btn-danger" onclick="checkOut(${r.reservation_id})">签退</button>`;
                } else if (r.status === "completed") {
                    statusBadge = `<span class="badge bg-secondary">已完成</span>`;
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
                </tr>
                `;
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

// 加载管理员概览
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
        });
}

// 退出登录
function logout() {
    localStorage.removeItem("user_id");
    localStorage.removeItem("role");
    window.location.href = "login.html";
}

// 页面加载
document.addEventListener("DOMContentLoaded", function () {
    // 根据当前页面决定加载什么
    if (document.getElementById("spaceTable")) {
        loadSpaces();
    }
});

function runViolationCheck() {
    fetch(`${API_BASE}/check_violations/`)
    .then(res => res.json())
    .then(data => {
        const resultDiv = document.getElementById("violationResult");
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="alert alert-info">
                    检测完成。<br>
                    处理未签到: ${data.processed_no_shows} <br>
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
