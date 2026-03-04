CREATE TABLE `job_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`reporterPhone` varchar(20),
	`reporterIp` varchar(45),
	`reason` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobs` MODIFY COLUMN `status` enum('active','closed','expired','under_review') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `jobs` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `jobs` ADD `activeDuration` enum('1','3','7') DEFAULT '7' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `reportCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `jobTags` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `users` ADD `workerTags` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `job_reports` ADD CONSTRAINT `job_reports_jobId_jobs_id_fk` FOREIGN KEY (`jobId`) REFERENCES `jobs`(`id`) ON DELETE no action ON UPDATE no action;