use axum::{extract::State, Json};
use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;
use validator::Validate;

use crate::{
    config::AppState,
    dto::auth::{AuthResponse, LoginRequest, RegisterRequest, UserInfo},
    errors::{AppError, AppResult},
    models::user::UserRole,
    utils::{
        jwt::generate_token,
        password::{hash_password, verify_password},
        response,
    },
};

// ── Row structs ───────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct UserRow {
    id: Uuid,
    name: String,
    email: String,
    password: String,
    phone: Option<String>,
    role: UserRole,
    is_active: bool,
}

#[derive(sqlx::FromRow)]
struct UserInsertRow {
    id: Uuid,
    name: String,
    email: String,
    phone: Option<String>,
    role: UserRole,
}

#[derive(sqlx::FromRow, Serialize)]
struct UserMeRow {
    id: Uuid,
    name: String,
    email: String,
    phone: Option<String>,
    role: UserRole,
    is_active: bool,
    created_at: DateTime<Utc>,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE email = $1",
    )
    .bind(&body.email)
    .fetch_one(&state.pool)
    .await?;

    if existing > 0 {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    let hashed = hash_password(&body.password).map_err(|_| AppError::InternalServerError)?;

    let user = sqlx::query_as::<_, UserInsertRow>(
        "INSERT INTO users (name, email, password, phone, role)
         VALUES ($1, $2, $3, $4, 'user')
         RETURNING id, name, email, phone, role",
    )
    .bind(&body.name)
    .bind(&body.email)
    .bind(&hashed)
    .bind(&body.phone)
    .fetch_one(&state.pool)
    .await?;

    let token = generate_token(
        user.id,
        &user.email,
        &user.role,
        &state.config.jwt_secret,
        state.config.jwt_expires_days,
    )
    .map_err(|e| { tracing::error!("generate_token (register) failed: {:?}", e); AppError::InternalServerError })?;
    crate::utils::email::send_welcome(
        &state.config,
        &user.email,
        &user.name,
        &state.config.frontend_url,
    );

    Ok(response::created(AuthResponse {
        token,
        user: UserInfo {
            id: user.id.to_string(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role.to_string(),
        },
    }))
}

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let user = sqlx::query_as::<_, UserRow>(
        "SELECT id, name, email, password, phone, role, is_active
         FROM users WHERE email = $1",
    )
    .bind(&body.email)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Invalid email or password".to_string()))?;

    if !user.is_active {
        return Err(AppError::Unauthorized("Account is disabled".to_string()));
    }

    let valid = verify_password(&body.password, &user.password)
        .map_err(|_| AppError::InternalServerError)?;

    if !valid {
        return Err(AppError::Unauthorized("Invalid email or password".to_string()));
    }

    let token = generate_token(
        user.id,
        &user.email,
        &user.role,
        &state.config.jwt_secret,
        state.config.jwt_expires_days,
    )
    .map_err(|e| { tracing::error!("generate_token (login) failed: {:?}", e); AppError::InternalServerError })?;

    Ok(response::success(AuthResponse {
        token,
        user: UserInfo {
            id: user.id.to_string(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role.to_string(),
        },
    }))
}

pub async fn me(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<crate::utils::jwt::Claims>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let user = sqlx::query_as::<_, UserMeRow>(
        "SELECT id, name, email, phone, role, is_active, created_at
         FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(response::success(user))
}
