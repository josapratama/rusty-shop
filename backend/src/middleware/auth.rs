use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};

use crate::{
    config::AppState,
    errors::AppError,
    models::user::UserRole,
    utils::jwt::{verify_token, Claims},
};

/// Extracts and validates JWT from Authorization header.
/// Injects Claims into request extensions.
/// Also checks that the token was issued AFTER the last password change.
pub async fn require_auth(
    State(state): State<AppState>,
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let token = auth.token();
    let claims = verify_token(token, &state.config.jwt_secret)
        .map_err(|_| AppError::Unauthorized("Invalid or expired token".to_string()))?;

    // #10: Check user is active AND validate token wasn't issued before password change
    let user_id: uuid::Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    // #10: Check user is active AND validate token wasn't issued before password change
    // Dua query scalar terpisah untuk menghindari masalah FromRow dengan nullable TIMESTAMPTZ
    let is_active = sqlx::query_scalar::<_, bool>(
        "SELECT is_active FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| { tracing::error!("DB error (is_active): {:?}", e); AppError::InternalServerError })?
    .ok_or_else(|| AppError::Unauthorized("Account not found".to_string()))?;

    if !is_active {
        return Err(AppError::Unauthorized("Account is disabled".to_string()));
    }

    // Check password change invalidation (only if password was ever changed)
    let changed_at_epoch = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT EXTRACT(EPOCH FROM password_changed_at)::bigint FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| { tracing::error!("DB error (pwd_changed_at): {:?}", e); AppError::InternalServerError })?;

    if let Some(epoch) = changed_at_epoch {
        if (claims.iat as i64) < epoch {
            return Err(AppError::Unauthorized(
                "Token expired due to password change. Please login again.".to_string(),
            ));
        }
    }

    req.extensions_mut().insert(claims);
    Ok(next.run(req).await)
}

/// Requires admin role. Must be used after require_auth.
pub async fn require_admin(
    req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let claims = req
        .extensions()
        .get::<Claims>()
        .ok_or_else(|| AppError::Unauthorized("Not authenticated".to_string()))?;

    if claims.role != UserRole::Admin {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }

    Ok(next.run(req).await)
}
