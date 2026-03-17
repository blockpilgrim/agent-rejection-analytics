CREATE TABLE `agent_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`simulation_run_id` text NOT NULL,
	`buyer_profile_id` text NOT NULL,
	`product_id` text NOT NULL,
	`mandate` text,
	`outcome` text NOT NULL,
	`reason_code` text,
	`reason_summary` text,
	`reasoning_trace` text,
	`product_price` integer,
	`sequence_number` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`simulation_run_id`) REFERENCES `simulation_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`buyer_profile_id`) REFERENCES `buyer_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `buyer_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`primary_constraint` text NOT NULL,
	`system_prompt` text,
	`example_mandate` text,
	`default_weight` real DEFAULT 1 NOT NULL,
	`parameters` text
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`storefront_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`description` text,
	`structured_specs` text,
	`brand` text,
	`review_score` real,
	`review_count` integer,
	`stock_status` text DEFAULT 'in_stock' NOT NULL,
	`data_completeness_score` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`storefront_id`) REFERENCES `storefronts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rejection_clusters` (
	`id` text PRIMARY KEY NOT NULL,
	`simulation_run_id` text NOT NULL,
	`reason_code` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`affected_profile_ids` text,
	`affected_product_ids` text,
	`estimated_revenue_impact` integer,
	`rank` integer,
	`recommendation` text,
	FOREIGN KEY (`simulation_run_id`) REFERENCES `simulation_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `simulation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`storefront_id` text NOT NULL,
	`storefront_snapshot` text,
	`total_visits` integer DEFAULT 0 NOT NULL,
	`total_purchases` integer DEFAULT 0 NOT NULL,
	`total_rejections` integer DEFAULT 0 NOT NULL,
	`overall_conversion_rate` real,
	`estimated_revenue_lost` integer,
	`profile_weights` text,
	`previous_run_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`storefront_id`) REFERENCES `storefronts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `storefront_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`simulation_run_id` text NOT NULL,
	`recommendation_source` text,
	`action_type` text NOT NULL,
	`change_preview` text,
	`applied` integer DEFAULT false NOT NULL,
	`applied_at` text,
	`reverted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`simulation_run_id`) REFERENCES `simulation_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recommendation_source`) REFERENCES `rejection_clusters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `storefronts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`shipping_policies` text,
	`return_policy` text,
	`sustainability_claims` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
