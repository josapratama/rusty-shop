use sqlx::PgPool;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expires_days: i64,
    pub host: String,
    pub port: u16,
    pub frontend_url: String,
    pub base_url: String,
    pub upload_dir: String,
    // Email / SMTP — all optional; if not set, emails are silently skipped
    pub smtp_host: Option<String>,
    pub smtp_port: u16,
    pub smtp_username: Option<String>,
    pub smtp_password: Option<String>,
    pub email_from: String,
    pub app_name: String,
    pub wabridge_url: Option<String>,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        let mut jwt_secret = std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "change-this-secret-in-production-min-32-chars-random-key".to_string());

        // Enforce minimum secret length for security
        if jwt_secret.len() < 32 {
            jwt_secret = format!("{}-padding-to-ensure-at-least-32-bytes-long", jwt_secret);
        }

        // Parse JWT_EXPIRES_IN like "7d" -> 7 days
        let jwt_expires_in = std::env::var("JWT_EXPIRES_IN")
            .unwrap_or_else(|_| "7d".to_string());
        let jwt_expires_days: i64 = jwt_expires_in
            .trim_end_matches('d')
            .parse()
            .unwrap_or(7);

        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/online_shop".to_string());

        Ok(Self {
            database_url,
            jwt_secret,
            jwt_expires_days,
            host: std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .unwrap_or(8080),
            frontend_url: std::env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
            base_url: std::env::var("BASE_URL")
                .unwrap_or_else(|_| "http://localhost:8080".to_string()),
            upload_dir: std::env::var("UPLOAD_DIR")
                .unwrap_or_else(|_| "./uploads".to_string()),
            smtp_host: std::env::var("SMTP_HOST").ok().filter(|s| !s.is_empty()),
            smtp_port: std::env::var("SMTP_PORT")
                .unwrap_or_else(|_| "587".to_string())
                .parse()
                .unwrap_or(587),
            smtp_username: std::env::var("SMTP_USERNAME").ok().filter(|s| !s.is_empty()),
            smtp_password: std::env::var("SMTP_PASSWORD").ok().filter(|s| !s.is_empty()),
            email_from: std::env::var("EMAIL_FROM")
                .unwrap_or_else(|_| "noreply@example.com".to_string()),
            app_name: std::env::var("APP_NAME")
                .unwrap_or_else(|_| "Online Shop".to_string()),
            wabridge_url: std::env::var("WABRIDGE_URL").ok().filter(|s| !s.is_empty()),
        })
    }
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: AppConfig,
}
