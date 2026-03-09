CREATE TABLE `saved_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int NOT NULL,
	`savedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_jobs_user_job_idx` UNIQUE(`userId`,`jobId`)
);
--> statement-breakpoint
ALTER TABLE `saved_jobs` ADD CONSTRAINT `saved_jobs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;