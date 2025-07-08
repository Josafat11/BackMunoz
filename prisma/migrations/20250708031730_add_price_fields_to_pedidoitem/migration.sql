/*
  Warnings:

  - Added the required column `precioUnitario` to the `PedidoItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `PedidoItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `pedidoitem` ADD COLUMN `precioUnitario` DOUBLE NOT NULL,
    ADD COLUMN `subtotal` DOUBLE NOT NULL;
