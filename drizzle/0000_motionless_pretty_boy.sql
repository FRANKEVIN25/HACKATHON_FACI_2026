CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`consultation` text NOT NULL,
	`question` integer NOT NULL,
	`value` text NOT NULL,
	`method` text NOT NULL,
	`clip` text,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`patient` text,
	`status` text DEFAULT 'active' NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`help` integer DEFAULT 0 NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consultations_code_unique` ON `consultations` (`code`);--> statement-breakpoint
CREATE TABLE `question_videos` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`question` integer NOT NULL,
	`key` text NOT NULL
);
