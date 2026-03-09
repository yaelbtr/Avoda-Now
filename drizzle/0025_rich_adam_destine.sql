CREATE TABLE `phone_prefixes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prefix` varchar(5) NOT NULL,
	`description` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `phone_prefixes_id` PRIMARY KEY(`id`),
	CONSTRAINT `phone_prefixes_prefix_unique` UNIQUE(`prefix`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phonePrefix` varchar(5);--> statement-breakpoint
ALTER TABLE `users` ADD `phoneNumber` varchar(7);