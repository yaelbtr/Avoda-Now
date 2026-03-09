CREATE TABLE `worker_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` int NOT NULL,
	`employerId` int NOT NULL,
	`applicationId` int,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `worker_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `worker_ratings_employer_worker_idx` UNIQUE(`employerId`,`workerId`)
);
--> statement-breakpoint
ALTER TABLE `worker_ratings` ADD CONSTRAINT `worker_ratings_workerId_users_id_fk` FOREIGN KEY (`workerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `worker_ratings` ADD CONSTRAINT `worker_ratings_employerId_users_id_fk` FOREIGN KEY (`employerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;