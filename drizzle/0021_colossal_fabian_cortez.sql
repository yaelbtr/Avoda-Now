ALTER TABLE `users` ADD `expectedHourlyRate` decimal(8,2);--> statement-breakpoint
ALTER TABLE `users` ADD `availabilityStatus` enum('available_now','available_today','available_hours','not_available');--> statement-breakpoint
ALTER TABLE `users` ADD `signupCompleted` boolean DEFAULT false NOT NULL;