use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;
use validator::Validate;

use crate::{
    config::AppState,
    dto::review::{CreateReviewRequest, ReviewResponse},
    errors::{AppError, AppResult},
    utils::{jwt::Claims, response},
};

pub async fn list_product_reviews(
    Path(product_id): Path<Uuid>,
    State(state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    let reviews = sqlx::query_as::<_, ReviewResponse>(
        "SELECT r.id, r.product_id, r.user_id, r.order_id, r.rating, r.comment,
                u.name AS user_name, r.created_at
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.product_id = $1
         ORDER BY r.created_at DESC",
    )
    .bind(product_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(reviews))
}

pub async fn create_review(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(payload): Json<CreateReviewRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    // Verify user actually purchased this product in a completed or paid order
    let purchased: (bool,) = sqlx::query_as(
        "SELECT EXISTS (
            SELECT 1 FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.user_id = $1 AND oi.product_id = $2
              AND o.status IN ('completed', 'shipped', 'paid')
        )"
    )
    .bind(user_id)
    .bind(payload.product_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or((false,));

    if !purchased.0 {
        return Err(AppError::BadRequest(
            "Anda hanya dapat memberikan ulasan untuk produk yang sudah Anda beli".to_string(),
        ));
    }

    let review = sqlx::query_as::<_, ReviewResponse>(
        "INSERT INTO reviews (product_id, user_id, order_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (product_id, user_id, order_id)
         DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
         RETURNING id, product_id, user_id, order_id, rating, comment,
                   (SELECT name FROM users WHERE id = $2) AS user_name,
                   created_at",
    )
    .bind(payload.product_id)
    .bind(user_id)
    .bind(payload.order_id)
    .bind(payload.rating)
    .bind(payload.comment)
    .fetch_one(&state.pool)
    .await?;

    Ok(response::created(review))
}

