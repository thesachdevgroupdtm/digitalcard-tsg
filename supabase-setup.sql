-- Enable RLS
-- Create tables if not exists

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text,
  slug text unique,
  designation text,
  phone text,
  email text,
  photo text,
  about text,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade not null,
  type text not null,
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade not null,
  type text not null, -- 'pdf' or 'video'
  file_url text not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade not null,
  name text not null,
  description text,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade not null,
  name text not null,
  phone text,
  email text,
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists analytics (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade not null,
  event_type text not null, -- 'view', 'click', 'share'
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table employees enable row level security;
alter table links enable row level security;
alter table resources enable row level security;
alter table products enable row level security;
alter table leads enable row level security;
alter table analytics enable row level security;

-- ==========================================
-- Policies for employees
-- ==========================================
drop policy if exists "Public read employees" on employees;
create policy "Public read employees" on employees for select using (true);

drop policy if exists "Users can update own employee profile" on employees;
create policy "Users can update own employee profile" on employees for update using (auth.uid() = user_id);

drop policy if exists "Users can insert own employee profile" on employees;
create policy "Users can insert own employee profile" on employees for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own employee profile" on employees;
create policy "Users can delete own employee profile" on employees for delete using (auth.uid() = user_id);


-- ==========================================
-- Policies for links
-- ==========================================
drop policy if exists "Public read links" on links;
create policy "Public read links" on links for select using (true);

drop policy if exists "Users can insert own links" on links;
create policy "Users can insert own links" on links for insert with check (
  exists (select 1 from employees where id = links.employee_id and user_id = auth.uid())
);

drop policy if exists "Users can update own links" on links;
create policy "Users can update own links" on links for update using (
  exists (select 1 from employees where id = links.employee_id and user_id = auth.uid())
);

drop policy if exists "Users can delete own links" on links;
create policy "Users can delete own links" on links for delete using (
  exists (select 1 from employees where id = links.employee_id and user_id = auth.uid())
);


-- ==========================================
-- Policies for resources
-- ==========================================
drop policy if exists "Public read resources" on resources;
create policy "Public read resources" on resources for select using (true);

drop policy if exists "Users can insert own resources" on resources;
create policy "Users can insert own resources" on resources for insert with check (
  exists (select 1 from employees where id = resources.employee_id and user_id = auth.uid())
);

drop policy if exists "Users can update own resources" on resources;
create policy "Users can update own resources" on resources for update using (
  exists (select 1 from employees where id = resources.employee_id and user_id = auth.uid())
);

drop policy if exists "Users can delete own resources" on resources;
create policy "Users can delete own resources" on resources for delete using (
  exists (select 1 from employees where id = resources.employee_id and user_id = auth.uid())
);


-- ==========================================
-- Policies for products
-- ==========================================
drop policy if exists "Public read products" on products;
create policy "Public read products" on products for select using (true);

drop policy if exists "Users can insert own products" on products;
create policy "Users can insert own products" on products for insert with check (
  exists (select 1 from employees where id = products.employee_id and user_id = auth.uid())
);

drop policy if exists "Users can update own products" on products;
create policy "Users can update own products" on products for update using (
  exists (select 1 from employees where id = products.employee_id and user_id = auth.uid())
);

drop policy if exists "Users can delete own products" on products;
create policy "Users can delete own products" on products for delete using (
  exists (select 1 from employees where id = products.employee_id and user_id = auth.uid())
);


-- ==========================================
-- Policies for leads
-- ==========================================
drop policy if exists "Public can insert leads" on leads;
create policy "Public can insert leads" on leads for insert with check (true);

drop policy if exists "Users can read own leads" on leads;
create policy "Users can read own leads" on leads for select using (
  exists (select 1 from employees where id = leads.employee_id and user_id = auth.uid())
);

drop policy if exists "Users can delete own leads" on leads;
create policy "Users can delete own leads" on leads for delete using (
  exists (select 1 from employees where id = leads.employee_id and user_id = auth.uid())
);


-- ==========================================
-- Policies for analytics
-- ==========================================
drop policy if exists "Public can insert analytics" on analytics;
create policy "Public can insert analytics" on analytics for insert with check (true);

drop policy if exists "Users can read own analytics" on analytics;
create policy "Users can read own analytics" on analytics for select using (
  exists (select 1 from employees where id = analytics.employee_id and user_id = auth.uid())
);

drop policy if exists "Users can delete own analytics" on analytics;
create policy "Users can delete own analytics" on analytics for delete using (
  exists (select 1 from employees where id = analytics.employee_id and user_id = auth.uid())
);
