CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 email VARCHAR(254) NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 auth_version BIGINT NOT NULL DEFAULT 0 CHECK (auth_version >= 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uk_users_email UNIQUE (email),
 CONSTRAINT ck_users_email_normalized CHECK (email = lower(btrim(email)))
);

CREATE TABLE app.links (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL,
 short_code VARCHAR(10) COLLATE "C" NOT NULL,
 original_url TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 click_count BIGINT NOT NULL DEFAULT 0 CHECK (click_count >= 0),
 last_clicked_at TIMESTAMPTZ NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uk_links_short_code UNIQUE (short_code),
 CONSTRAINT ck_links_code_alphabet CHECK (short_code ~ '^[A-Za-z0-9]+$'),
 CONSTRAINT fk_links_user FOREIGN KEY (user_id) REFERENCES app.users(id)
  ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX idx_links_user_created ON app.links(user_id, created_at);

