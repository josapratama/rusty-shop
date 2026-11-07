use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use rust_decimal::Decimal;
use uuid::Uuid;
use validator::Validate;

use crate::{
    config::AppState,
    dto::coupon::{
        CouponValidationResponse, CreateCouponRequest, UpdateCouponRequest, ValidateCouponRequest,
    },
    errors::{AppError, AppResult},
    models::coupon::Coupon,
    utils::response,
};

pub async fn validate_coupon(
    State(state): State<AppState>,
    Json(payload): Json<ValidateCouponRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let code_upper = payload.code.trim().to_uppercase();

    let coupon = sqlx::query_as::<_, Coupon>(
        "SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND is_active = TRUE",
    )
    .bind(&code_upper)
    .fetch_optional(&state.pool)
    .await?;

    let coupon = match coupon {
        Some(c) => c,
        None => {
            return Err(AppError::BadRequest("Kupon tidak ditemukan atau sudah tidak aktif".to_string()));
        }
    };

    // Check expiration
    if let Some(expires_at) = coupon.expires_at {
        if expires_at < Utc::now() {
            return Err(AppError::BadRequest("Kupon sudah kedaluwarsa".to_string()));
        }
    }

    // Check usage limit
    if let Some(limit) = coupon.usage_limit {
        if coupon.used_count >= limit {
            return Err(AppError::BadRequest("Kuota kupon telah habis".to_string()));
        }
    }

    // Check minimum purchase
    if payload.subtotal < coupon.min_purchase {
        return Err(AppError::BadRequest(format!(
            "Minimum belanja untuk kupon ini adalah Rp {}",
            coupon.min_purchase
        )));
    }

    // Calculate discount amount
    let mut discount_amount = match coupon.discount_type.as_str() {
        "percentage" => (payload.subtotal * coupon.discount_value / Decimal::from(100)).round_dp(0),
        "fixed" => coupon.discount_value,
        _ => Decimal::ZERO,
    };

    // Cap at max_discount if specified
    if let Some(max) = coupon.max_discount {
        if discount_amount > max {
            discount_amount = max;
        }
    }

    // Discount cannot exceed subtotal
    if discount_amount > payload.subtotal {
        discount_amount = payload.subtotal;
    }

    Ok(response::success(CouponValidationResponse {
        valid: true,
        coupon_id: Some(coupon.id),
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount,
        description: coupon.description,
    }))
}

pub async fn admin_list_coupons(
    State(state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    let coupons = sqlx::query_as::<_, Coupon>(
        "SELECT * FROM coupons ORDER BY created_at DESC",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(coupons))
}

pub async fn admin_create_coupon(
    State(state): State<AppState>,
    Json(payload): Json<CreateCouponRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let code_upper = payload.code.trim().to_uppercase();
    let is_active = payload.is_active.unwrap_or(true);
    let min_purchase = payload.min_purchase.unwrap_or(Decimal::ZERO);

    let coupon = sqlx::query_as::<_, Coupon>(
        "INSERT INTO coupons (
            code, description, discount_type, discount_value,
            min_purchase, max_discount, usage_limit, expires_at, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *",
    )
    .bind(code_upper)
    .bind(payload.description)
    .bind(payload.discount_type.to_lowercase())
    .bind(payload.discount_value)
    .bind(min_purchase)
    .bind(payload.max_discount)
    .bind(payload.usage_limit)
    .bind(payload.expires_at)
    .bind(is_active)
    .fetch_one(&state.pool)
    .await?;

    Ok(response::created(coupon))
}

pub async fn admin_update_coupon(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<UpdateCouponRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let coupon = sqlx::query_as::<_, Coupon>(
        "UPDATE coupons
         SET description = COALESCE($2, description),
             discount_type = COALESCE($3, discount_type),
             discount_value = COALESCE($4, discount_value),
             min_purchase = COALESCE($5, min_purchase),
             max_discount = $6,
             usage_limit = $7,
             expires_at = $8,
             is_active = COALESCE($9, is_active)
         WHERE id = $1
         RETURNING *",
    )
    .bind(id)
    .bind(payload.description)
    .bind(payload.discount_type.map(|s| s.to_lowercase()))
    .bind(payload.discount_value)
    .bind(payload.min_purchase)
    .bind(payload.max_discount)
    .bind(payload.usage_limit)
    .bind(payload.expires_at)
    .bind(payload.is_active)
    .fetch_optional(&state.pool)
    .await?;

    let coupon = match coupon {
        Some(c) => c,
        None => return Err(AppError::NotFound("Kupon tidak ditemukan".to_string())),
    };

    Ok(response::success(coupon))
}

pub async fn admin_delete_coupon(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    let result = sqlx::query("DELETE FROM coupons WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Kupon tidak ditemukan".to_string()));
    }

    Ok(response::message("Kupon berhasil dihapus"))
}
