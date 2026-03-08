ALTER TABLE `jobs` ADD `jobLocationMode` enum('city','radius') DEFAULT 'radius';--> statement-breakpoint
ALTER TABLE `jobs` ADD `jobSearchRadiusKm` int DEFAULT 5;--> statement-breakpoint
ALTER TABLE `jobs` ADD `hourlyRate` decimal(10,2);--> statement-breakpoint
ALTER TABLE `users` ADD `locationMode` enum('city','radius') DEFAULT 'city';--> statement-breakpoint
ALTER TABLE `users` ADD `workerLatitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `users` ADD `workerLongitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `users` ADD `searchRadiusKm` int DEFAULT 5;--> statement-breakpoint
ALTER TABLE `users` ADD `preferenceText` text;