-- Repair seed auth users so signInWithPassword works (users + identities).
-- Safe to run multiple times. Does not touch application tables.

-- GoTrue cannot scan NULL token columns (must be empty strings).
update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, '')
where email like 'seed%@aspio.io';

do $$
declare
  pw text := 'SeedPass123!';
  app_meta jsonb := '{"provider":"email","providers":["email"]}'::jsonb;
  seed record;
begin
  for seed in
    select *
    from (
      values
        ('11111111-1111-1111-1111-111111111111'::uuid, 'seed1@aspio.io'),
        ('22222222-2222-2222-2222-222222222222'::uuid, 'seed2@aspio.io'),
        ('33333333-3333-3333-3333-333333333333'::uuid, 'seed3@aspio.io'),
        ('44444444-4444-4444-4444-444444444444'::uuid, 'seed4@aspio.io')
    ) as s(id, email)
  loop
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      seed.id,
      'authenticated',
      'authenticated',
      seed.email,
      crypt(pw, gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      app_meta,
      '{}'::jsonb,
      now(),
      now()
    )
    on conflict (id) do update set
      instance_id = excluded.instance_id,
      aud = excluded.aud,
      role = excluded.role,
      email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
      confirmation_token = '',
      recovery_token = '',
      email_change = '',
      email_change_token_new = '',
      raw_app_meta_data = excluded.raw_app_meta_data,
      updated_at = now();

    delete from auth.identities
    where user_id = seed.id and provider = 'email';

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      seed.id,
      seed.id,
      jsonb_build_object('sub', seed.id::text, 'email', seed.email),
      'email',
      seed.id::text,
      now(),
      now(),
      now()
    );
  end loop;
end $$;
