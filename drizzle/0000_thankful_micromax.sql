CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`request_key` text NOT NULL,
	`customer` text NOT NULL,
	`email` text NOT NULL,
	`address` text NOT NULL,
	`items` text NOT NULL,
	`subtotal` integer NOT NULL,
	`shipping` integer NOT NULL,
	`total` integer NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_idempotency` ON `orders` (`owner`,`request_key`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`price` integer NOT NULL,
	`stock` integer NOT NULL,
	`image` text NOT NULL,
	`variants` text NOT NULL,
	`attributes` text NOT NULL,
	`badge` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	CONSTRAINT "stock_nonnegative" CHECK("products"."stock" >= 0),
	CONSTRAINT "price_nonnegative" CHECK("products"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`order_id` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
