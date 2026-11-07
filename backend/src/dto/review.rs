use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateReviewRequest {
    pub product_id: Uuid,
    pub order_id: Option<Uuid>,

    #[validate(range(min = 1, max = 5, message = "Rating harus antara 1 sampai 5"))]
    pub rating: i32,

    #[validate(length(max = 1000, message = "Komentar maksimal 1000 karakter"))]
    pub comment: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ReviewResponse {
    pub id: Uuid,
    pub product_id: Uuid,
    pub user_id: Uuid,
    pub order_id: Option<Uuid>,
    pub rating: i32,
    pub comment: Option<String>,
    pub user_name: String,
    pub created_at: DateTime<Utc>,
}

