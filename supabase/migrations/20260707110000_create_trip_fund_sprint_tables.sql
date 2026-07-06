create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe','paypal')),
  provider_ref text not null,
  amount_cents integer not null,
  currency text not null default 'eur',
  package text not null check (package in ('25','50','100')),
  status text not null default 'pending'
    check (status in ('pending','completed','failed','refunded')),
  display_label text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  unique (provider, provider_ref)
);

create table if not exists task_requests (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references payments(id) not null,
  contact_email text,
  contact_telegram text,
  task_description text not null,
  status text not null default 'new'
    check (status in ('new','in_progress','done')),
  admin_notes text,
  created_at timestamptz not null default now()
);

create index if not exists payments_status_created_at_idx
on payments(status, created_at desc);

create index if not exists payments_public_feed_idx
on payments(status, is_public, created_at desc);

create index if not exists task_requests_status_created_at_idx
on task_requests(status, created_at desc);
