-- Add new fields to demo_requests table
alter table demo_requests add column if not exists job_title text not null default '';
alter table demo_requests add column if not exists company_name text not null default '';
alter table demo_requests add column if not exists source text not null default 'Demo Request';
alter table demo_requests add column if not exists priority text not null default 'low';
alter table demo_requests add column if not exists credits_min integer not null default 180;
alter table demo_requests add column if not exists approved_user_id uuid references users(id) on delete set null;
