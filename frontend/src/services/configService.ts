import api from "./api";

export interface BankAccount {
  bank: string;
  account_number: string;
  holder_name: string;
}

export interface ShopConfig {
  shipping_cost_per_gram: string;
  shop_name: string;
  whatsapp_number: string;
  bank_accounts: string; // JSON string of BankAccount[]
}

export const configService = {
  get: () => api.get<{ data: ShopConfig }>("/config"),
  adminGet: () => api.get<{ data: ShopConfig }>("/admin/config"),
  adminUpdate: (configs: Record<string, string>) =>
    api.put<{ message: string }>("/admin/config", { configs }),
};
