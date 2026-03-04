CREATE TABLE `otp_rate_limit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`ip` varchar(45),
	`sendCount` int NOT NULL DEFAULT 1,
	`verifyAttempts` int NOT NULL DEFAULT 0,
	`windowStart` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `otp_rate_limit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `otp_codes`;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_phone_unique` UNIQUE(`phone`);