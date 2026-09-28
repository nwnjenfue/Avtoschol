const state = { cars: [], user: null, authMode: "login" };
const $ = (s) => document.querySelector(s),
  token = () => localStorage.getItem("drive_token");
const fileMode = location.protocol === "file:";
const demoCars = [
  {
    id: 1,
    name: "Hyundai Elantra",
    transmission: "АКПП",
    year: 2024,
    image_url: "assets/cars/hyundai-elantra.png",
    description: "Тёмный графит, камера и дублирующие педали.",
  },
  {
    id: 2,
    name: "Kia K5",
    transmission: "АКПП",
    year: 2024,
    image_url: "assets/cars/kia-k5.png",
    description: "Комфортный автомат для уверенного города.",
  },
  {
    id: 3,
    name: "Volkswagen Polo",
    transmission: "МКПП",
    year: 2023,
    image_url: "assets/cars/volkswagen-polo.png",
    description: "Точная механика и полный контроль.",
  },
  {
    id: 4,
    name: "Hyundai Accent",
    transmission: "АКПП",
    year: 2024,
    image_url: "assets/cars/hyundai-accent.png",
    description: "Компактный городской автомобиль для спокойного старта.",
  },
];
function demoStore(key, fallback) {
  const value = localStorage.getItem("drive_demo_" + key);
  return value ? JSON.parse(value) : fallback;
}
function saveDemo(key, value) {
  localStorage.setItem("drive_demo_" + key, JSON.stringify(value));
}
async function fileApi(path, options) {
  const body = options.body ? JSON.parse(options.body) : {};
  const method = options.method || "GET";
  if (path === "/cars") return demoStore("cars", demoCars);
  if (path === "/posts") return demoStore("posts", []);
  if (path === "/settings") return { accent: "#ffffff", phone: "+77051211473" };
  if (path === "/auth/register" && method === "POST") {
    const users = demoStore("users", []);
    if (users.some((user) => user.email === body.email.toLowerCase()))
      throw Error(
        "Этот e-mail уже зарегистрирован. Войдите через форму входа.",
      );
    const user = {
      id: Date.now(),
      name: body.name.trim(),
      email: body.email.toLowerCase(),
      password: body.password,
      isAdmin: false,
    };
    users.push(user);
    saveDemo("users", users);
    return {
      user: { ...user, password: undefined },
      token: "file-demo-token-" + user.id,
    };
  }
  if (path === "/auth/login" && method === "POST") {
    const user = demoStore("users", []).find(
      (item) =>
        item.email === body.email.toLowerCase() &&
        item.password === body.password,
    );
    if (!user) throw Error("Неверный e-mail или пароль");
    return {
      user: { ...user, password: undefined },
      token: "file-demo-token-" + user.id,
    };
  }
  const user = JSON.parse(localStorage.getItem("drive_user") || "null");
  if (!user) throw Error("Авторизуйтесь, чтобы продолжить");
  if (path === "/me") return { user };
  if (path === "/me/bookings")
    return demoStore("bookings", []).filter(
      (booking) => booking.user_id === user.id,
    );
  if (path === "/bookings" && method === "POST") {
    if (!body.carId || !body.lessonAt)
      throw Error("Выберите автомобиль и время");
    const bookings = demoStore("bookings", []),
      cars = demoStore("cars", demoCars);
    if (
      bookings.some(
        (booking) =>
          booking.car_id === body.carId && booking.lesson_at === body.lessonAt,
      )
    )
      throw Error("Это время уже занято. Выберите другой слот.");
    const car = cars.find((item) => item.id === body.carId);
    const booking = {
      id: Date.now(),
      user_id: user.id,
      car_id: body.carId,
      car_name: car?.name || "Автомобиль",
      instructor_name: body.instructorName || "Инструктор DriveSchool",
      lesson_at: body.lessonAt,
      status: "new",
    };
    bookings.push(booking);
    saveDemo("bookings", bookings);
    return booking;
  }
  throw Error("Для этой функции откройте сайт через http://localhost:3002");
}
async function api(path, options = {}) {
  if (fileMode) return fileApi(path, options);
  const r = await fetch("/api" + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: "Bearer " + token() } : {}),
      ...(options.headers || {}),
    },
  });
  if (r.status === 204) return null;
  const d = await r.json();
  if (!r.ok) throw Error(d.message || "Не удалось выполнить действие");
  return d;
}
function toast(text) {
  const e = $("#toast");
  e.textContent = text;
  e.classList.add("show");
  setTimeout(() => e.classList.remove("show"), 3400);
}
function renderPlans() {
  if (document.querySelector(".plans")) return;
  const courses = document.querySelector(".courses");
  if (!courses) return;
  courses.insertAdjacentHTML(
    "afterend",
    `<section class="plans reveal"><div class="plans-head"><p class="eyebrow">03 / TRAINING TIERS</p><h2>Выбери<br><i>свой класс.</i></h2></div><div class="plan-grid"><article class="plan plan-basic"><p class="plan-label">01 / BASE</p><h3>STANDARD</h3><div class="plan-price">от 59 000 <small>₸</small></div><ul><li>Теория ПДД онлайн</li><li>Hyundai Accent / МКПП</li><li>Базовые маршруты</li></ul><a href="#booking" class="plan-action">Выбрать Standard →</a></article><article class="plan plan-main"><p class="plan-label">02 / MOST CHOSEN</p><span class="plan-orbit"></span><h3>DRIVE<br>PLUS</h3><div class="plan-price">от 84 000 <small>₸</small></div><ul><li>Полный курс теория + практика</li><li>АКПП: Elantra, Cerato, Corolla</li><li>Личный трек занятий</li><li>Инструктор с опытом 7+ лет</li></ul><a href="#booking" class="plan-action">Начать Drive Plus →</a></article><article class="plan plan-pro"><p class="plan-label">03 / SIGNATURE</p><h3>PRIVATE</h3><div class="plan-price">от 129 000 <small>₸</small></div><ul><li>Индивидуальная программа</li><li>Kia K5 / Tucson / АКПП</li><li>Приоритетное расписание</li><li>Профессиональный наставник</li></ul><a href="#booking" class="plan-action">Выбрать Private →</a></article></div></section>`,
  );
}
async function validateLogin() {
  if (!token()) return;
  try {
    const d = await api("/me");
    state.user = d.user;
    localStorage.setItem("drive_user", JSON.stringify(d.user));
    refreshUser();
  } catch {
    localStorage.removeItem("drive_token");
    localStorage.removeItem("drive_user");
    state.user = null;
    refreshUser();
  }
}
function esc(s = "") {
  return String(s).replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}
function wa(text = "Здравствуйте! Хочу узнать об обучении в DriveSchool.") {
  return "https://wa.me/77051211473?text=" + encodeURIComponent(text);
}
function renderCars(filter = "all") {
  const cars =
    filter === "all"
      ? state.cars
      : state.cars.filter((c) => c.transmission === filter);
  $("#cars").innerHTML =
    cars
      .map(
        (c) =>
          `<article class="car-card"><div class="car-img"><img src="${esc(c.image_url)}" alt="${esc(c.name)}"><span class="car-tag">${esc(c.transmission)}</span></div><div class="car-body"><h3>${esc(c.name)}</h3><span class="car-year">${esc(c.year || "2024")} / LEARNING SPEC</span><p>${esc(c.description)}</p><button class="pick-car" data-pick="${c.id}">Выбрать этот автомобиль →</button></div></article>`,
      )
      .join("") || "<p>Автомобили скоро появятся.</p>";
  document.querySelectorAll("[data-pick]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#bookingCar").value = b.dataset.pick;
        $("#booking").scrollIntoView({ behavior: "smooth" });
      }),
  );
}
function renderCarSelect() {
  $("#bookingCar").innerHTML =
    '<option value="">Выберите машину</option>' +
    state.cars
      .map(
        (c) =>
          `<option value="${c.id}">${esc(c.name)} · ${esc(c.transmission)}</option>`,
      )
      .join("");
}
function youtube(url) {
  const m = String(url || "").match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  return m ? "https://www.youtube-nocookie.com/embed/" + m[1] : null;
}
function renderPosts(posts) {
  $("#posts").innerHTML = posts.length
    ? posts
        .map((p, i) => {
          const yt = p.media_type === "video" && youtube(p.media_url);
          const media = p.media_url
            ? `<div class="post-media ${yt ? "post-video" : ""}">${yt ? `<iframe src="${yt}" title="${esc(p.title)}" loading="lazy" allowfullscreen></iframe>` : p.media_type === "video" ? `<video controls src="${esc(p.media_url)}"></video>` : `<img src="${esc(p.media_url)}" alt="${esc(p.title)}">`}</div>`
            : "";
          return `<article class="post post-${i % 3}">${media}<time>${new Date(p.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</time><h3>${esc(p.title)}</h3><p>${esc(p.excerpt || p.content)}</p><span class="post-index">0${i + 1}</span></article>`;
        })
        .join("")
    : "<p>Скоро здесь появятся новости школы.</p>";
}
function open(id) {
  $("#" + id).classList.add("show");
}
function closeAll() {
  document
    .querySelectorAll(".modal")
    .forEach((x) => x.classList.remove("show"));
}
function refreshUser() {
  const b = $("#accountBtn");
  b.textContent = state.user ? "Мой профиль" : "Личный кабинет";
}
async function openAccount() {
  if (!state.user || !token()) return open("authModal");
  $("#profileName").textContent = state.user.name;
  try {
    const list = await api("/me/bookings");
    $("#myBookings").innerHTML = list.length
      ? list
          .map(
            (b) =>
              `<div class="booking-item">${esc(b.car_name)} <span>${new Date(b.lesson_at).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })} · ${esc(b.instructor_name || "Инструктор DriveSchool")} · ${b.status === "new" ? "заявка отправлена" : b.status}</span></div>`,
          )
          .join("")
      : '<p class="form-note">Записей пока нет. Выбери автомобиль и время на главной.</p>';
    open("accountModal");
  } catch (e) {
    if (/Авторизуйтесь|Требуется вход|401/.test(e.message)) {
      localStorage.removeItem("drive_token");
      localStorage.removeItem("drive_user");
      state.user = null;
      refreshUser();
      toast("Сессия закончилась. Войдите снова.");
      return open("authModal");
    }
    toast(e.message);
  }
}
async function init() {
  try {
    const [cars, posts, settings] = await Promise.all([
      api("/cars"),
      api("/posts"),
      api("/settings"),
    ]);
    state.cars = cars;
    renderCars();
    renderCarSelect();
    renderPosts(posts);
    if (settings.accent)
      document.documentElement.style.setProperty("--acid", settings.accent);
    if (settings.phone) {
      const digits = settings.phone.replace(/\D/g, "");
      document
        .querySelectorAll("[data-wa]")
        .forEach((a) => (a.href = "https://wa.me/" + digits));
      $("#phoneLink").href = "https://wa.me/" + digits;
      $("#phoneLink").textContent = settings.phone + " ↗";
    }
  } catch (e) {
    toast("Сервер пока недоступен: " + e.message);
  }
  const saved = localStorage.getItem("drive_user");
  if (saved && token()) {
    try {
      state.user = JSON.parse(saved);
      refreshUser();
    } catch {
      localStorage.removeItem("drive_user");
    }
  } else if (saved) {
    localStorage.removeItem("drive_user");
  }
}
$("#themeBtn").onclick = () => {
  const is = document.body.dataset.theme === "light";
  document.body.dataset.theme = is ? "" : "light";
  localStorage.setItem("drive_theme", is ? "" : "light");
};
if (localStorage.getItem("drive_theme") === "light")
  document.body.dataset.theme = "light";
$("#accountBtn").onclick = openAccount;
document.querySelectorAll(".close").forEach((b) => (b.onclick = closeAll));
document.querySelectorAll(".modal").forEach(
  (m) =>
    (m.onclick = (e) => {
      if (e.target === m) closeAll();
    }),
);
$("#authSwitch").onclick = () => {
  state.authMode = state.authMode === "login" ? "register" : "login";
  const reg = state.authMode === "register";
  $("#authTitle").textContent = reg ? "Создать профиль" : "Вход";
  $("#nameLabel").hidden = !reg;
  $("#authSwitch").textContent = reg
    ? "Уже есть аккаунт? Войти"
    : "Нет аккаунта? Создать";
};
$("#authForm").onsubmit = async (e) => {
  e.preventDefault();
  const isReg = state.authMode === "register";
  try {
    const d = await api("/auth/" + (isReg ? "register" : "login"), {
      method: "POST",
      body: JSON.stringify({
        name: $("#authName").value,
        email: $("#authEmail").value,
        password: $("#authPassword").value,
      }),
    });
    localStorage.setItem("drive_token", d.token);
    localStorage.setItem("drive_user", JSON.stringify(d.user));
    state.user = d.user;
    refreshUser();
    closeAll();
    toast(
      isReg
        ? "Профиль создан. Можно бронировать урок."
        : "С возвращением, " + d.user.name + "!",
    );
  } catch (err) {
    $("#authNote").textContent = err.message;
  }
};
$("#logoutBtn").onclick = () => {
  localStorage.removeItem("drive_token");
  localStorage.removeItem("drive_user");
  state.user = null;
  refreshUser();
  closeAll();
  toast("Вы вышли из аккаунта");
};
document.querySelectorAll(".car-filters button").forEach(
  (b) =>
    (b.onclick = () => {
      document.querySelector(".car-filters .active").classList.remove("active");
      b.classList.add("active");
      renderCars(b.dataset.filter);
    }),
);
$("#bookingForm").onsubmit = async (e) => {
  e.preventDefault();
  if (!state.user || !token()) {
    open("authModal");
    $("#bookingNote").textContent = "Сначала войдите или создайте личный профиль.";
    return toast("Сначала войдите в личный кабинет");
  }
  const car = state.cars.find(
    (item) => String(item.id) === $("#bookingCar").value,
  );
  const lessonAt = $("#bookingTime").value;
  const instructorName = $("#bookingInstructor").value;
  if (!car || !lessonAt)
    return ($("#bookingNote").textContent =
      "Выберите автомобиль и удобную дату / время.");
  const submit = $("#bookingForm button[type=submit]");
  try {
    submit.disabled = true;
    submit.innerHTML = "Сохраняем запись…";
    await api("/bookings", {
      method: "POST",
      body: JSON.stringify({
        carId: Number(car.id),
        lessonAt,
        instructorName,
      }),
    });
    const date = new Date(lessonAt).toLocaleString("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const message = `Здравствуйте! Хочу записаться в DriveSchool.\n\nИмя: ${state.user.name}\nМашина: ${car.name}\nИнструктор: ${instructorName}\nДата и время: ${date}`;
    const whatsappUrl = wa(message);
    $("#bookingNote").innerHTML = `Запись сохранена. Открываем WhatsApp… <a href="${whatsappUrl}">Открыть вручную</a>`;
    $("#bookingForm").reset();
    window.location.href = whatsappUrl;
  } catch (err) {
    $("#bookingNote").textContent = err.message;
    submit.disabled = false;
    submit.innerHTML = "Подтвердить запись <b>→</b>";
  }
};
$("#bookingTime").min = new Date(Date.now() + 3600000)
  .toISOString()
  .slice(0, 16);
document.querySelectorAll("[data-instructor]").forEach((button) => {
  button.addEventListener("click", () => {
    $("#bookingInstructor").value = button.dataset.instructor;
    $("#bookingNote").textContent = `Выбран инструктор: ${button.dataset.instructor}. Теперь выберите автомобиль и время.`;
  });
});
init().then(validateLogin);
const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach(
      (entry) => entry.isIntersecting && entry.target.classList.add("in-view"),
    ),
  { threshold: 0.12 },
);
document
  .querySelectorAll(".reveal")
  .forEach((element) => observer.observe(element));
