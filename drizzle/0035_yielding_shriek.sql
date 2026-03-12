ALTER TABLE `jobs` ADD `jobDate` varchar(10);--> statement-breakpoint
ALTER TABLE `jobs` ADD `workStartTime` varchar(5);--> statement-breakpoint
ALTER TABLE `jobs` ADD `workEndTime` varchar(5);--> statement-breakpoint
ALTER TABLE `jobs` ADD `imageUrls` json;