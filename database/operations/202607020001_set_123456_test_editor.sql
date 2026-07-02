-- 修改历史
-- | 版本 | 日期 | 作者 | 说明 |
-- |------|------|------|------|
-- | v0.1 | 2026-07-02 | liuxiaoke | 创建本地执行脚本，将 123456@test.com 设置为 Blackhorse_Fencing_Club editor |

\set target_email '123456@test.com'
\set target_org_slug 'Blackhorse_Fencing_Club'
\set target_role 'editor'

begin;

select id as target_user_id
from auth.users
where email = :'target_email'
\gset

\if :{?target_user_id}
\else
  \echo auth user not found: :target_email
  rollback;
  \quit 1
\endif

select id as target_org_id
from organizations
where slug = :'target_org_slug'
\gset

\if :{?target_org_id}
\else
  \echo organization not found: :target_org_slug
  rollback;
  \quit 1
\endif

insert into organization_members (organization_id, user_id, role)
values (
  :'target_org_id',
  :'target_user_id',
  :'target_role'
)
on conflict (organization_id, user_id)
do update set role = excluded.role;

select
  auth.users.email,
  organizations.slug as organization_slug,
  organization_members.role
from organization_members
join auth.users on auth.users.id = organization_members.user_id
join organizations on organizations.id = organization_members.organization_id
where auth.users.email = :'target_email'
  and organizations.slug = :'target_org_slug';

commit;
