use axum::extract::{Path, State};
use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::{AppError, AppResult},
    utils::{jwt::Claims, response},
};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct WishlistItemRow {
    pub id: Uuid,
    pub product_id: Uuid,
    pub name: String,
    pub slug: String,
    pub price: Decimal,
    pub original_price: Option<Decimal>,
    pub stock: i32,
    pub category_name: String,
    pub primary_image: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ToggleWishlistResponse {
    pub in_wishlist: bool,
    pub product_id: Uuid,
}

pub async fn list_wishlist(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let items = sqlx::query_as::<_, WishlistItemRow>(
        "SELECT w.id, p.id AS product_id, p.name, p.slug, p.price, p.original_price, p.stock,
                c.name AS category_name,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS primary_image
         FROM wishlists w
         JOIN products p ON p.id = w.product_id
         JOIN categories c ON c.id = p.category_id
         WHERE w.user_id = $1 AND p.is_active = TRUE
         ORDER BY w.created_at DESC",
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(items))
}

pub async fn get_wishlist_ids(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let ids = sqlx::query_scalar::<_, Uuid>(
        "SELECT product_id FROM wishlists WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(ids))
}

pub async fn toggle_wishlist(
    Path(product_id): Path<Uuid>,
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    // Check if already in wishlist
    let existing: (bool,) = sqlx::query_as(
        "SELECT EXISTS (SELECT 1 FROM wishlists WHERE user_id = $1 AND product_id = $2)"
    )
    .bind(user_id)
    .bind(product_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or((false,));

    if existing.0 {
        sqlx::query("DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2")
            .bind(user_id)
            .bind(product_id)
            .execute(&state.pool)
            .await?;

        Ok(response::success(ToggleWishlistResponse {
            in_wishlist: false,
            product_id,
        }))
    } else {
        sqlx::query(
            "INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
        )
        .bind(user_id)
        .bind(product_id)
        .execute(&state.pool)
        .await?;

        Ok(response::success(ToggleWishlistResponse {
            in_wishlist: true,
            product_id,
        }))
    }
}
