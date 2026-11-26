CREATE TABLE `inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`organization` varchar(200),
	`email` varchar(320) NOT NULL,
	`interest` varchar(80) NOT NULL,
	`message` text,
	`source` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
