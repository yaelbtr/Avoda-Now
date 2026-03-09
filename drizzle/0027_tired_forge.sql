ALTER TABLE `users` ADD `workerRating` decimal(3,2);--> statement-breakpoint
ALTER TABLE `users` ADD `completedJobsCount` int DEFAULT 0 NOT NULL;