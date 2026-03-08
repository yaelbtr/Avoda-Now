CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`workerId` int NOT NULL,
	`status` enum('pending','viewed','accepted','rejected') NOT NULL DEFAULT 'pending',
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `showPhone` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_jobId_jobs_id_fk` FOREIGN KEY (`jobId`) REFERENCES `jobs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_workerId_users_id_fk` FOREIGN KEY (`workerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;