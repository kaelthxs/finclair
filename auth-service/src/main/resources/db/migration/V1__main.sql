CREATE TABLE roles
(
    id   UUID         NOT NULL,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT pk_roles PRIMARY KEY (id)
);

CREATE TABLE users
(
    id                 UUID         NOT NULL,
    login              VARCHAR(255) NOT NULL,
    email              VARCHAR(255) NOT NULL,
    password           VARCHAR(255) NOT NULL,
    first_name         VARCHAR(255),
    last_name          VARCHAR(255),
    avatar_url         VARCHAR(255),
    is_email_verified  BOOLEAN,
    created_at         TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    last_login_at      TIMESTAMP WITHOUT TIME ZONE,
    preferred_language VARCHAR(255),
    role_id            UUID         NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id)
);

ALTER TABLE roles
    ADD CONSTRAINT uc_roles_name UNIQUE (name);

ALTER TABLE users
    ADD CONSTRAINT uc_users_email UNIQUE (email);

ALTER TABLE users
    ADD CONSTRAINT uc_users_login UNIQUE (login);

ALTER TABLE users
    ADD CONSTRAINT FK_USERS_ON_ROLE FOREIGN KEY (role_id) REFERENCES roles (id);

INSERT INTO roles(id, name) VALUES (gen_random_uuid(), 'USER');
INSERT INTO roles(id, name) VALUES (gen_random_uuid(), 'ADMIN');
