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
        .then(res => {
            if (!res.ok) {
                throw new Error("spaces fetch failed");
            }
            return res.json();   // ⭐必须 return
        })
        .then(data => {
            const table = document.getElementById("spaceTable");
            table.innerHTML = "";

            data.forEach(space => {
                table.innerHTML += `
                    <tr>
                        <td>${space.name}</td>
                        <td>${space.location}</td>
                        <td>${space.available} / ${space.capacity}</td>
                        <td>
                          ${
                            space.available > 0
                              ? `<button onclick="reserve(${space.space_id})">预约</button>`
                              : `<button disabled>已满</button>`
                          }
                        </td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            console.error("loadSpaces error:", err);
        });
}


// 预约
function reserve(spaceId) {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("请先登录");
        return;
    }

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
    .then(res => {
        if (!res.ok) {
            throw new Error("reserve failed");
        }
        return res.json();   // ⭐关键
    })
    .then(data => {
        if (data.msg === "success") {
            alert("预约成功！");
            loadSpaces();
        } else if (data.msg === "full") {
            alert("该时间段已满员");
        }
    })
    .catch(err => {
        console.error("reserve error:", err);
        alert("预约失败，请看控制台");
    });
}


document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("spaceTable")) {
        loadSpaces();
    }
});
