use axum::{
    body::Bytes,
    extract::{Multipart, State},
};
use std::path::PathBuf;
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::{AppError, AppResult},
    utils::{jwt::Claims, response},
};

/// Allowed image MIME types
const ALLOWED_TYPES: &[&str] = &["image/jpeg", "image/png", "image/webp"];
/// Max file size: 5 MB
const MAX_SIZE: usize = 5 * 1024 * 1024;

/// POST /upload/payment-proof
/// Upload a payment proof image for a pending order.
/// Returns the public URL of the uploaded file.
pub async fn upload_payment_proof(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    // Extract the file field
    let field = multipart
        .next_field()
        .await
        .map_err(|_| AppError::BadRequest("Failed to read multipart field".to_string()))?
        .ok_or_else(|| AppError::BadRequest("No file provided".to_string()))?;

    let content_type = field
        .content_type()
        .map(|s| s.to_string())
        .unwrap_or_default();

    if !ALLOWED_TYPES.contains(&content_type.as_str()) {
        return Err(AppError::BadRequest(
            "Only JPEG, PNG, and WebP images are allowed".to_string(),
        ));
    }

    let ext = match content_type.as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        _ => "bin",
    };

    let data: Bytes = field
        .bytes()
        .await
        .map_err(|_| AppError::BadRequest("Failed to read file data".to_string()))?;

    if data.len() > MAX_SIZE {
        return Err(AppError::BadRequest(
            "File too large. Maximum size is 5 MB".to_string(),
        ));
    }

    // Save to uploads/payment_proofs/<user_id>/<uuid>.<ext>
    let upload_dir = PathBuf::from(&state.config.upload_dir)
        .join("payment_proofs")
        .join(user_id.to_string());

    tokio::fs::create_dir_all(&upload_dir)
        .await
        .map_err(|_| AppError::InternalServerError)?;

    let filename = format!("{}.{}", Uuid::new_v4(), ext);
    let filepath = upload_dir.join(&filename);

    tokio::fs::write(&filepath, &data)
        .await
        .map_err(|_| AppError::InternalServerError)?;

    // Return public URL
    let public_url = format!(
        "{}/uploads/payment_proofs/{}/{}",
        state.config.base_url, user_id, filename
    );

    Ok(response::created(serde_json::json!({
        "url": public_url,
    })))
}

/// POST /orders/:id/payment-proof
/// Attach an already-uploaded payment proof URL to a pending order.
pub async fn set_order_payment_proof(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    axum::extract::Path(order_id): axum::extract::Path<Uuid>,
    axum::Json(body): axum::Json<SetPaymentProofRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let user_id: Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("Invalid token".to_string()))?;

    let rows = sqlx::query(
        "UPDATE orders
         SET payment_proof = $1
         WHERE id = $2 AND user_id = $3 AND status = 'pending'",
    )
    .bind(&body.payment_proof_url)
    .bind(order_id)
    .bind(user_id)
    .execute(&state.pool)
    .await?;

    if rows.rows_affected() == 0 {
        return Err(AppError::BadRequest(
            "Order not found or not in pending status".to_string(),
        ));
    }

    Ok(response::message("Payment proof submitted"))
}

#[derive(serde::Deserialize)]
pub struct SetPaymentProofRequest {
    pub payment_proof_url: String,
}
