import {
  sqliteTable,
  text,
  integer,
  check,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(),
    stock: integer("stock").notNull(),
    image: text("image").notNull(),
    variants: text("variants").notNull(),
    attributes: text("attributes").notNull(),
    badge: text("badge").notNull().default(""),
    active: integer("active").notNull().default(1),
    created: text("created").notNull(),
  },
  (t) => [
    check("stock_nonnegative", sql`${t.stock} >= 0`),
    check("price_nonnegative", sql`${t.price} >= 0`),
  ],
);
export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    requestKey: text("request_key").notNull(),
    customer: text("customer").notNull(),
    email: text("email").notNull(),
    address: text("address").notNull(),
    items: text("items").notNull(),
    subtotal: integer("subtotal").notNull(),
    shipping: integer("shipping").notNull(),
    total: integer("total").notNull(),
    method: text("method").notNull(),
    status: text("status").notNull(),
    created: text("created").notNull(),
  },
  (t) => [uniqueIndex("order_idempotency").on(t.owner, t.requestKey)],
);
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  status: text("status").notNull(),
  created: text("created").notNull(),
});
