use axum::{
    extract::{Path, Query, State},
};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

use crate::{
    config::AppState,
    dto::user::UserQueryParams,
    errors::{AppError, AppResult},
    models::{order::OrderStatus, user::UserRole},
    utils::{pagination::PaginationMeta, response},
};

// ── Row structs ───────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow, Serialize)]
struct RecentOrderRow {
    id: Uuid,
    order_number: String,
    status: OrderStatus,
    total: Decimal,
    created_at: DateTime<Utc>,
    user_name: String,
}

#[derive(sqlx::FromRow, Serialize)]
struct AdminUserRow {
    id: Uuid,
    name: String,
    email: String,
    phone: Option<String>,
    role: UserRole,
    is_active: bool,
    created_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow, Serialize)]
struct UserToggleRow {
    id: Uuid,
    name: String,
    email: String,
    is_active: bool,
}

#[derive(sqlx::FromRow)]
struct MonthlySaleRow {
    month: Option<DateTime<Utc>>,
    order_count: Option<i64>,
    revenue: Option<Decimal>,
}

#[derive(sqlx::FromRow)]
struct TopProductRow {
    product_name: String,
    total_sold: Option<Decimal>,
    total_revenue: Option<Decimal>,
}

#[derive(sqlx::FromRow, Serialize)]
struct OrderStatusSummaryRow {
    status: OrderStatus,
    count: Option<i64>,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

pub async fn dashboard_stats(
    State(state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    let total_users = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE role = 'user'",
    )
    .fetch_one(&state.pool)
    .await?;

    let total_products =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM products")
            .fetch_one(&state.pool)
            .await?;

    let total_orders =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM orders")
            .fetch_one(&state.pool)
            .await?;

    let total_revenue = sqlx::query_scalar::<_, Option<Decimal>>(
        "SELECT SUM(total) FROM orders WHERE status NOT IN ('cancelled', 'pending')",
    )
    .fetch_one(&state.pool)
    .await?
    .unwrap_or(Decimal::ZERO);

    let pending_orders = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM orders WHERE status = 'pending'",
    )
    .fetch_one(&state.pool)
    .await?;

    let recent_orders = sqlx::query_as::<_, RecentOrderRow>(
        "SELECT o.id, o.order_number, o.status, o.total, o.created_at,
                u.name AS user_name
         FROM orders o
         JOIN users u ON u.id = o.user_id
         ORDER BY o.created_at DESC
         LIMIT 5",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(serde_json::json!({
        "total_users": total_users,
        "total_products": total_products,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "pending_orders": pending_orders,
        "recent_orders": recent_orders,
    })))
}

pub async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<UserQueryParams>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;
    let search = params.search.as_deref().map(|s| format!("%{s}%"));

    let users = sqlx::query_as::<_, AdminUserRow>(
        "SELECT id, name, email, phone, role, is_active, created_at
         FROM users
         WHERE ($1::text IS NULL OR name ILIKE $1 OR email ILIKE $1)
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(&search)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users
         WHERE ($1::text IS NULL OR name ILIKE $1 OR email ILIKE $1)",
    )
    .bind(&search)
    .fetch_one(&state.pool)
    .await?;

    Ok(response::paginated(users, PaginationMeta::new(page, per_page, total)))
}

pub async fn toggle_user_status(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user = sqlx::query_as::<_, UserToggleRow>(
        "UPDATE users SET is_active = NOT is_active
         WHERE id = $1
         RETURNING id, name, email, is_active",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(response::success(user))
}

pub async fn sales_report(
    State(state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    let monthly_sales = sqlx::query_as::<_, MonthlySaleRow>(
        "SELECT DATE_TRUNC('month', created_at) AS month,
                COUNT(*) AS order_count,
                SUM(total) AS revenue
         FROM orders
         WHERE status NOT IN ('cancelled', 'pending')
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY month DESC
         LIMIT 12",
    )
    .fetch_all(&state.pool)
    .await?;

    let top_products = sqlx::query_as::<_, TopProductRow>(
        "SELECT oi.product_name,
                SUM(oi.quantity) AS total_sold,
                SUM(oi.subtotal) AS total_revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status NOT IN ('cancelled', 'pending')
         GROUP BY oi.product_name
         ORDER BY total_sold DESC
         LIMIT 10",
    )
    .fetch_all(&state.pool)
    .await?;

    let order_status_summary = sqlx::query_as::<_, OrderStatusSummaryRow>(
        "SELECT status, COUNT(*) AS count FROM orders GROUP BY status",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(serde_json::json!({
        "monthly_sales": monthly_sales.iter().map(|m| serde_json::json!({
            "month": m.month,
            "order_count": m.order_count,
            "revenue": m.revenue,
        })).collect::<Vec<_>>(),
        "top_products": top_products.iter().map(|p| serde_json::json!({
            "product_name": p.product_name,
            "total_sold": p.total_sold,
            "total_revenue": p.total_revenue,
        })).collect::<Vec<_>>(),
        "order_status_summary": order_status_summary,
    })))
}
