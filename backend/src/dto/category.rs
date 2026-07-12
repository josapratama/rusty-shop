use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCategoryRequest {
    #[validate(length(min = 2, max = 100, message = "Name must be 2-100 characters"))]
    pub name: String,

    pub description: Option<String>,
    pub image_url: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateCategoryRequest {
    #[validate(length(min = 2, max = 100, message = "Name must be 2-100 characters"))]
    pub name: Option<String>,

    pub description: Option<String>,
    pub image_url: Option<String>,
    pub is_active: Option<bool>,
}
