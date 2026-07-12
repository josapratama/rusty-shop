use axum::{
    extract::{Path, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;
use validator::Validate;

use crate::{
    config::AppState,
    dto::address::{CreateAddressRequest, UpdateAddressRequest},
    errors::{AppError, AppResult},
    utils::{jwt::Claims, response},
};

// ── Row structs ───────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow, Serialize)]
struct AddressRow {
    id: Uuid,
    label: String,
    recipient_name: String,
    phone: String,
    address_line: String,
    city: String,
    province: String,
    postal_code: String,
    is_default: bool,
    created_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct AddressExistingRow {
    label: String,
    recipient_name: String,
    phone: String,
    address_line: String,
    city: String,
    province: String,
    postal_code: String,
    is_default: bool,
}

#[derive(sqlx::FromRow, Serialize)]
struct AddressUpdateRow {
    id: Uuid,
    label: String,
    recipient_name: String,
    phone: String,
    address_line: String,
    city: String,
    province: String,
    postal_code: String,
    is_default: bool,
    updated_at: DateTime<Utc>,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

pub async fn list_addresses(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let addresses = sqlx::query_as::<_, AddressRow>(
        "SELECT id, label, recipient_name, phone, address_line,
                city, province, postal_code, is_default, created_at
         FROM addresses WHERE user_id = $1
         ORDER BY is_default DESC, created_at DESC",
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(addresses))
}

pub async fn create_address(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreateAddressRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let is_default = body.is_default.unwrap_or(false);

    if is_default {
        sqlx::query("UPDATE addresses SET is_default = FALSE WHERE user_id = $1")
            .bind(user_id)
            .execute(&state.pool)
            .await?;
    }

    let address = sqlx::query_as::<_, AddressRow>(
        "INSERT INTO addresses (user_id, label, recipient_name, phone, address_line,
                                city, province, postal_code, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, label, recipient_name, phone, address_line,
                   city, province, postal_code, is_default, created_at",
    )
    .bind(user_id)
    .bind(body.label.as_deref().unwrap_or("Rumah"))
    .bind(&body.recipient_name)
    .bind(&body.phone)
    .bind(&body.address_line)
    .bind(&body.city)
    .bind(&body.province)
    .bind(&body.postal_code)
    .bind(is_default)
    .fetch_one(&state.pool)
    .await?;

    Ok(response::created(address))
}

pub async fn update_address(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateAddressRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let existing = sqlx::query_as::<_, AddressExistingRow>(
        "SELECT label, recipient_name, phone, address_line,
                city, province, postal_code, is_default
         FROM addresses WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Address not found".to_string()))?;

    let new_is_default = body.is_default.unwrap_or(existing.is_default);

    if new_is_default && !existing.is_default {
        sqlx::query("UPDATE addresses SET is_default = FALSE WHERE user_id = $1")
            .bind(user_id)
            .execute(&state.pool)
            .await?;
    }

    let address = sqlx::query_as::<_, AddressUpdateRow>(
        "UPDATE addresses
         SET label = $1, recipient_name = $2, phone = $3, address_line = $4,
             city = $5, province = $6, postal_code = $7, is_default = $8
         WHERE id = $9 AND user_id = $10
         RETURNING id, label, recipient_name, phone, address_line,
                   city, province, postal_code, is_default, updated_at",
    )
    .bind(body.label.as_deref().unwrap_or(&existing.label))
    .bind(body.recipient_name.as_deref().unwrap_or(&existing.recipient_name))
    .bind(body.phone.as_deref().unwrap_or(&existing.phone))
    .bind(body.address_line.as_deref().unwrap_or(&existing.address_line))
    .bind(body.city.as_deref().unwrap_or(&existing.city))
    .bind(body.province.as_deref().unwrap_or(&existing.province))
    .bind(body.postal_code.as_deref().unwrap_or(&existing.postal_code))
    .bind(new_is_default)
    .bind(id)
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(response::success(address))
}

pub async fn delete_address(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let result = sqlx::query("DELETE FROM addresses WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Address not found".to_string()));
    }

    Ok(response::message("Address deleted"))
}
