const API_BASE = "http://127.0.0.1:8000/api";

/* ======================
   登录
====================== */
function login() {
<<<<<<< HEAD
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
=======
    const usernameEl = document.getElementById("username");
    const passwordEl = document.getElementById("password");
    if (!usernameEl || !passwordEl) return;
>>>>>>> 720fb85 (优化前端界面)

    const username = usernameEl.value;
    const password = passwordEl.value;

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

<<<<<<< HEAD
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
=======
            window.location.href = data.role === "admin"
                ? "admin.html"
                : "index.html";
        } else {
            alert("登录失败：" + (data.msg || ""));
        }
>>>>>>> 720fb85 (优化前端界面)
    });
}

/* ======================
   注册
====================== */
function register() {
<<<<<<< HEAD
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;

    if (!username || !password) {
        alert("请输入用户名和密码");
        return;
    }
=======
    const u = document.getElementById("reg-username");
    const p = document.getElementById("reg-password");
    if (!u || !p) return;
>>>>>>> 720fb85 (优化前端界面)

    fetch(`${API_BASE}/register/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
<<<<<<< HEAD
        body: JSON.stringify({ username, password })
=======
        body: JSON.stringify({ username: u.value, password: p.value })
>>>>>>> 720fb85 (优化前端界面)
    })
    .then(res => res.json())
    .then(data => {
        if (data.msg === "success") {
<<<<<<< HEAD
            alert("注册成功，已自动登录");
=======
            alert("注册成功，已登录");
>>>>>>> 720fb85 (优化前端界面)
            localStorage.setItem("user_id", data.user_id);
            localStorage.setItem("role", "student");
            window.location.href = "index.html";
        } else {
            alert("注册失败：" + data.msg);
        }
    });
}

/* ======================
   学习空间列表
====================== */
function loadSpaces() {
<<<<<<< HEAD
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
=======
    const table = document.getElementById("spaceTable");
    if (!table) return;

    fetch(`${API_BASE}/spaces/`)
        .then(res => res.json())
        .then(data => {
            table.innerHTML = "";
            data.forEach(space => {
                let cls = "text-success";
                if (space.available <= 0) cls = "text-danger";
                else if (space.available < 5) cls = "text-warning";
>>>>>>> 720fb85 (优化前端界面)

                table.innerHTML += `
                <tr>
                    <td>${space.name}</td>
                    <td>${space.location}</td>
<<<<<<< HEAD
                    <td class="fw-bold ${capacityClass}">
                        ${space.available} / ${space.capacity}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-success"
                            ${disabled}
                            onclick="reserve(${space.space_id})">
=======
                    <td class="fw-bold ${cls}">
                        ${space.available}/${space.capacity}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary"
                            ${space.available <= 0 ? "disabled" : ""}
                            onclick="openReserve(${space.space_id})">
>>>>>>> 720fb85 (优化前端界面)
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
<<<<<<< HEAD
function reserve(spaceId) {
=======
function openReserve(spaceId) {
>>>>>>> 720fb85 (优化前端界面)
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("请先登录");
        return;
    }

<<<<<<< HEAD
    document.getElementById("modalSpaceId").value = spaceId;

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

    document.getElementById("startTime").value = now.toISOString().slice(0, 16);
    document.getElementById("endTime").value =
        new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
=======
    const sid = document.getElementById("modalSpaceId");
    if (!sid) return;

    sid.value = spaceId;

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById("startTime").value = now.toISOString().slice(0,16);
    document.getElementById("endTime").value =
        new Date(now.getTime()+3600000).toISOString().slice(0,16);
>>>>>>> 720fb85 (优化前端界面)

    new bootstrap.Modal(document.getElementById("reserveModal")).show();
}

function confirmReserve() {
<<<<<<< HEAD
    const userId = localStorage.getItem("user_id");

=======
>>>>>>> 720fb85 (优化前端界面)
    fetch(`${API_BASE}/reserve/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
<<<<<<< HEAD
            user_id: userId,
=======
            user_id: localStorage.getItem("user_id"),
>>>>>>> 720fb85 (优化前端界面)
            space_id: document.getElementById("modalSpaceId").value,
            start_time: new Date(document.getElementById("startTime").value).toISOString(),
            end_time: new Date(document.getElementById("endTime").value).toISOString()
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.msg === "success") {
<<<<<<< HEAD
            alert("预约成功！");
=======
            alert("预约成功");
>>>>>>> 720fb85 (优化前端界面)
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
<<<<<<< HEAD
    const userId = localStorage.getItem("user_id");

    fetch(`${API_BASE}/my_reservations/?user_id=${userId}`)
        .then(res => res.json())
        .then(data => {
            const table = document.getElementById("myTable");
            if (!table) return;

            table.innerHTML = "";

=======
    const table = document.getElementById("myTable");
    if (!table) return;

    fetch(`${API_BASE}/my_reservations/?user_id=${localStorage.getItem("user_id")}`)
        .then(res => res.json())
        .then(data => {
            table.innerHTML = "";
>>>>>>> 720fb85 (优化前端界面)
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
<<<<<<< HEAD
    const userId = localStorage.getItem("user_id");

    fetch(`${API_BASE}/admin/overview/?user_id=${userId}`)
=======
    fetch(`${API_BASE}/admin/overview/?user_id=${localStorage.getItem("user_id")}`)
>>>>>>> 720fb85 (优化前端界面)
        .then(res => res.json())
        .then(data => {
            if (!data) return;
            document.getElementById("totalSpaces").innerText = data.total_spaces;
            document.getElementById("activeReservations").innerText = data.active_reservations;
        });
}

/* ======================
<<<<<<< HEAD
   退出登录
=======
   退出
>>>>>>> 720fb85 (优化前端界面)
====================== */
function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

/* ======================
<<<<<<< HEAD
   页面初始化
====================== */
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("spaceTable")) loadSpaces();
=======
   初始化
====================== */
document.addEventListener("DOMContentLoaded", () => {
    loadSpaces();
    loadMyReservations();
    loadAdminOverview();
>>>>>>> 720fb85 (优化前端界面)
});
