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
            window.location.href = "index.html";
        } else {
            alert("登录失败");
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

// 预约
function reserve(spaceId) {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("请先登录");
        return;
    }

    // 防止重复点击
    if (window.reserving) return;
    window.reserving = true;

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    fetch(`${API_BASE}/reserve/`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            user_id: userId,
            space_id: spaceId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
        })
    })
    .then(async res => {
        // ⛔ 关键：先判断 HTTP 状态码
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "预约失败");
        }
        return res.json();
    })
    .then(data => {
        showMsg("预约成功！", "success");
        loadSpaces();   // 容量会正确刷新
    })
    .catch(err => {
        showMsg("预约失败：该学习空间已无剩余容量或已预约", "danger");
        console.error(err);
    })
    .finally(() => {
        window.reserving = false;
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

// 页面加载
document.addEventListener("DOMContentLoaded", function () {
    loadSpaces();
});
