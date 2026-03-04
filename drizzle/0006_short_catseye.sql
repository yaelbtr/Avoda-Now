CREATE TABLE `worker_availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`city` varchar(100),
	`note` varchar(200),
	`availableUntil` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `worker_availability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobs` MODIFY COLUMN `activeDuration` enum('1','3','7') NOT NULL DEFAULT '1';--> statement-breakpoint
ALTER TABLE `jobs` ADD `isUrgent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `worker_availability` ADD CONSTRAINT `worker_availability_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;