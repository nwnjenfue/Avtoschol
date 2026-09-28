require("dotenv").config();
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { Pool } = require("pg");
const app = express();
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "avto",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
});
const secret = process.env.JWT_SECRET || "change-this-before-production";
app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "uploads"),
    filename: (_req, file, done) =>
      done(
        null,
        `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, done) =>
    done(null, /^image\/|^video\//.test(file.mimetype)),
});
const token = (user) => jwt.sign({ id: user.id }, secret, { expiresIn: "7d" });
const viewUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  isAdmin: u.is_admin,
});
function auth(req, res, next) {
  try {
    req.user = jwt.verify(
      (req.headers.authorization || "").replace("Bearer ", ""),
      secret,
    );
    next();
  } catch {
    res.status(401).json({ message: "Авторизуйтесь, чтобы продолжить" });
  }
}
async function admin(req, res, next) {
  const { rows } = await pool.query("SELECT is_admin FROM users WHERE id=$1", [
    req.user.id,
  ]);
  if (!rows[0]?.is_admin)
    return res.status(403).json({ message: "Нужны права администратора" });
  next();
}
const secure = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(err);
    res.status(500).json({ message: "Ошибка сервера" });
  });

app.get(
  "/api/health",
  secure(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  }),
);
app.post(
  "/api/auth/register",
  secure(async (req, res) => {
    const { name, email, password } = req.body;
    if (
      !name?.trim() ||
      !/^\S+@\S+\.\S+$/.test(email || "") ||
      String(password || "").length < 6
    )
      return res
        .status(400)
        .json({
          message: "Введите имя, корректный e-mail и пароль от 6 символов",
        });
    try {
      const { rows } = await pool.query(
        "INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING *",
        [
          name.trim(),
          email.toLowerCase().trim(),
          await bcrypt.hash(password, 12),
        ],
      );
      res.status(201).json({ user: viewUser(rows[0]), token: token(rows[0]) });
    } catch (err) {
      if (err.code === "23505")
        return res
          .status(409)
          .json({
            message:
              "Этот e-mail уже зарегистрирован. Войдите через форму входа.",
          });
      throw err;
    }
  }),
);
app.post(
  "/api/auth/login",
  secure(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [
      String(req.body.email || "")
        .toLowerCase()
        .trim(),
    ]);
    const user = rows[0];
    if (
      !user ||
      !(await bcrypt.compare(req.body.password || "", user.password_hash))
    )
      return res.status(401).json({ message: "Неверный e-mail или пароль" });
    res.json({ user: viewUser(user), token: token(user) });
  }),
);
app.get(
  "/api/me",
  auth,
  secure(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [
      req.user.id,
    ]);
    if (!rows[0])
      return res
        .status(401)
        .json({ message: "Сессия завершена. Войдите снова." });
    res.json({ user: viewUser(rows[0]) });
  }),
);
app.get(
  "/api/cars",
  secure(async (_req, res) =>
    res.json(
      (await pool.query("SELECT * FROM cars WHERE active=true ORDER BY id"))
        .rows,
    ),
  ),
);
app.get(
  "/api/posts",
  secure(async (_req, res) =>
    res.json(
      (
        await pool.query(
          "SELECT * FROM posts WHERE published=true ORDER BY created_at DESC",
        )
      ).rows,
    ),
  ),
);
app.get(
  "/api/settings",
  secure(async (_req, res) =>
    res.json(
      Object.fromEntries(
        (await pool.query("SELECT * FROM site_settings")).rows.map((x) => [
          x.key,
          x.value,
        ]),
      ),
    ),
  ),
);
app.get(
  "/api/me/bookings",
  auth,
  secure(async (req, res) =>
    res.json(
      (
        await pool.query(
          "SELECT b.*,c.name car_name FROM bookings b JOIN cars c ON c.id=b.car_id WHERE b.user_id=$1 ORDER BY lesson_at",
          [req.user.id],
        )
      ).rows,
    ),
  ),
);
app.post(
  "/api/bookings",
  auth,
  secure(async (req, res) => {
    const { carId, lessonAt, instructorName } = req.body;
    if (!carId || !lessonAt || Number.isNaN(Date.parse(lessonAt)))
      return res.status(400).json({ message: "Выберите автомобиль и время" });
    try {
      const { rows } = await pool.query(
        "INSERT INTO bookings(user_id,car_id,lesson_at,instructor_name) VALUES($1,$2,$3,$4) RETURNING *",
        [req.user.id, carId, lessonAt, instructorName || null],
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      if (e.code === "23505")
        return res
          .status(409)
          .json({ message: "Это время уже занято. Выберите другой слот." });
      throw e;
    }
  }),
);
app.post(
  "/api/admin/upload",
  auth,
  admin,
  upload.single("media"),
  (req, res) => {
    if (!req.file)
      return res
        .status(400)
        .json({ message: "Выберите файл изображения или видео до 50 МБ" });
    res
      .status(201)
      .json({
        mediaUrl: `/uploads/${req.file.filename}`,
        mediaType: req.file.mimetype.startsWith("video/") ? "video" : "image",
      });
  },
);
app.post(
  "/api/admin/posts",
  auth,
  admin,
  secure(async (req, res) => {
    const { title, excerpt, content, mediaUrl, mediaType } = req.body;
    if (!title?.trim() || !content?.trim())
      return res.status(400).json({ message: "Добавьте заголовок и текст" });
    const { rows } = await pool.query(
      "INSERT INTO posts(title,excerpt,content,media_url,media_type) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [
        title.trim(),
        excerpt || "",
        content.trim(),
        mediaUrl || null,
        mediaType === "video" ? "video" : "image",
      ],
    );
    res.status(201).json(rows[0]);
  }),
);
app.put(
  "/api/admin/posts/:id",
  auth,
  admin,
  secure(async (req, res) => {
    const { title, excerpt, content, mediaUrl, mediaType, published } =
      req.body;
    const { rows } = await pool.query(
      "UPDATE posts SET title=$1,excerpt=$2,content=$3,media_url=$4,media_type=$5,published=$6,updated_at=NOW() WHERE id=$7 RETURNING *",
      [
        title,
        excerpt || "",
        content,
        mediaUrl || null,
        mediaType === "video" ? "video" : "image",
        published !== false,
        req.params.id,
      ],
    );
    if (!rows[0]) return res.status(404).json({ message: "Пост не найден" });
    res.json(rows[0]);
  }),
);
app.delete(
  "/api/admin/posts/:id",
  auth,
  admin,
  secure(async (req, res) => {
    await pool.query("DELETE FROM posts WHERE id=$1", [req.params.id]);
    res.status(204).end();
  }),
);
app.put(
  "/api/admin/settings",
  auth,
  admin,
  secure(async (req, res) => {
    for (const [key, value] of Object.entries(req.body)) {
      if (["accent", "phone"].includes(key))
        await pool.query(
          "INSERT INTO site_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",
          [key, String(value)],
        );
    }
    res.json({ ok: true });
  }),
);
async function init() {
  await pool.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE",
  );
  await pool.query(
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS instructor_name VARCHAR(120)",
  );
  await pool.query(
    "UPDATE cars SET active=false WHERE name IN ('Kia Cerato','Toyota Corolla','Hyundai Tucson')",
  );
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await pool.query(
      "INSERT INTO users(name,email,password_hash,is_admin) VALUES($1,$2,$3,true) ON CONFLICT(email) DO UPDATE SET is_admin=true",
      [
        "Администратор DriveSchool",
        process.env.ADMIN_EMAIL.toLowerCase(),
        await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
      ],
    );
  }
  const posts = [
    [
      "Ночной город: как читать поток",
      "Маршрут не нужно бояться — его нужно видеть на два шага вперёд.",
      "Разбираем, как держать дистанцию, прогнозировать манёвры других водителей и сохранять спокойствие в вечернем потоке.",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85",
      "image",
    ],
    [
      "Парковка без паники",
      "Три ориентира, которые превратят парковку в понятную последовательность действий.",
      "На практике отрабатываем параллельную парковку и заезд в бокс на реальных городских площадках.",
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=85",
      "image",
    ],
  ];
  for (const p of posts)
    await pool.query(
      "INSERT INTO posts(title,excerpt,content,media_url,media_type) SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS(SELECT 1 FROM posts WHERE title=$6)",
      [...p, p[0]],
    );
}
init()
  .then(() =>
    app.listen(process.env.PORT || 3001, () =>
      console.log(
        "DriveSchool: http://localhost:" + (process.env.PORT || 3001),
      ),
    ),
  )
  .catch((e) => {
    console.error("Не удалось подключить PostgreSQL:", e.message);
    process.exit(1);
  });
