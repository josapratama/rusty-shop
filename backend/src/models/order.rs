use serde::{Deserialize, Serialize};
use sqlx::Type;

/// Order status enum — dipakai di handler row structs dan DTO.
#[derive(Debug, Clone, Serialize, Deserialize, Type, PartialEq)]
#[sqlx(type_name = "order_status", rename_all = "lowercase")]
pub enum OrderStatus {
    Pending,
    Paid,
    Processing,
    Shipped,
    Completed,
    Cancelled,
}

impl std::fmt::Display for OrderStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OrderStatus::Pending => write!(f, "pending"),
            OrderStatus::Paid => write!(f, "paid"),
            OrderStatus::Processing => write!(f, "processing"),
            OrderStatus::Shipped => write!(f, "shipped"),
            OrderStatus::Completed => write!(f, "completed"),
            OrderStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

/// Payment method enum — dipakai di handler row structs dan DTO.
#[derive(Debug, Clone, Serialize, Deserialize, Type, PartialEq)]
#[sqlx(type_name = "payment_method", rename_all = "snake_case")]
pub enum PaymentMethod {
    BankTransfer,
    CashOnDelivery,
}

impl std::fmt::Display for PaymentMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PaymentMethod::BankTransfer => write!(f, "bank_transfer"),
            PaymentMethod::CashOnDelivery => write!(f, "cash_on_delivery"),
        }
    }
}
