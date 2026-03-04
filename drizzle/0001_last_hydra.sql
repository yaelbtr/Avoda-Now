CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`category` enum('delivery','warehouse','agriculture','kitchen','cleaning','security','construction','childcare','eldercare','retail','events','volunteer','other') NOT NULL,
	`address` varchar(300) NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`salary` decimal(10,2),
	`salaryType` enum('hourly','daily','monthly','volunteer') NOT NULL DEFAULT 'hourly',
	`contactPhone` varchar(20) NOT NULL,
	`contactName` varchar(100) NOT NULL,
	`businessName` varchar(200),
	`workingHours` varchar(100),
	`startTime` enum('today','tomorrow','this_week','flexible') NOT NULL DEFAULT 'flexible',
	`workersNeeded` int NOT NULL DEFAULT 1,
	`postedBy` int,
	`status` enum('active','closed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`code` varchar(6) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_postedBy_users_id_fk` FOREIGN KEY (`postedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;