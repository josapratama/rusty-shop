use axum::{
    middleware,
    routing::{delete, get, post, put, patch},
    Router,
};
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_governor::{
    governor::GovernorConfigBuilder,
    key_extractor::GlobalKeyExtractor,
    GovernorLayer,
};
use tower_http::services::{ServeDir, ServeFile};

use crate::{
    config::AppState,
    handlers::{admin, auth, cart, address, category, order, product, upload, user, coupon, review, wishlist, config},
    middleware::auth::{require_admin, require_auth},
};

pub fn create_router(state: AppState) -> Router {
    let upload_dir = state.config.upload_dir.clone();

    let api = Router::new()
        // Public routes
        .merge(public_routes())
        // Auth required routes
        .merge(user_routes(state.clone()))
        // Admin routes
        .merge(admin_routes(state.clone()));

    // Ensure upload directory exists
    let _ = std::fs::create_dir_all(&upload_dir);

    let mut router = Router::new()
        .nest("/api/v1", api)
        // Serve uploaded files as static assets
        .nest_service("/uploads", ServeDir::new(upload_dir));

    let dist_dir = std::env::var("FRONTEND_DIST").unwrap_or_else(|_| "dist".to_string());
    let dist_path = std::path::Path::new(&dist_dir);
    if dist_path.is_dir() {
        let index_file = dist_path.join("index.html");
        if index_file.is_file() {
            let serve_dir = ServeDir::new(dist_path).fallback(ServeFile::new(index_file));
            router = router.fallback_service(serve_dir);
        }
    }

    router.with_state(state)
}

fn public_routes() -> Router<AppState> {
    // Rate limit auth endpoints: 30 requests per minute globally
    let auth_rate_limit = Arc::new(
        GovernorConfigBuilder::default()
            .key_extractor(GlobalKeyExtractor)
            .per_second(2)
            .burst_size(10)
            .finish()
            .expect("Invalid rate limit config"),
    );

    Router::new()
        // Auth (rate-limited)
        .route("/auth/register", post(auth::register))
        .route("/auth/login", post(auth::login))
        .layer(
            ServiceBuilder::new()
                .layer(GovernorLayer { config: auth_rate_limit }),
        )
        // Products (public)
        .route("/products", get(product::list_products))
        .route("/products/:slug", get(product::get_product))
        .route("/products/:slug/related", get(product::get_related_products))
        .route("/products/:id/reviews", get(review::list_product_reviews))
        // Categories (public)
        .route("/categories", get(category::list_categories))
        .route("/categories/:slug", get(category::get_category))
        // Store Config (public)
        .route("/config", get(config::get_shop_config))
        // Coupons (validation)
        .route("/coupons/validate", post(coupon::validate_coupon))
}

fn user_routes(state: AppState) -> Router<AppState> {
    Router::new()
        // Auth
        .route("/auth/me", get(auth::me))
        // Profile
        .route("/profile", get(user::get_profile))
        .route("/profile", put(user::update_profile))
        .route("/profile/password", put(user::change_password))
        // Cart
        .route("/cart", get(cart::get_cart))
        .route("/cart/items", post(cart::add_to_cart))
        .route("/cart/items/:id", put(cart::update_cart_item))
        .route("/cart/items/:id", delete(cart::remove_cart_item))
        .route("/cart", delete(cart::clear_cart))
        // Addresses
        .route("/addresses", get(address::list_addresses))
        .route("/addresses", post(address::create_address))
        .route("/addresses/:id", put(address::update_address))
        .route("/addresses/:id", delete(address::delete_address))
        // Orders
        .route("/orders", post(order::checkout))
        .route("/orders", get(order::list_my_orders))
        .route("/orders/:id", get(order::get_my_order))
        .route("/orders/:id/cancel", post(order::cancel_order))
        .route("/orders/:id/payment-proof", post(upload::set_order_payment_proof))
        // Upload
        .route("/upload/payment-proof", post(upload::upload_payment_proof))
        // Reviews
        .route("/reviews", post(review::create_review))
        // Wishlist
        .route("/wishlist", get(wishlist::list_wishlist))
        .route("/wishlist/ids", get(wishlist::get_wishlist_ids))
        .route("/wishlist/:id", post(wishlist::toggle_wishlist))
        .layer(middleware::from_fn_with_state(state, require_auth))
}

fn admin_routes(state: AppState) -> Router<AppState> {
    Router::new()
        // Dashboard
        .route("/admin/dashboard", get(admin::dashboard_stats))
        .route("/admin/reports", get(admin::sales_report))
        // Users
        .route("/admin/users", get(admin::list_users))
        .route("/admin/users/:id/toggle-status", patch(admin::toggle_user_status))
        // Categories
        .route("/admin/categories", get(category::admin_list_categories))
        .route("/admin/categories", post(category::create_category))
        .route("/admin/categories/:id", put(category::update_category))
        .route("/admin/categories/:id", delete(category::delete_category))
        // Products
        .route("/admin/products", get(product::admin_list_products))
        .route("/admin/products", post(product::create_product))
        .route("/admin/products/:id", get(product::admin_get_product))
        .route("/admin/products/:id", put(product::update_product))
        .route("/admin/products/:id", delete(product::delete_product))
        // Orders
        .route("/admin/orders", get(order::admin_list_orders))
        .route("/admin/orders/:id", get(order::admin_get_order))
        .route("/admin/orders/:id/status", patch(order::admin_update_order_status))
        // Upload (Admin)
        .route("/upload/product-image", post(upload::upload_product_image))
        // Coupons
        .route("/admin/coupons", get(coupon::admin_list_coupons))
        .route("/admin/coupons", post(coupon::admin_create_coupon))
        .route("/admin/coupons/:id", put(coupon::admin_update_coupon))
        .route("/admin/coupons/:id", delete(coupon::admin_delete_coupon))
        // Settings / Config (Admin)
        .route("/admin/config", get(config::get_shop_config))
        .route("/admin/config", put(config::update_shop_config))
        .layer(middleware::from_fn(require_admin))
        .layer(middleware::from_fn_with_state(state, require_auth))
}
