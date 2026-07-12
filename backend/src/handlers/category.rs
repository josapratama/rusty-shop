use axum::{
    extract::{Path, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use slug::slugify;
use uuid::Uuid;
use validator::Validate;

use crate::{
    config::AppState,
    dto::category::{CreateCategoryRequest, UpdateCategoryRequest},
    errors::{AppError, AppResult},
    utils::response,
};

// ── Row structs ───────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow, Serialize)]
struct CategoryRow {
    id: Uuid,
    name: String,
    slug: String,
    description: Option<String>,
    image_url: Option<String>,
    is_active: bool,
    created_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow, Serialize)]
struct CategoryAdminRow {
    id: Uuid,
    name: String,
    slug: String,
    description: Option<String>,
    image_url: Option<String>,
    is_active: bool,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

// ── Public handlers ───────────────────────────────────────────────────────────

pub async fn list_categories(
    State(state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    let categories = sqlx::query_as::<_, CategoryRow>(
        "SELECT id, name, slug, description, image_url, is_active, created_at
         FROM categories WHERE is_active = TRUE ORDER BY name",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(categories))
}

pub async fn get_category(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> AppResult<impl axum::response::IntoResponse> {
    let category = sqlx::query_as::<_, CategoryRow>(
        "SELECT id, name, slug, description, image_url, is_active, created_at
         FROM categories WHERE slug = $1",
    )
    .bind(&slug)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Category not found".to_string()))?;

    Ok(response::success(category))
}

// ── Admin handlers ────────────────────────────────────────────────────────────

pub async fn admin_list_categories(
    State(state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    let categories = sqlx::query_as::<_, CategoryAdminRow>(
        "SELECT id, name, slug, description, image_url, is_active, created_at, updated_at
         FROM categories ORDER BY created_at DESC",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(categories))
}

pub async fn create_category(
    State(state): State<AppState>,
    Json(body): Json<CreateCategoryRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let slug = slugify(&body.name);

    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM categories WHERE slug = $1",
    )
    .bind(&slug)
    .fetch_one(&state.pool)
    .await?;

    if existing > 0 {
        return Err(AppError::Conflict(
            "Category with this name already exists".to_string(),
        ));
    }

    let category = sqlx::query_as::<_, CategoryAdminRow>(
        "INSERT INTO categories (name, slug, description, image_url, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, slug, description, image_url, is_active, created_at, updated_at",
    )
    .bind(&body.name)
    .bind(&slug)
    .bind(&body.description)
    .bind(&body.image_url)
    .bind(body.is_active.unwrap_or(true))
    .fetch_one(&state.pool)
    .await?;

    Ok(response::created(category))
}

pub async fn update_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateCategoryRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    #[derive(sqlx::FromRow)]
    struct ExistingRow {
        name: String,
        description: Option<String>,
        image_url: Option<String>,
        is_active: bool,
    }

    let existing = sqlx::query_as::<_, ExistingRow>(
        "SELECT name, description, image_url, is_active FROM categories WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Category not found".to_string()))?;

    let new_name = body.name.as_deref().unwrap_or(&existing.name);
    let new_slug = slugify(new_name);
    let new_desc = body.description.as_deref().or(existing.description.as_deref());
    let new_image = body.image_url.as_deref().or(existing.image_url.as_deref());
    let new_active = body.is_active.unwrap_or(existing.is_active);

    let category = sqlx::query_as::<_, CategoryAdminRow>(
        "UPDATE categories
         SET name = $1, slug = $2, description = $3, image_url = $4, is_active = $5
         WHERE id = $6
         RETURNING id, name, slug, description, image_url, is_active, created_at, updated_at",
    )
    .bind(new_name)
    .bind(&new_slug)
    .bind(new_desc)
    .bind(new_image)
    .bind(new_active)
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    Ok(response::success(category))
}

pub async fn delete_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let product_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM products WHERE category_id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    if product_count > 0 {
        return Err(AppError::BadRequest(
            "Cannot delete category with existing products".to_string(),
        ));
    }

    let result = sqlx::query("DELETE FROM categories WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Category not found".to_string()));
    }

    Ok(response::message("Category deleted successfully"))
}
