use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateProductRequest {
    pub category_id: Uuid,

    #[validate(length(min = 2, max = 200, message = "Name must be 2-200 characters"))]
    pub name: String,

    pub description: Option<String>,

    // Tidak pakai #[validate(range)] karena Decimal tidak support ValidateRange
    // Validasi manual di handler
    pub price: Decimal,

    pub stock: i32,

    pub weight: Option<Decimal>,
    pub is_active: Option<bool>,
    pub images: Option<Vec<ProductImageInput>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateProductRequest {
    pub category_id: Option<Uuid>,

    #[validate(length(min = 2, max = 200, message = "Name must be 2-200 characters"))]
    pub name: Option<String>,

    pub description: Option<String>,
    pub price: Option<Decimal>,
    pub stock: Option<i32>,
    pub weight: Option<Decimal>,
    pub is_active: Option<bool>,
    pub images: Option<Vec<ProductImageInput>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ProductImageInput {
    pub image_url: String,
    pub is_primary: Option<bool>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ProductQueryParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub category: Option<String>,
    pub search: Option<String>,
    pub min_price: Option<Decimal>,
    pub max_price: Option<Decimal>,
}
