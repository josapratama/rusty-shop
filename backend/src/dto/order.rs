use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::models::order::{OrderStatus, PaymentMethod};

#[derive(Debug, Deserialize, Validate)]
pub struct CheckoutRequest {
    pub address_id: Uuid,
    pub payment_method: PaymentMethod,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateOrderStatusRequest {
    pub status: OrderStatus,
}

#[derive(Debug, Deserialize)]
pub struct OrderQueryParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub status: Option<OrderStatus>,
}
