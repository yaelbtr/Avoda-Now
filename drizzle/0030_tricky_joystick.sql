CREATE TABLE `regions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`centerCity` varchar(100) NOT NULL,
	`centerLat` decimal(10,7) NOT NULL,
	`centerLng` decimal(10,7) NOT NULL,
	`activationRadiusKm` int NOT NULL DEFAULT 15,
	`minWorkersRequired` int NOT NULL DEFAULT 50,
	`currentWorkers` int NOT NULL DEFAULT 0,
	`status` enum('collecting_workers','active','paused') NOT NULL DEFAULT 'collecting_workers',
	`description` text,
	`imageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regions_id` PRIMARY KEY(`id`),
	CONSTRAINT `regions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `regionId` int;