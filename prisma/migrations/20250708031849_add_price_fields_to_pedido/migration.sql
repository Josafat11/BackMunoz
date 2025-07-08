/*
  Warnings:

  - Added the required column `total` to the `Pedido` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `pedido` ADD COLUMN `total` DOUBLE NOT NULL;
