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
    discount_amount: Option<Decimal>,
    courier: Option<String>,
    tracking_number: Option<String>,
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
    discount_amount: Option<Decimal>,
    coupon_code: Option<String>,
    courier: Option<String>,
    tracking_number: Option<String>,
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
    courier: Option<String>,
    tracking_number: Option<String>,
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
    discount_amount: Option<Decimal>,
    coupon_code: Option<String>,
    courier: Option<String>,
    tracking_number: Option<String>,
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

// ── Helpers ───────────────────────────────────────────────────────────────────

fn generate_order_number() -> String {
    let now = Utc::now().format("%Y%m%d%H%M%S");
    let rand_num: u32 = rand::random::<u32>() % 9000 + 1000;
    format!("ORD-{now}-{rand_num}")
}

// ── Handlers ──────────────────────────────────────────────────────────────────

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

    // Verify address belongs to user
    let address = sqlx::query_as::<_, AddressRow>(
        "SELECT recipient_name, phone, address_line, city, province, postal_code
         FROM addresses WHERE id = $1 AND user_id = $2",
    )
    .bind(body.address_id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Address not found".to_string()))?;

    // Begin transaction
    let mut tx = state.pool.begin().await?;

    // Get cart items with row-level lock on products to prevent race conditions
    let cart_items = sqlx::query_as::<_, CartItemRow>(
        r#"SELECT ci.id, ci.product_id, ci.quantity,
                  p.name, p.price, p.stock, p.is_active,
                  p.weight,
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

    // Validate stock inside transaction
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

    // Calculate shipping cost based on total weight (grams)
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

    let shipping_cost = (rate * total_weight_grams).round_dp(0);

    // Coupon discount calculation
    let mut discount_amount = Decimal::ZERO;
    let mut coupon_id_val: Option<Uuid> = None;
    let mut coupon_code_val: Option<String> = None;

    if let Some(ref code) = body.coupon_code {
        let code_clean = code.trim().to_uppercase();
        if !code_clean.is_empty() {
            #[allow(dead_code)]
            #[derive(sqlx::FromRow)]
            struct CouponLockRow {
                id: Uuid,
                code: String,
                discount_type: String,
                discount_value: Decimal,
                min_purchase: Decimal,
                max_discount: Option<Decimal>,
                usage_limit: Option<i32>,
                used_count: i32,
                is_active: bool,
                expires_at: Option<DateTime<Utc>>,
            }

            let coupon = sqlx::query_as::<_, CouponLockRow>(
                "SELECT id, code, discount_type, discount_value, min_purchase, max_discount,
                        usage_limit, used_count, is_active, expires_at
                 FROM coupons
                 WHERE UPPER(code) = UPPER($1) AND is_active = TRUE
                 FOR UPDATE",
            )
            .bind(&code_clean)
            .fetch_optional(&mut *tx)
            .await?;

            if let Some(c) = coupon {
                let valid_expiry = c.expires_at.map_or(true, |exp| exp >= Utc::now());
                let valid_usage = c.usage_limit.map_or(true, |lim| c.used_count < lim);
                let valid_min = subtotal >= c.min_purchase;

                if valid_expiry && valid_usage && valid_min {
                    let mut disc = match c.discount_type.as_str() {
                        "percentage" => (subtotal * c.discount_value / Decimal::from(100)).round_dp(0),
                        "fixed" => c.discount_value,
                        _ => Decimal::ZERO,
                    };
                    if let Some(max) = c.max_discount {
                        if disc > max {
                            disc = max;
                        }
                    }
                    if disc > subtotal {
                        disc = subtotal;
                    }

                    discount_amount = disc;
                    coupon_id_val = Some(c.id);
                    coupon_code_val = Some(c.code);

                    sqlx::query("UPDATE coupons SET used_count = used_count + 1 WHERE id = $1")
                        .bind(c.id)
                        .execute(&mut *tx)
                        .await?;
                }
            }
        }
    }

    let total = (subtotal - discount_amount).max(Decimal::ZERO) + shipping_cost;
    let order_number = generate_order_number();
    let payment_method_str = body.payment_method.to_string();

    // Insert order
    let order = sqlx::query_as::<_, OrderInsertRow>(
        "INSERT INTO orders (
             user_id, order_number, status, payment_method,
             subtotal, shipping_cost, total,
             discount_amount, coupon_id, coupon_code,
             shipping_name, shipping_phone, shipping_address,
             shipping_city, shipping_province, shipping_postal, notes
         )
         VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING id, order_number, status, created_at",
    )
    .bind(user_id)
    .bind(&order_number)
    .bind(body.payment_method as PaymentMethod)
    .bind(subtotal)
    .bind(shipping_cost)
    .bind(total)
    .bind(discount_amount)
    .bind(coupon_id_val)
    .bind(coupon_code_val)
    .bind(&address.recipient_name)
    .bind(&address.phone)
    .bind(&address.address_line)
    .bind(&address.city)
    .bind(&address.province)
    .bind(&address.postal_code)
    .bind(&body.notes)
    .fetch_one(&mut *tx)
    .await?;

    // Insert order items & decrement stock
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

    // Send WhatsApp notification (non-blocking)
    let wa_msg = format!(
        "Halo {}, pesanan Anda #{}\ntelah berhasil dibuat!\nTotal: Rp {}\nSilakan periksa detail pesanan Anda di website {}.",
        address.recipient_name, order.order_number, total, state.config.app_name
    );
    crate::utils::whatsapp::send_whatsapp_async(
        state.config.wabridge_url.clone(),
        address.phone.clone(),
        wa_msg,
    );

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

    let orders = sqlx::query_as::<_, OrderListRow>(
        "SELECT id, order_number, status, payment_method,
                subtotal, shipping_cost, total, discount_amount, courier, tracking_number, created_at
         FROM orders
         WHERE user_id = $1
           AND ($2::order_status IS NULL OR status = $2)
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4",
    )
    .bind(user_id)
    .bind(params.status.as_ref() as Option<&OrderStatus>)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM orders
         WHERE user_id = $1
           AND ($2::order_status IS NULL OR status = $2)",
    )
    .bind(user_id)
    .bind(params.status.as_ref() as Option<&OrderStatus>)
    .fetch_one(&state.pool)
    .await?;

    let data: Vec<_> = orders
        .iter()
        .map(|o| {
            serde_json::json!({
                "id": o.id,
                "order_number": o.order_number,
                "status": o.status,
                "payment_method": o.payment_method,
                "subtotal": o.subtotal,
                "shipping_cost": o.shipping_cost,
                "discount_amount": o.discount_amount.unwrap_or(Decimal::ZERO),
                "total": o.total,
                "courier": o.courier,
                "tracking_number": o.tracking_number,
                "created_at": o.created_at,
            })
        })
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
                subtotal, shipping_cost, total, discount_amount, coupon_code, courier, tracking_number,
                shipping_name, shipping_phone, shipping_address,
                shipping_city, shipping_province, shipping_postal,
                notes, created_at, updated_at
         FROM orders
         WHERE id = $1 AND user_id = $2",
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
        "discount_amount": order.discount_amount.unwrap_or(Decimal::ZERO),
        "coupon_code": order.coupon_code,
        "courier": order.courier,
        "tracking_number": order.tracking_number,
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

pub async fn cancel_order(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    #[allow(dead_code)]
    #[derive(sqlx::FromRow)]
    struct OrderCancelCheck {
        id: Uuid,
        status: OrderStatus,
        coupon_id: Option<Uuid>,
    }

    let order = sqlx::query_as::<_, OrderCancelCheck>(
        "SELECT id, status, coupon_id FROM orders WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    if order.status != OrderStatus::Pending {
        return Err(AppError::BadRequest(
            "Only pending orders can be cancelled".to_string(),
        ));
    }

    let mut tx = state.pool.begin().await?;

    sqlx::query("UPDATE orders SET status = 'cancelled' WHERE id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    // Restore stock
    #[derive(sqlx::FromRow)]
    struct RestockRow {
        product_id: Uuid,
        quantity: i32,
    }

    let items = sqlx::query_as::<_, RestockRow>(
        "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;

    for item in items {
        sqlx::query("UPDATE products SET stock = stock + $1 WHERE id = $2")
            .bind(item.quantity)
            .bind(item.product_id)
            .execute(&mut *tx)
            .await?;
    }

    // Restore coupon usage if coupon was used
    if let Some(cid) = order.coupon_id {
        sqlx::query("UPDATE coupons SET used_count = GREATEST(0, used_count - 1) WHERE id = $1")
            .bind(cid)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;

    Ok(response::message("Order cancelled successfully"))
}

// ── Admin handlers ────────────────────────────────────────────────────────────

pub async fn admin_list_orders(
    State(state): State<AppState>,
    Query(params): Query<OrderQueryParams>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let orders = sqlx::query_as::<_, AdminOrderListRow>(
        "SELECT o.id, o.order_number, o.status, o.payment_method, o.total,
                o.courier, o.tracking_number, o.created_at,
                u.name AS user_name, u.email AS user_email
         FROM orders o
         JOIN users u ON u.id = o.user_id
         WHERE ($1::order_status IS NULL OR o.status = $1)
         ORDER BY o.created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(params.status.as_ref() as Option<&OrderStatus>)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM orders WHERE ($1::order_status IS NULL OR status = $1)",
    )
    .bind(params.status.as_ref() as Option<&OrderStatus>)
    .fetch_one(&state.pool)
    .await?;

    let data: Vec<_> = orders
        .iter()
        .map(|o| {
            serde_json::json!({
                "id": o.id,
                "order_number": o.order_number,
                "status": o.status,
                "payment_method": o.payment_method,
                "total": o.total,
                "courier": o.courier,
                "tracking_number": o.tracking_number,
                "created_at": o.created_at,
                "user_name": o.user_name,
                "user_email": o.user_email,
            })
        })
        .collect();

    Ok(response::paginated(data, PaginationMeta::new(page, per_page, total)))
}

pub async fn admin_get_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let order = sqlx::query_as::<_, AdminOrderDetailRow>(
        "SELECT o.id, o.order_number, o.status, o.payment_method, o.payment_proof,
                o.subtotal, o.shipping_cost, o.total, o.discount_amount, o.coupon_code,
                o.courier, o.tracking_number,
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
        "discount_amount": order.discount_amount.unwrap_or(Decimal::ZERO),
        "coupon_code": order.coupon_code,
        "courier": order.courier,
        "tracking_number": order.tracking_number,
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
    #[allow(dead_code)]
    #[derive(sqlx::FromRow)]
    struct OrderCurrentCheck {
        id: Uuid,
        status: OrderStatus,
        coupon_id: Option<Uuid>,
    }

    let mut tx = state.pool.begin().await?;

    let current = sqlx::query_as::<_, OrderCurrentCheck>(
        "SELECT id, status, coupon_id FROM orders WHERE id = $1 FOR UPDATE",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    #[derive(sqlx::FromRow)]
    struct RestockRow {
        product_id: Uuid,
        quantity: i32,
    }

    // If changing to cancelled from an active status -> restore stock & coupon
    if current.status != OrderStatus::Cancelled && body.status == OrderStatus::Cancelled {
        let items = sqlx::query_as::<_, RestockRow>(
            "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
        )
        .bind(id)
        .fetch_all(&mut *tx)
        .await?;

        for item in items {
            sqlx::query("UPDATE products SET stock = stock + $1 WHERE id = $2")
                .bind(item.quantity)
                .bind(item.product_id)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(cid) = current.coupon_id {
            sqlx::query("UPDATE coupons SET used_count = GREATEST(0, used_count - 1) WHERE id = $1")
                .bind(cid)
                .execute(&mut *tx)
                .await?;
        }
    } else if current.status == OrderStatus::Cancelled && body.status != OrderStatus::Cancelled {
        // If restoring a previously cancelled order -> re-deduct stock & re-increment coupon
        let items = sqlx::query_as::<_, RestockRow>(
            "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
        )
        .bind(id)
        .fetch_all(&mut *tx)
        .await?;

        for item in items {
            sqlx::query("UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2")
                .bind(item.quantity)
                .bind(item.product_id)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(cid) = current.coupon_id {
            sqlx::query("UPDATE coupons SET used_count = used_count + 1 WHERE id = $1")
                .bind(cid)
                .execute(&mut *tx)
                .await?;
        }
    }

    #[derive(sqlx::FromRow)]
    struct OrderWithUserRow {
        id: Uuid,
        order_number: String,
        status: OrderStatus,
        courier: Option<String>,
        tracking_number: Option<String>,
        shipping_phone: String,
        updated_at: DateTime<Utc>,
        user_name: String,
        user_email: String,
    }

    let order = sqlx::query_as::<_, OrderWithUserRow>(
        "UPDATE orders
         SET status = $1,
             courier = COALESCE($3, courier),
             tracking_number = COALESCE($4, tracking_number),
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, order_number, status, courier, tracking_number, shipping_phone, updated_at,
           (SELECT name FROM users WHERE id = orders.user_id) AS user_name,
           (SELECT email FROM users WHERE id = orders.user_id) AS user_email",
    )
    .bind(body.status as OrderStatus)
    .bind(id)
    .bind(&body.courier)
    .bind(&body.tracking_number)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

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

    // Send WhatsApp notification if status changed to shipped
    if order.status == OrderStatus::Shipped {
        let courier_str = order.courier.as_deref().unwrap_or("Kurir Pengiriman");
        let tracking_str = order.tracking_number.as_deref().unwrap_or("-");
        let wa_msg = format!(
            "Pesanan Anda #{} telah dikirim!\nKurir: {}\nNo. Resi: {}\nLacak pesanan Anda di website {}.",
            order.order_number, courier_str, tracking_str, state.config.app_name
        );
        crate::utils::whatsapp::send_whatsapp_async(
            state.config.wabridge_url.clone(),
            order.shipping_phone.clone(),
            wa_msg,
        );
    }

    Ok(response::success(serde_json::json!({
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "courier": order.courier,
        "tracking_number": order.tracking_number,
        "updated_at": order.updated_at,
    })))
}
