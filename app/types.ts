export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  variants: string[];
  attributes: Record<string, string>;
  badge: string;
  active: number;
  created: string;
};
export type CartItem = { id: string; variant: string; quantity: number };
export type OrderItem = CartItem & {
  name: string;
  price: number;
  image: string;
};
export type Order = {
  id: string;
  customer: string;
  email: string;
  address: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  method: string;
  status: string;
  created: string;
};
export type Transaction = {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  status: string;
  created: string;
};
export const money = (cents: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
