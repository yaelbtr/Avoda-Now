CREATE TABLE `phone_change_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`oldPhone` varchar(20),
	`newPhone` varchar(20),
	`ipAddress` varchar(45),
	`result` enum('success','failed','locked') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `phone_change_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `phone_change_logs` ADD CONSTRAINT `phone_change_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;