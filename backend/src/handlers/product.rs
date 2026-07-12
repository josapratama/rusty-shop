use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::Serialize;
use slug::slugify;
use uuid::Uuid;
use validator::Validate;

use crate::{
    config::AppState,
    dto::product::{CreateProductRequest, ProductQueryParams, UpdateProductRequest},
    errors::{AppError, AppResult},
    utils::{pagination::PaginationMeta, response},
};

// ── Row structs ───────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct ProductListRow {
    id: Uuid,
    name: String,
    slug: String,
    price: Decimal,
    stock: i32,
    #[allow(dead_code)]
    is_active: bool,
    category_name: String,
    category_slug: String,
    primary_image: Option<String>,
}

#[derive(sqlx::FromRow)]
struct ProductDetailRow {
    id: Uuid,
    category_id: Uuid,
    name: String,
    slug: String,
    description: Option<String>,
    price: Decimal,
    stock: i32,
    weight: Option<Decimal>,
    is_active: bool,
    category_name: String,
    category_slug: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct ProductAdminDetailRow {
    id: Uuid,
    category_id: Uuid,
    name: String,
    slug: String,
    description: Option<String>,
    price: Decimal,
    stock: i32,
    weight: Option<Decimal>,
    is_active: bool,
    category_name: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow, Serialize)]
struct ProductImageRow {
    id: Uuid,
    image_url: String,
    is_primary: bool,
    sort_order: i32,
}

#[derive(sqlx::FromRow)]
struct ProductInsertRow {
    id: Uuid,
    name: String,
    slug: String,
    price: Decimal,
    stock: i32,
    is_active: bool,
    created_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct ProductUpdateRow {
    id: Uuid,
    name: String,
    slug: String,
    price: Decimal,
    stock: i32,
    is_active: bool,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct ProductExistingRow {
    #[allow(dead_code)]
    id: Uuid,
    category_id: Uuid,
    name: String,
    slug: String,
    description: Option<String>,
    price: Decimal,
    stock: i32,
    weight: Option<Decimal>,
    is_active: bool,
}

// ── Public handlers ───────────────────────────────────────────────────────────

pub async fn list_products(
    State(state): State<AppState>,
    Query(params): Query<ProductQueryParams>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(12).min(100);
    let offset = (page - 1) * per_page;
    let search = params.search.as_deref().map(|s| format!("%{s}%"));

    let products = sqlx::query_as::<_, ProductListRow>(
        r#"SELECT p.id, p.name, p.slug, p.price, p.stock, p.is_active,
                  c.name AS category_name, c.slug AS category_slug,
                  (SELECT image_url FROM product_images
                   WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS primary_image
           FROM products p
           JOIN categories c ON c.id = p.category_id
           WHERE p.is_active = TRUE
             AND ($1::text IS NULL OR p.name ILIKE $1 OR p.description ILIKE $1)
             AND ($2::text IS NULL OR c.slug = $2)
             AND ($3::numeric IS NULL OR p.price >= $3)
             AND ($4::numeric IS NULL OR p.price <= $4)
           ORDER BY p.created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(&search)
    .bind(params.category.as_deref())
    .bind(params.min_price)
    .bind(params.max_price)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM products p
           JOIN categories c ON c.id = p.category_id
           WHERE p.is_active = TRUE
             AND ($1::text IS NULL OR p.name ILIKE $1 OR p.description ILIKE $1)
             AND ($2::text IS NULL OR c.slug = $2)
             AND ($3::numeric IS NULL OR p.price >= $3)
             AND ($4::numeric IS NULL OR p.price <= $4)"#,
    )
    .bind(&search)
    .bind(params.category.as_deref())
    .bind(params.min_price)
    .bind(params.max_price)
    .fetch_one(&state.pool)
    .await?;

    let data: Vec<_> = products
        .iter()
        .map(|p| {
            serde_json::json!({
                "id": p.id,
                "name": p.name,
                "slug": p.slug,
                "price": p.price,
                "stock": p.stock,
                "category_name": p.category_name,
                "category_slug": p.category_slug,
                "primary_image": p.primary_image,
            })
        })
        .collect();

    Ok(response::paginated(data, PaginationMeta::new(page, per_page, total)))
}

pub async fn get_product(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> AppResult<impl axum::response::IntoResponse> {
    let product = sqlx::query_as::<_, ProductDetailRow>(
        r#"SELECT p.id, p.category_id, p.name, p.slug, p.description,
                  p.price, p.stock, p.weight, p.is_active, p.created_at, p.updated_at,
                  c.name AS category_name, c.slug AS category_slug
           FROM products p
           JOIN categories c ON c.id = p.category_id
           WHERE p.slug = $1 AND p.is_active = TRUE"#,
    )
    .bind(&slug)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

    let images = sqlx::query_as::<_, ProductImageRow>(
        "SELECT id, image_url, is_primary, sort_order
         FROM product_images WHERE product_id = $1 ORDER BY sort_order",
    )
    .bind(product.id)
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(serde_json::json!({
        "id": product.id,
        "category_id": product.category_id,
        "category_name": product.category_name,
        "category_slug": product.category_slug,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "price": product.price,
        "stock": product.stock,
        "weight": product.weight,
        "is_active": product.is_active,
        "images": images,
        "created_at": product.created_at,
        "updated_at": product.updated_at,
    })))
}

// ── Admin handlers ────────────────────────────────────────────────────────────

pub async fn admin_list_products(
    State(state): State<AppState>,
    Query(params): Query<ProductQueryParams>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;
    let search = params.search.as_deref().map(|s| format!("%{s}%"));

    #[derive(sqlx::FromRow)]
    struct Row {
        id: Uuid,
        name: String,
        slug: String,
        price: Decimal,
        stock: i32,
        is_active: bool,
        category_name: String,
        primary_image: Option<String>,
        created_at: DateTime<Utc>,
    }

    let products = sqlx::query_as::<_, Row>(
        r#"SELECT p.id, p.name, p.slug, p.price, p.stock, p.is_active, p.created_at,
                  c.name AS category_name,
                  (SELECT image_url FROM product_images
                   WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS primary_image
           FROM products p
           JOIN categories c ON c.id = p.category_id
           WHERE ($1::text IS NULL OR p.name ILIKE $1)
           ORDER BY p.created_at DESC
           LIMIT $2 OFFSET $3"#,
    )
    .bind(&search)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM products WHERE ($1::text IS NULL OR name ILIKE $1)",
    )
    .bind(&search)
    .fetch_one(&state.pool)
    .await?;

    let data: Vec<_> = products
        .iter()
        .map(|p| {
            serde_json::json!({
                "id": p.id,
                "name": p.name,
                "slug": p.slug,
                "price": p.price,
                "stock": p.stock,
                "is_active": p.is_active,
                "category_name": p.category_name,
                "primary_image": p.primary_image,
                "created_at": p.created_at,
            })
        })
        .collect();

    Ok(response::paginated(data, PaginationMeta::new(page, per_page, total)))
}

pub async fn admin_get_product(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let product = sqlx::query_as::<_, ProductAdminDetailRow>(
        r#"SELECT p.id, p.category_id, p.name, p.slug, p.description,
                  p.price, p.stock, p.weight, p.is_active, p.created_at, p.updated_at,
                  c.name AS category_name
           FROM products p
           JOIN categories c ON c.id = p.category_id
           WHERE p.id = $1"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

    let images = sqlx::query_as::<_, ProductImageRow>(
        "SELECT id, image_url, is_primary, sort_order
         FROM product_images WHERE product_id = $1 ORDER BY sort_order",
    )
    .bind(product.id)
    .fetch_all(&state.pool)
    .await?;

    Ok(response::success(serde_json::json!({
        "id": product.id,
        "category_id": product.category_id,
        "category_name": product.category_name,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "price": product.price,
        "stock": product.stock,
        "weight": product.weight,
        "is_active": product.is_active,
        "images": images,
        "created_at": product.created_at,
        "updated_at": product.updated_at,
    })))
}

pub async fn create_product(
    State(state): State<AppState>,
    Json(body): Json<CreateProductRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    if body.price < Decimal::ZERO {
        return Err(AppError::BadRequest("Price must be >= 0".to_string()));
    }
    if body.stock < 0 {
        return Err(AppError::BadRequest("Stock must be >= 0".to_string()));
    }

    let slug = slugify(&body.name);

    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM products WHERE slug = $1",
    )
    .bind(&slug)
    .fetch_one(&state.pool)
    .await?;

    if existing > 0 {
        return Err(AppError::Conflict(
            "Product with this name already exists".to_string(),
        ));
    }

    let product = sqlx::query_as::<_, ProductInsertRow>(
        "INSERT INTO products (category_id, name, slug, description, price, stock, weight, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, slug, price, stock, is_active, created_at",
    )
    .bind(body.category_id)
    .bind(&body.name)
    .bind(&slug)
    .bind(&body.description)
    .bind(body.price)
    .bind(body.stock)
    .bind(body.weight)
    .bind(body.is_active.unwrap_or(true))
    .fetch_one(&state.pool)
    .await?;

    if let Some(images) = &body.images {
        for (i, img) in images.iter().enumerate() {
            sqlx::query(
                "INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
                 VALUES ($1, $2, $3, $4)",
            )
            .bind(product.id)
            .bind(&img.image_url)
            .bind(img.is_primary.unwrap_or(i == 0))
            .bind(img.sort_order.unwrap_or(i as i32))
            .execute(&state.pool)
            .await?;
        }
    }

    Ok(response::created(serde_json::json!({
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "price": product.price,
        "stock": product.stock,
        "is_active": product.is_active,
        "created_at": product.created_at,
    })))
}

pub async fn update_product(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateProductRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    body.validate().map_err(|e| AppError::BadRequest(e.to_string()))?;

    let existing = sqlx::query_as::<_, ProductExistingRow>(
        "SELECT id, category_id, name, slug, description, price, stock, weight, is_active
         FROM products WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

    let new_name = body.name.as_deref().unwrap_or(&existing.name);
    let new_slug = if body.name.is_some() {
        slugify(new_name)
    } else {
        existing.slug.clone()
    };

    let product = sqlx::query_as::<_, ProductUpdateRow>(
        "UPDATE products
         SET category_id = $1, name = $2, slug = $3, description = $4,
             price = $5, stock = $6, weight = $7, is_active = $8
         WHERE id = $9
         RETURNING id, name, slug, price, stock, is_active, updated_at",
    )
    .bind(body.category_id.unwrap_or(existing.category_id))
    .bind(new_name)
    .bind(&new_slug)
    .bind(body.description.as_deref().or(existing.description.as_deref()))
    .bind(body.price.unwrap_or(existing.price))
    .bind(body.stock.unwrap_or(existing.stock))
    .bind(body.weight.or(existing.weight))
    .bind(body.is_active.unwrap_or(existing.is_active))
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    if let Some(images) = &body.images {
        sqlx::query("DELETE FROM product_images WHERE product_id = $1")
            .bind(id)
            .execute(&state.pool)
            .await?;

        for (i, img) in images.iter().enumerate() {
            sqlx::query(
                "INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
                 VALUES ($1, $2, $3, $4)",
            )
            .bind(id)
            .bind(&img.image_url)
            .bind(img.is_primary.unwrap_or(i == 0))
            .bind(img.sort_order.unwrap_or(i as i32))
            .execute(&state.pool)
            .await?;
        }
    }

    Ok(response::success(serde_json::json!({
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "price": product.price,
        "stock": product.stock,
        "is_active": product.is_active,
        "updated_at": product.updated_at,
    })))
}

pub async fn delete_product(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let result = sqlx::query("DELETE FROM products WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Product not found".to_string()));
    }

    Ok(response::message("Product deleted successfully"))
}
