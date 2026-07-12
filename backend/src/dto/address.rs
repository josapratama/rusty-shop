use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateAddressRequest {
    #[validate(length(min = 1, max = 50))]
    pub label: Option<String>,

    #[validate(length(min = 2, max = 100, message = "Recipient name is required"))]
    pub recipient_name: String,

    #[validate(length(min = 5, max = 20, message = "Phone is required"))]
    pub phone: String,

    #[validate(length(min = 5, message = "Address is required"))]
    pub address_line: String,

    #[validate(length(min = 2, max = 100, message = "City is required"))]
    pub city: String,

    #[validate(length(min = 2, max = 100, message = "Province is required"))]
    pub province: String,

    #[validate(length(min = 5, max = 10, message = "Postal code is required"))]
    pub postal_code: String,

    pub is_default: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateAddressRequest {
    pub label: Option<String>,
    pub recipient_name: Option<String>,
    pub phone: Option<String>,
    pub address_line: Option<String>,
    pub city: Option<String>,
    pub province: Option<String>,
    pub postal_code: Option<String>,
    pub is_default: Option<bool>,
}
