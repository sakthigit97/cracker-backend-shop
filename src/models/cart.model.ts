export interface Cart {
    pk: string;
    sk: "CART";
    items: Record<string, number>;
    updatedAt: number;
    ttl?: number;
}
