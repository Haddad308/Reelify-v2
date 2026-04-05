-- Drop the foreign key constraint on approved_user_id so we can store
-- a pre-generated UUID before the user row is created in the users table.
alter table demo_requests drop constraint if exists demo_requests_approved_user_id_fkey;
