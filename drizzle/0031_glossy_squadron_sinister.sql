CREATE TABLE `worker_regions` (
	`worker_id` int NOT NULL,
	`region_id` int NOT NULL,
	`distance_km` decimal(8,3),
	`match_type` enum('gps_radius','preferred_city') NOT NULL DEFAULT 'gps_radius',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `worker_regions_worker_id_region_id_pk` PRIMARY KEY(`worker_id`,`region_id`)
);
--> statement-breakpoint
ALTER TABLE `regions` ADD `radiusMinutes` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `worker_regions` ADD CONSTRAINT `worker_regions_worker_id_users_id_fk` FOREIGN KEY (`worker_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `worker_regions` ADD CONSTRAINT `worker_regions_region_id_regions_id_fk` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE cascade ON UPDATE no action;