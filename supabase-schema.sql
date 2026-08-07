-- K' Space 云端同步建表脚本
-- 用法：Supabase 控制台 → SQL Editor → 新建查询 → 粘贴全部 → Run
-- 说明：每张表存一类业务数据；data 字段用 jsonb 存放整条记录，便于前端直接读写。
--       user_id 用于隔离不同账号的数据，并配合 RLS 做权限控制。

-- ===== 9 张业务表（结构一致） =====
create table if not exists weight (
  id text primary key,
  user_id uuid not null,
  data jsonb not null,
  created_at timestamptz default now()
);
create table if not exists food (
  id text primary key,
  user_id uuid not null,
  data jsonb not null,
  created_at timestamptz default now()
);
create table if not exists exercise (
  id text primary key,
  user_id uuid not null,
  data jsonb not null,
  created_at timestamptz default now()
);
create table if not exists period (
  id text primary key,
  user_id uuid not null,
  data jsonb not null,
  created_at timestamptz default now()
);
create table if not exists todo (
  id text primary key,
  user_id uuid not null,
  data jsonb not null,
  created_at timestamptz default now()
);
create table if not exists journal (
  id text primary key,
  user_id uuid not null,
  data jsonb not null,
  created_at timestamptz default now()
);
create table if not exists supp (
  id text primary key,
  user_id uuid not null,
  data jsonb not null,
  created_at timestamptz default now()
);
create table if not exists med (
  id text primary key,
  user_id uuid not null,
  data jsonb not null,
  created_at timestamptz default now()
);
create table if not exists steps (
  id text primary key,
  user_id uuid not null,
  data jsonb not null,
  created_at timestamptz default now()
);

-- ===== 设置表（每账号一行，user_id 即主键） =====
create table if not exists settings (
  user_id uuid primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- ===== 行级安全（RLS）：只让自己看/改自己的数据 =====
-- 启用 RLS 后，必须通过登录令牌（Authorization: Bearer）才能访问，且只能碰 user_id = 自己 的行。
alter table weight enable row level security;
alter table food enable row level security;
alter table exercise enable row level security;
alter table period enable row level security;
alter table todo enable row level security;
alter table journal enable row level security;
alter table supp enable row level security;
alter table med enable row level security;
alter table steps enable row level security;
alter table settings enable row level security;

-- 为每张表创建「仅本人」策略（select/insert/update/delete 都限定 user_id = auth.uid()）
do $$
declare t text;
begin
  foreach t in array array['weight','food','exercise','period','todo','journal','supp','med','steps','settings']
  loop
    execute format('drop policy if exists own_%1$s on %1$s;', t);
    execute format('create policy own_%1$s on %1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;
