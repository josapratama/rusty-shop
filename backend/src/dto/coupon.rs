use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct ValidateCouponRequest {
    #[validate(length(min = 1, max = 50, message = "Kode kupon wajib diisi"))]
    pub code: String,
    pub subtotal: Decimal,
}

#[derive(Debug, Serialize)]
pub struct CouponValidationResponse {
    pub valid: bool,
    pub coupon_id: Option<Uuid>,
    pub code: String,
    pub discount_type: String,
    pub discount_value: Decimal,
    pub discount_amount: Decimal,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCouponRequest {
    #[validate(length(min = 2, max = 50, message = "Kode harus 2-50 karakter"))]
    pub code: String,
    pub description: Option<String>,
    pub discount_type: String, // "percentage" | "fixed"
    pub discount_value: Decimal,
    pub min_purchase: Option<Decimal>,
    pub max_discount: Option<Decimal>,
    pub usage_limit: Option<i32>,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateCouponRequest {
    pub description: Option<String>,
    pub discount_type: Option<String>,
    pub discount_value: Option<Decimal>,
    pub min_purchase: Option<Decimal>,
    pub max_discount: Option<Decimal>,
    pub usage_limit: Option<i32>,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: Option<bool>,
}

