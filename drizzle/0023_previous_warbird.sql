CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`city_code` int,
	`name_he` text NOT NULL,
	`name_en` text,
	`district` varchar(100),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `cities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `preferredCities` json;