use axum::{extract::State, Json};
use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;
use validator::Validate;

use crate::{
    config::AppState,
    dto::user::{ChangePasswordRequest, UpdateProfileRequest},
    errors::{AppError, AppResult},
    models::user::UserRole,
    utils::{
        jwt::Claims,
        password::{hash_password, verify_password},
        response,
    },
};

// ── Row structs ───────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow, Serialize)]
struct ProfileRow {
    id: Uuid,
    name: String,
    email: String,
    phone: Option<String>,
    role: UserRole,
    is_active: bool,
    created_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct ProfileExistingRow {
    name: String,
    phone: Option<String>,
}

#[derive(sqlx::FromRow, Serialize)]
struct ProfileUpdateRow {
    id: Uuid,
    name: String,
    email: String,
    phone: Option<String>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct PasswordRow {
    password: String,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

pub async fn get_profile(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let user = sqlx::query_as::<_, ProfileRow>(
        "SELECT id, name, email, phone, role, is_active, created_at
         FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(response::success(user))
}

pub async fn update_profile(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<UpdateProfileRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let existing = sqlx::query_as::<_, ProfileExistingRow>(
        "SELECT name, phone FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    let user = sqlx::query_as::<_, ProfileUpdateRow>(
        "UPDATE users SET name = $1, phone = $2
         WHERE id = $3
         RETURNING id, name, email, phone, updated_at",
    )
    .bind(body.name.as_deref().unwrap_or(&existing.name))
    .bind(body.phone.as_deref().or(existing.phone.as_deref()))
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(response::success(user))
}

pub async fn change_password(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<ChangePasswordRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let row = sqlx::query_as::<_, PasswordRow>(
        "SELECT password FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    let valid = verify_password(&body.current_password, &row.password)
        .map_err(|_| AppError::InternalServerError)?;

    if !valid {
        return Err(AppError::BadRequest(
            "Current password is incorrect".to_string(),
        ));
    }

    let hashed = hash_password(&body.new_password).map_err(|_| AppError::InternalServerError)?;

    sqlx::query("UPDATE users SET password = $1 WHERE id = $2")
        .bind(&hashed)
        .bind(user_id)
        .execute(&state.pool)
        .await?;

    Ok(response::message("Password changed successfully"))
}
