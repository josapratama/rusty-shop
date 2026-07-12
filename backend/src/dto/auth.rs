use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(length(min = 2, max = 100, message = "Name must be 2-100 characters"))]
    pub name: String,

    #[validate(email(message = "Invalid email format"))]
    pub email: String,

    #[validate(length(min = 6, message = "Password must be at least 6 characters"))]
    pub password: String,

    pub phone: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,

    #[validate(length(min = 1, message = "Password is required"))]
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserInfo,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub role: String,
}
