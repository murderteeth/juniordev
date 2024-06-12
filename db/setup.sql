CREATE TABLE IF NOT EXISTS chat (
  id int8 PRIMARY KEY,
  github_repo_owner text NULL,
  github_repo_name text NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
