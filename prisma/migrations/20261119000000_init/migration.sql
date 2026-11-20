-- Initial Prisma Migration for HIDEVERSE MySQL 8
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(64) NOT NULL,
  `username` VARCHAR(32) NOT NULL,
  `email` VARCHAR(160) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `email_verified` BOOLEAN NOT NULL DEFAULT false,
  `role` ENUM('player', 'moderator', 'admin') NOT NULL DEFAULT 'player',
  `is_banned` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `users_uid_key`(`uid`),
  UNIQUE INDEX `users_username_key`(`username`),
  UNIQUE INDEX `users_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_profiles` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `display_name` VARCHAR(48) NOT NULL,
  `photo_url` VARCHAR(512) NULL,
  `bio` VARCHAR(280) NULL,
  `favorite_map` VARCHAR(32) NOT NULL DEFAULT 'modern_house',
  `equipped_skin` VARCHAR(48) NOT NULL DEFAULT 'skin_cyan_runner',
  `equipped_accessory` VARCHAR(48) NOT NULL DEFAULT 'acc_none',
  `online_status` BOOLEAN NOT NULL DEFAULT false,
  `last_seen_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `player_statistics` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `level` INTEGER UNSIGNED NOT NULL DEFAULT 1,
  `xp` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `coins` BIGINT UNSIGNED NOT NULL DEFAULT 200,
  `total_matches` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `wins` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `losses` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `total_tags` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `total_playtime_sec` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `player_statistics_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
