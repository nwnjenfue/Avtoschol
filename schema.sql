CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cars (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  transmission VARCHAR(10) NOT NULL CHECK (transmission IN ('АКПП','МКПП')),
  year SMALLINT, image_url TEXT, description TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id BIGINT NOT NULL REFERENCES cars(id),
  instructor_name VARCHAR(120),
  lesson_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','confirmed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(car_id, lesson_at)
);

CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL, excerpt TEXT NOT NULL DEFAULT '', content TEXT NOT NULL,
  media_url TEXT, media_type VARCHAR(10) NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(80) PRIMARY KEY, value TEXT NOT NULL
);

INSERT INTO cars (name, transmission, year, image_url, description) VALUES
('Hyundai Elantra', 'АКПП', 2024, 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=85', 'Тёмный графит, мягкий автомат, камера заднего вида и дублирующие педали.'),
('Kia K5', 'АКПП', 2024, 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=85', 'Белый кузов, премиальный комфорт и максимальная уверенность на городском маршруте.'),
('Hyundai Accent', 'МКПП', 2023, 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=85', 'Точная механика для тех, кто хочет чувствовать автомобиль полностью.')
ON CONFLICT DO NOTHING;

INSERT INTO site_settings (key, value) VALUES ('accent', '#C7FF3E'), ('phone', '+77051211473') ON CONFLICT (key) DO NOTHING;
