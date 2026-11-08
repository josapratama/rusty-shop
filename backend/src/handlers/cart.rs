use axum::{
    extract::{Path, State},
    Json,
};
use rust_decimal::Decimal;
use uuid::Uuid;
use validator::Validate;

use crate::{
    config::AppState,
    dto::cart::{AddToCartRequest, UpdateCartItemRequest},
    errors::{AppError, AppResult},
    utils::{jwt::Claims, response},
};

// ── Row structs ───────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct CartItemRow {
    id: Uuid,
    product_id: Uuid,
    quantity: i32,
    product_name: String,
    product_slug: String,
    price: Decimal,
    product_image: Option<String>,
    stock: i32,
    weight: Option<Decimal>,
}

#[derive(sqlx::FromRow)]
struct ProductStockRow {
    #[allow(dead_code)]
    id: Uuid,
    stock: i32,
    is_active: bool,
}

#[derive(sqlx::FromRow)]
struct CartItemCheckRow {
    #[allow(dead_code)]
    id: Uuid,
    #[allow(dead_code)]
    product_id: Uuid,
    stock: i32,
}

// ── Helper ────────────────────────────────────────────────────────────────────

async fn get_or_create_cart(pool: &sqlx::PgPool, user_id: Uuid) -> Result<Uuid, AppError> {
    if let Some(id) = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM carts WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    {
        return Ok(id);
    }

    let id = sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO carts (user_id) VALUES ($1) RETURNING id",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(id)
}

// ── Handlers ──────────────────────────────────────────────────────────────────

pub async fn get_cart(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let cart_id = get_or_create_cart(&state.pool, user_id).await?;

    let items = sqlx::query_as::<_, CartItemRow>(
        r#"SELECT ci.id, ci.product_id, ci.quantity,
                  p.name AS product_name, p.slug AS product_slug, p.price,
                  (SELECT image_url FROM product_images
                   WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS product_image,
                  p.stock,
                  p.weight
           FROM cart_items ci
           JOIN products p ON p.id = ci.product_id
           WHERE ci.cart_id = $1
           ORDER BY ci.created_at"#,
    )
    .bind(cart_id)
    .fetch_all(&state.pool)
    .await?;

    let total: Decimal = items
        .iter()
        .map(|i| i.price * Decimal::from(i.quantity))
        .sum();

    Ok(response::success(serde_json::json!({
        "id": cart_id,
        "items": items.iter().map(|i| serde_json::json!({
            "id": i.id,
            "product_id": i.product_id,
            "product_name": i.product_name,
            "product_slug": i.product_slug,
            "product_image": i.product_image,
            "price": i.price,
            "quantity": i.quantity,
            "stock": i.stock,
            "weight": i.weight,
            "subtotal": i.price * Decimal::from(i.quantity),
        })).collect::<Vec<_>>(),
        "total": total,
    })))
}

pub async fn add_to_cart(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<AddToCartRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let product = sqlx::query_as::<_, ProductStockRow>(
        "SELECT id, stock, is_active FROM products WHERE id = $1",
    )
    .bind(body.product_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

    if !product.is_active {
        return Err(AppError::BadRequest("Product is not available".to_string()));
    }
    if product.stock < body.quantity {
        return Err(AppError::BadRequest(format!(
            "Insufficient stock. Available: {}",
            product.stock
        )));
    }

    let cart_id = get_or_create_cart(&state.pool, user_id).await?;

    sqlx::query(
        "INSERT INTO cart_items (cart_id, product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (cart_id, product_id)
         DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity,
                       updated_at = NOW()",
    )
    .bind(cart_id)
    .bind(body.product_id)
    .bind(body.quantity)
    .execute(&state.pool)
    .await?;

    Ok(response::message("Item added to cart"))
}

pub async fn update_cart_item(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(item_id): Path<Uuid>,
    Json(body): Json<UpdateCartItemRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let item = sqlx::query_as::<_, CartItemCheckRow>(
        r#"SELECT ci.id, ci.product_id, p.stock
           FROM cart_items ci
           JOIN carts c ON c.id = ci.cart_id
           JOIN products p ON p.id = ci.product_id
           WHERE ci.id = $1 AND c.user_id = $2"#,
    )
    .bind(item_id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Cart item not found".to_string()))?;

    if item.stock < body.quantity {
        return Err(AppError::BadRequest(format!(
            "Insufficient stock. Available: {}",
            item.stock
        )));
    }

    sqlx::query("UPDATE cart_items SET quantity = $1 WHERE id = $2")
        .bind(body.quantity)
        .bind(item_id)
        .execute(&state.pool)
        .await?;

    Ok(response::message("Cart item updated"))
}

pub async fn remove_cart_item(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(item_id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let result = sqlx::query(
        "DELETE FROM cart_items
         WHERE id = $1
           AND cart_id = (SELECT id FROM carts WHERE user_id = $2)",
    )
    .bind(item_id)
    .bind(user_id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Cart item not found".to_string()));
    }

    Ok(response::message("Item removed from cart"))
}

pub async fn clear_cart(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    sqlx::query(
        "DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)",
    )
    .bind(user_id)
    .execute(&state.pool)
    .await?;

    Ok(response::message("Cart cleared"))
}
