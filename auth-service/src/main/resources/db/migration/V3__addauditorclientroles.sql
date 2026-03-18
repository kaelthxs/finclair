CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO roles(id, name) VALUES (gen_random_uuid(), 'AUDITOR') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles(id, name) VALUES (gen_random_uuid(), 'CLIENT') ON CONFLICT (name) DO NOTHING;
