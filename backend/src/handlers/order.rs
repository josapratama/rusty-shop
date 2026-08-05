use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;
use validator::Validate;

use crate::{
    config::AppState,
    dto::order::{CheckoutRequest, OrderQueryParams, UpdateOrderStatusRequest},
    errors::{AppError, AppResult},
    models::order::{OrderStatus, PaymentMethod},
    utils::{jwt::Claims, pagination::PaginationMeta, response},
};

// ── Row structs ───────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct AddressRow {
    recipient_name: String,
    phone: String,
    address_line: String,
    city: String,
    province: String,
    postal_code: String,
}

#[derive(sqlx::FromRow)]
struct CartItemRow {
    #[allow(dead_code)]
    id: Uuid,
    product_id: Uuid,
    quantity: i32,
    name: String,
    price: Decimal,
    stock: i32,
    is_active: bool,
    image_url: Option<String>,
    weight: Option<Decimal>,
}

#[derive(sqlx::FromRow)]
struct OrderInsertRow {
    id: Uuid,
    order_number: String,
    status: OrderStatus,
    created_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct OrderListRow {
    id: Uuid,
    order_number: String,
    status: OrderStatus,
    payment_method: PaymentMethod,
    subtotal: Decimal,
    shipping_cost: Decimal,
    total: Decimal,
    created_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct OrderDetailRow {
    id: Uuid,
    order_number: String,
    status: OrderStatus,
    payment_method: PaymentMethod,
    payment_proof: Option<String>,
    subtotal: Decimal,
    shipping_cost: Decimal,
    total: Decimal,
    shipping_name: String,
    shipping_phone: String,
    shipping_address: String,
    shipping_city: String,
    shipping_province: String,
    shipping_postal: String,
    notes: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow, Serialize)]
struct OrderItemRow {
    id: Uuid,
    product_id: Uuid,
    product_name: String,
    product_image: Option<String>,
    price: Decimal,
    quantity: i32,
    subtotal: Decimal,
}

#[derive(sqlx::FromRow)]
struct AdminOrderListRow {
    id: Uuid,
    order_number: String,
    status: OrderStatus,
    payment_method: PaymentMethod,
    total: Decimal,
    created_at: DateTime<Utc>,
    user_name: String,
    user_email: String,
}

#[derive(sqlx::FromRow)]
struct AdminOrderDetailRow {
    id: Uuid,
    order_number: String,
    status: OrderStatus,
    payment_method: PaymentMethod,
    payment_proof: Option<String>,
    subtotal: Decimal,
    shipping_cost: Decimal,
    total: Decimal,
    shipping_name: String,
    shipping_phone: String,
    shipping_address: String,
    shipping_city: String,
    shipping_province: String,
    shipping_postal: String,
    notes: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    user_name: String,
    user_email: String,
    user_phone: Option<String>,
}

#[derive(sqlx::FromRow)]
struct OrderStatusUpdateRow {
    id: Uuid,
    order_number: String,
    status: OrderStatus,
    updated_at: DateTime<Utc>,
}

// ── Helper ────────────────────────────────────────────────────────────────────

/// Generate a unique order number using UUID prefix for collision-safety.
fn generate_order_number() -> String {
    let id = Uuid::new_v4();
    let short = &id.to_string().replace('-', "")[..8].to_uppercase();
    format!("ORD-{short}")
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// Checkout with full transaction + SELECT FOR UPDATE to prevent race conditions.
pub async fn checkout(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CheckoutRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let mut tx = state.pool.begin().await?;

    // Fetch address
    let address = sqlx::query_as::<_, AddressRow>(
        "SELECT recipient_name, phone, address_line, city, province, postal_code
         FROM addresses WHERE id = $1 AND user_id = $2",
    )
    .bind(body.address_id)
    .bind(user_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Address not found".to_string()))?;

    // Fetch cart items with FOR UPDATE lock on products to prevent race condition
    let cart_items = sqlx::query_as::<_, CartItemRow>(
        r#"SELECT ci.id, ci.product_id, ci.quantity,
                  p.name, p.price, p.stock, p.is_active, p.weight,
                  (SELECT image_url FROM product_images
                   WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image_url
           FROM cart_items ci
           JOIN carts c ON c.id = ci.cart_id
           JOIN products p ON p.id = ci.product_id
           WHERE c.user_id = $1
           FOR UPDATE OF p"#,
    )
    .bind(user_id)
    .fetch_all(&mut *tx)
    .await?;

    if cart_items.is_empty() {
        return Err(AppError::BadRequest("Cart is empty".to_string()));
    }

    // Validate stock inside transaction (after lock)
    for item in &cart_items {
        if !item.is_active {
            return Err(AppError::BadRequest(format!(
                "Product '{}' is no longer available",
                item.name
            )));
        }
        if item.stock < item.quantity {
            return Err(AppError::BadRequest(format!(
                "Insufficient stock for '{}'. Available: {}",
                item.name, item.stock
            )));
        }
    }

    let subtotal: Decimal = cart_items
        .iter()
        .map(|i| i.price * Decimal::from(i.quantity))
        .sum();

    // #14: Calculate shipping cost based on total weight (grams)
    // Rate is fetched from shop_config table
    let rate: Decimal = sqlx::query_scalar::<_, Option<String>>(
        "SELECT value FROM shop_config WHERE key = 'shipping_cost_per_gram'",
    )
    .fetch_optional(&mut *tx)
    .await?
    .flatten()
    .and_then(|v| v.parse().ok())
    .unwrap_or(Decimal::ZERO);

    let total_weight_grams: Decimal = cart_items
        .iter()
        .map(|i| i.weight.unwrap_or(Decimal::ZERO) * Decimal::from(i.quantity))
        .sum();

    let shipping_cost = (rate * total_weight_grams)
        .round_dp(0); // round to nearest rupiah
    let total = subtotal + shipping_cost;
    let order_number = generate_order_number();
    // Save payment method string before it's moved into the bind
    let payment_method_str = body.payment_method.to_string();

    // Insert order
    let order = sqlx::query_as::<_, OrderInsertRow>(
        "INSERT INTO orders (
             user_id, order_number, status, payment_method,
             subtotal, shipping_cost, total,
             shipping_name, shipping_phone, shipping_address,
             shipping_city, shipping_province, shipping_postal, notes
         )
         VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, order_number, status, created_at",
    )
    .bind(user_id)
    .bind(&order_number)
    .bind(body.payment_method as PaymentMethod)
    .bind(subtotal)
    .bind(shipping_cost)
    .bind(total)
    .bind(&address.recipient_name)
    .bind(&address.phone)
    .bind(&address.address_line)
    .bind(&address.city)
    .bind(&address.province)
    .bind(&address.postal_code)
    .bind(&body.notes)
    .fetch_one(&mut *tx)
    .await?;

    // Insert order items & decrement stock (inside same transaction)
    for item in &cart_items {
        sqlx::query(
            "INSERT INTO order_items
             (order_id, product_id, product_name, product_image, price, quantity, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(order.id)
        .bind(item.product_id)
        .bind(&item.name)
        .bind(&item.image_url)
        .bind(item.price)
        .bind(item.quantity)
        .bind(item.price * Decimal::from(item.quantity))
        .execute(&mut *tx)
        .await?;

        sqlx::query("UPDATE products SET stock = stock - $1 WHERE id = $2")
            .bind(item.quantity)
            .bind(item.product_id)
            .execute(&mut *tx)
            .await?;
    }

    // Clear cart
    sqlx::query(
        "DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)",
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    // Send order confirmation email (non-blocking)
    {
        #[derive(sqlx::FromRow)]
        struct UserEmailRow { name: String, email: String }
        if let Ok(Some(u)) = sqlx::query_as::<_, UserEmailRow>(
            "SELECT name, email FROM users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_optional(&state.pool)
        .await
        {
            crate::utils::email::send_order_confirmed(
                &state.config,
                &u.email,
                &u.name,
                &order.order_number,
                total,
                &payment_method_str,
                &state.config.frontend_url,
                &order.id.to_string(),
            );
        }
    }

    Ok(response::created(serde_json::json!({
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "total": total,
        "created_at": order.created_at,
    })))
}

pub async fn list_my_orders(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Query(params): Query<OrderQueryParams>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(10).min(50);
    let offset = (page - 1) * per_page;
    let status_filter = params.status.as_ref().map(|s| s.to_string());

    let orders = sqlx::query_as::<_, OrderListRow>(
        "SELECT id, order_number, status, payment_method,
                subtotal, shipping_cost, total, created_at
         FROM orders
         WHERE user_id = $1
           AND ($2::text IS NULL OR status::text = $2)
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4",
    )
    .bind(user_id)
    .bind(&status_filter)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    // Fix: count query also applies status filter
    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM orders
         WHERE user_id = $1
           AND ($2::text IS NULL OR status::text = $2)",
    )
    .bind(user_id)
    .bind(&status_filter)
    .fetch_one(&state.pool)
    .await?;

    let data: Vec<_> = orders
        .iter()
        .map(|o| serde_json::json!({
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "payment_method": o.payment_method,
            "subtotal": o.subtotal,
            "shipping_cost": o.shipping_cost,
            "total": o.total,
            "created_at": o.created_at,
        }))
        .collect();

    Ok(response::paginated(data, PaginationMeta::new(page, per_page, total)))
}

pub async fn get_my_order(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let order = sqlx::query_as::<_, OrderDetailRow>(
        "SELECT id, order_number, status, payment_method, payment_proof,
                subtotal, shipping_cost, total,
                shipping_name, shipping_phone, shipping_address,
                shipping_city, shipping_province, shipping_postal,
                notes, created_at, updated_at
         FROM orders WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    let items = sqlx::query_as::<_, OrderItemRow>(
        "SELECT id, product_id, product_name, product_image, price, quantity, subtotal
         FROM order_items WHERE order_id = $1",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(serde_json::json!({
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "payment_method": order.payment_method,
        "payment_proof": order.payment_proof,
        "subtotal": order.subtotal,
        "shipping_cost": order.shipping_cost,
        "total": order.total,
        "shipping_name": order.shipping_name,
        "shipping_phone": order.shipping_phone,
        "shipping_address": order.shipping_address,
        "shipping_city": order.shipping_city,
        "shipping_province": order.shipping_province,
        "shipping_postal": order.shipping_postal,
        "notes": order.notes,
        "items": items,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    })))
}

/// Cancel order — only allowed for pending orders by the owner
pub async fn cancel_order(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let order = sqlx::query_as::<_, OrderStatusUpdateRow>(
        "UPDATE orders SET status = 'cancelled'
         WHERE id = $1 AND user_id = $2 AND status = 'pending'
         RETURNING id, order_number, status, updated_at",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::BadRequest(
        "Order not found or cannot be cancelled (only pending orders can be cancelled)".to_string(),
    ))?;

    // Send cancellation email (non-blocking)
    {
        #[derive(sqlx::FromRow)]
        struct UserEmailRow { name: String, email: String }
        if let Ok(Some(u)) = sqlx::query_as::<_, UserEmailRow>(
            "SELECT name, email FROM users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_optional(&state.pool)
        .await
        {
            crate::utils::email::send_order_status_updated(
                &state.config,
                &u.email,
                &u.name,
                &order.order_number,
                "cancelled",
                &state.config.frontend_url,
                &order.id.to_string(),
            );
        }
    }

    Ok(response::success(serde_json::json!({
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "updated_at": order.updated_at,
    })))
}

// ── Admin handlers ────────────────────────────────────────────────────────────

pub async fn admin_list_orders(
    State(state): State<AppState>,
    Query(params): Query<OrderQueryParams>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;
    let status_filter = params.status.as_ref().map(|s| s.to_string());

    let orders = sqlx::query_as::<_, AdminOrderListRow>(
        "SELECT o.id, o.order_number, o.status, o.payment_method,
                o.total, o.created_at,
                u.name AS user_name, u.email AS user_email
         FROM orders o
         JOIN users u ON u.id = o.user_id
         WHERE ($1::text IS NULL OR o.status::text = $1)
         ORDER BY o.created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(&status_filter)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    // Fix: count query also applies status filter
    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM orders
         WHERE ($1::text IS NULL OR status::text = $1)",
    )
    .bind(&status_filter)
    .fetch_one(&state.pool)
    .await?;

    let data: Vec<_> = orders
        .iter()
        .map(|o| serde_json::json!({
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "payment_method": o.payment_method,
            "total": o.total,
            "user_name": o.user_name,
            "user_email": o.user_email,
            "created_at": o.created_at,
        }))
        .collect();

    Ok(response::paginated(data, PaginationMeta::new(page, per_page, total)))
}

pub async fn admin_get_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let order = sqlx::query_as::<_, AdminOrderDetailRow>(
        "SELECT o.id, o.order_number, o.status, o.payment_method, o.payment_proof,
                o.subtotal, o.shipping_cost, o.total,
                o.shipping_name, o.shipping_phone, o.shipping_address,
                o.shipping_city, o.shipping_province, o.shipping_postal,
                o.notes, o.created_at, o.updated_at,
                u.name AS user_name, u.email AS user_email, u.phone AS user_phone
         FROM orders o
         JOIN users u ON u.id = o.user_id
         WHERE o.id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    let items = sqlx::query_as::<_, OrderItemRow>(
        "SELECT id, product_id, product_name, product_image, price, quantity, subtotal
         FROM order_items WHERE order_id = $1",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(serde_json::json!({
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "payment_method": order.payment_method,
        "payment_proof": order.payment_proof,
        "subtotal": order.subtotal,
        "shipping_cost": order.shipping_cost,
        "total": order.total,
        "shipping_name": order.shipping_name,
        "shipping_phone": order.shipping_phone,
        "shipping_address": order.shipping_address,
        "shipping_city": order.shipping_city,
        "shipping_province": order.shipping_province,
        "shipping_postal": order.shipping_postal,
        "notes": order.notes,
        "user_name": order.user_name,
        "user_email": order.user_email,
        "user_phone": order.user_phone,
        "items": items,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    })))
}

pub async fn admin_update_order_status(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateOrderStatusRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    #[derive(sqlx::FromRow)]
    struct OrderWithUserRow {
        id: Uuid,
        order_number: String,
        status: OrderStatus,
        updated_at: DateTime<Utc>,
        user_name: String,
        user_email: String,
    }

    let order = sqlx::query_as::<_, OrderWithUserRow>(
        "UPDATE orders SET status = $1
         WHERE id = $2
         RETURNING id, order_number, status, updated_at,
           (SELECT name FROM users WHERE id = orders.user_id) AS user_name,
           (SELECT email FROM users WHERE id = orders.user_id) AS user_email",
    )
    .bind(body.status as OrderStatus)
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    // Send status update email (non-blocking)
    crate::utils::email::send_order_status_updated(
        &state.config,
        &order.user_email,
        &order.user_name,
        &order.order_number,
        &order.status.to_string(),
        &state.config.frontend_url,
        &order.id.to_string(),
    );

    Ok(response::success(serde_json::json!({
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "updated_at": order.updated_at,
    })))
}
