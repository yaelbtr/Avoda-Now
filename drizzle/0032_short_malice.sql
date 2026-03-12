CREATE TABLE `region_notification_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`region_id` int NOT NULL,
	`type` enum('worker','employer') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `region_notification_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_user_region_notif` UNIQUE(`user_id`,`region_id`)
);
--> statement-breakpoint
ALTER TABLE `region_notification_requests` ADD CONSTRAINT `region_notification_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `region_notification_requests` ADD CONSTRAINT `region_notification_requests_region_id_regions_id_fk` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE cascade ON UPDATE no action;