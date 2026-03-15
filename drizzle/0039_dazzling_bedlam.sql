CREATE TABLE `user_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`consent_type` enum('terms','privacy','age_18','job_posting_policy','safety_policy','user_content_policy','reviews_policy') NOT NULL,
	`document_version` varchar(32) NOT NULL DEFAULT '2026-03',
	`ip_address` varchar(45),
	`user_agent` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_consents_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_user_consent_type` UNIQUE(`user_id`,`consent_type`)
);
--> statement-breakpoint
ALTER TABLE `user_consents` ADD CONSTRAINT `user_consents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;