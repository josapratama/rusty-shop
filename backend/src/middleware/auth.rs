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
pub async fn require_auth(
    State(state): State<AppState>,
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let token = auth.token();
    let claims = verify_token(token, &state.config.jwt_secret)
        .map_err(|_| AppError::Unauthorized("Invalid or expired token".to_string()))?;

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
