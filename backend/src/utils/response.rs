use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use serde_json::json;

use super::pagination::PaginationMeta;

pub fn success<T: Serialize>(data: T) -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(json!({ "success": true, "data": data })),
    )
}

pub fn created<T: Serialize>(data: T) -> impl IntoResponse {
    (
        StatusCode::CREATED,
        Json(json!({ "success": true, "data": data })),
    )
}

pub fn paginated<T: Serialize>(data: T, meta: PaginationMeta) -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(json!({ "success": true, "data": data, "meta": meta })),
    )
}

pub fn message(msg: &str) -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(json!({ "success": true, "message": msg })),
    )
}
