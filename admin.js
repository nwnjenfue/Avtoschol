const $ = (s) => document.querySelector(s),
  tok = () => localStorage.getItem("drive_token");
async function api(p, o = {}) {
  const r = await fetch("/api" + p, {
    headers: {
      "Content-Type": "application/json",
      ...(tok() ? { Authorization: "Bearer " + tok() } : {}),
    },
    ...o,
  });
  if (r.status === 204) return null;
  const d = await r.json();
  if (!r.ok) throw Error(d.message);
  return d;
}
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
async function uploadMedia(file) {
  if (!file) return null;
  const form = new FormData();
  form.append("media", file);
  const response = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { Authorization: "Bearer " + tok() },
    body: form,
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.message || "Не удалось загрузить файл");
  return result;
}
async function load() {
  try {
    const [posts, s] = await Promise.all([api("/posts"), api("/settings")]);
    $("#accent").value = s.accent || "#c7ff3e";
    $("#phone").value = s.phone || "+77051211473";
    $("#adminPosts").innerHTML = posts.length
      ? posts
          .map(
            (p) =>
              `<div class="admin-post"><div><b>${p.title}</b><span>${new Date(p.created_at).toLocaleDateString("ru-RU")}</span></div><div><button data-edit="${p.id}">Редактировать</button><button data-del="${p.id}">Удалить</button></div></div>`,
          )
          .join("")
      : "<p>Постов ещё нет.</p>";
    document.querySelectorAll("[data-del]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (confirm("Удалить пост?")) {
            await api("/admin/posts/" + b.dataset.del, { method: "DELETE" });
            toast("Пост удалён");
            load();
          }
        }),
    );
    document.querySelectorAll("[data-edit]").forEach(
      (b) =>
        (b.onclick = () => {
          const p = posts.find((x) => x.id == b.dataset.edit);
          $("#title").value = p.title;
          $("#excerpt").value = p.excerpt;
          $("#content").value = p.content;
          $("#mediaUrl").value = p.media_url || "";
          $("#mediaType").value = p.media_type;
          $("#postForm").dataset.id = p.id;
          $("#postForm button").innerHTML = "Сохранить изменения <b>→</b>";
          window.scrollTo({ top: 0, behavior: "smooth" });
        }),
    );
  } catch (e) {
    toast(e.message);
  }
}
async function check() {
  try {
    const s = JSON.parse(localStorage.getItem("drive_user") || "null");
    if (!s?.isAdmin) throw Error("Войдите под учётной записью администратора");
    $("#adminLogin").hidden = true;
    $("#adminArea").hidden = false;
    load();
  } catch (e) {
    $("#loginNote").textContent = e.message;
  }
}
$("#loginForm").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const d = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: $("#email").value,
        password: $("#password").value,
      }),
    });
    localStorage.setItem("drive_token", d.token);
    localStorage.setItem("drive_user", JSON.stringify(d.user));
    check();
  } catch (e) {
    $("#loginNote").textContent = e.message;
  }
};
$("#settingsForm").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api("/admin/settings", {
      method: "PUT",
      body: JSON.stringify({
        accent: $("#accent").value,
        phone: $("#phone").value,
      }),
    });
    toast("Настройки сохранены");
  } catch (e) {
    toast(e.message);
  }
};
$("#postForm").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const uploaded = await uploadMedia($("#mediaFile").files[0]);
    const f = $("#postForm"),
      body = {
        title: $("#title").value,
        excerpt: $("#excerpt").value,
        content: $("#content").value,
        mediaUrl: uploaded?.mediaUrl || $("#mediaUrl").value,
        mediaType: uploaded?.mediaType || $("#mediaType").value,
      };
    await api("/admin/posts" + (f.dataset.id ? "/" + f.dataset.id : ""), {
      method: f.dataset.id ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
    f.reset();
    delete f.dataset.id;
    f.querySelector("button").innerHTML = "Опубликовать <b>→</b>";
    toast("Материал сохранён");
    load();
  } catch (e) {
    toast(e.message);
  }
};
check();
