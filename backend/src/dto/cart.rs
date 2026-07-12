use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct AddToCartRequest {
    pub product_id: Uuid,

    #[validate(range(min = 1, message = "Quantity must be at least 1"))]
    pub quantity: i32,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateCartItemRequest {
    #[validate(range(min = 1, message = "Quantity must be at least 1"))]
    pub quantity: i32,
}
