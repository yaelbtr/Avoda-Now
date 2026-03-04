ALTER TABLE `jobs` ADD `reminderSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `closedReason` enum('found_worker','expired','manual');