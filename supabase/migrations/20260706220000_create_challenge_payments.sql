create table if not exists challenge_payments (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe', 'paypal')),
  provider_event_id text,
  provider_payment_id text,
  amount_cents integer not null,
  currency text not null default 'EUR',
  amount_eur_cents integer not null,
  status text not null default 'confirmed',
  package_id text,
  public_note text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists challenge_payments_provider_payment_id_idx
on challenge_payments(provider, provider_payment_id)
where provider_payment_id is not null;

create unique index if not exists challenge_payments_provider_event_id_idx
on challenge_payments(provider, provider_event_id)
where provider_event_id is not null;
