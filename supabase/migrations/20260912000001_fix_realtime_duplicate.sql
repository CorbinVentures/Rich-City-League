-- Fix: Remove duplicate realtime publication of notifications table
-- The notifications table was added to realtime in two migrations;
-- this caused migration replay to fail.

drop publication if exists realtime_notifications;

create publication realtime_notifications
  for table notifications;

alter publication realtime add table notifications;
