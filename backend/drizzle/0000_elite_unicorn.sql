CREATE TABLE `diagram_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`diagram_id` text NOT NULL,
	`nodes_json` text NOT NULL,
	`edges_json` text NOT NULL,
	`sticky_notes_json` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`diagram_id`) REFERENCES `diagrams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `diagrams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`region` text DEFAULT 'us-east-1' NOT NULL,
	`billing_model` text DEFAULT 'ondemand' NOT NULL,
	`nodes_json` text DEFAULT '[]' NOT NULL,
	`edges_json` text DEFAULT '[]' NOT NULL,
	`sticky_notes_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pricing_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`service` text NOT NULL,
	`region` text NOT NULL,
	`data_json` text NOT NULL,
	`fetched_at` text DEFAULT (datetime('now')) NOT NULL,
	`ttl_hours` integer DEFAULT 24 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pricing_cache_service_region_idx` ON `pricing_cache` (`service`,`region`);