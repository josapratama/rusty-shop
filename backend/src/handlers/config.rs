use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::{
    config::AppState,
    errors::AppResult,
    utils::response,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct BankAccountConfig {
    pub bank: String,
    pub account_number: String,
    pub holder_name: String,
}

#[derive(sqlx::FromRow)]
struct ConfigRow {
    key: String,
    value: String,
}

/// GET /config (Public)
/// Returns all store configuration settings
pub async fn get_shop_config(
    State(state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    let rows = sqlx::query_as::<_, ConfigRow>("SELECT key, value FROM shop_config")
        .fetch_all(&state.pool)
        .await?;

    let mut map: HashMap<String, String> = rows.into_iter().map(|r| (r.key, r.value)).collect();

    // Ensure sensible defaults exist
    map.entry("shipping_cost_per_gram".to_string())
        .or_insert_with(|| "0.5".to_string());
    map.entry("shop_name".to_string())
        .or_insert_with(|| state.config.app_name.clone());
    map.entry("whatsapp_number".to_string())
        .or_insert_with(|| "6281234567890".to_string());
    map.entry("bank_accounts".to_string()).or_insert_with(|| {
        serde_json::to_string(&vec![
            BankAccountConfig {
                bank: "BCA".to_string(),
                account_number: "1234567890".to_string(),
                holder_name: "Online Shop".to_string(),
            },
            BankAccountConfig {
                bank: "Mandiri".to_string(),
                account_number: "9876543210".to_string(),
                holder_name: "Online Shop".to_string(),
            },
        ])
        .unwrap_or_else(|_| "[]".to_string())
    });

    Ok(response::success(map))
}

#[derive(Debug, Deserialize)]
pub struct UpdateConfigPayload {
    pub configs: HashMap<String, String>,
}

/// PUT /admin/config (Admin)
/// Batch update configuration key-values
pub async fn update_shop_config(
    State(state): State<AppState>,
    Json(payload): Json<UpdateConfigPayload>,
) -> AppResult<impl axum::response::IntoResponse> {
    let mut tx = state.pool.begin().await?;

    for (k, v) in &payload.configs {
        sqlx::query(
            "INSERT INTO shop_config (key, value)
             VALUES ($1, $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        )
        .bind(k)
        .bind(v)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    Ok(response::message("Store settings updated successfully"))
}
