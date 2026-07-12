use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateProfileRequest {
    #[validate(length(min = 2, max = 100))]
    pub name: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ChangePasswordRequest {
    #[validate(length(min = 1, message = "Current password is required"))]
    pub current_password: String,

    #[validate(length(min = 6, message = "New password must be at least 6 characters"))]
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct UserQueryParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub search: Option<String>,
}
