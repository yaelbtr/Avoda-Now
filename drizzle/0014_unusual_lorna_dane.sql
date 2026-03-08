CREATE TABLE `notification_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`employerPhone` varchar(20) NOT NULL,
	`pendingCount` int NOT NULL DEFAULT 0,
	`scheduledAt` timestamp NOT NULL,
	`sentAt` timestamp,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notification_batches` ADD CONSTRAINT `notification_batches_jobId_jobs_id_fk` FOREIGN KEY (`jobId`) REFERENCES `jobs`(`id`) ON DELETE no action ON UPDATE no action;