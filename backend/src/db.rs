use sqlx::{PgPool, postgres::PgPoolOptions, Executor};

pub async fn create_pool(database_url: &str) -> anyhow::Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await?;

    tracing::info!("Database connection established");

    // Auto-migrate if tables are missing
    if let Err(e) = run_migrations_if_needed(&pool).await {
        tracing::error!("Failed to run auto-migrations: {:?}", e);
    }

    Ok(pool)
}

async fn run_migrations_if_needed(pool: &PgPool) -> anyhow::Result<()> {
    let row: (bool,) = sqlx::query_as(
        "SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users'
        );"
    )
    .fetch_one(pool)
    .await
    .unwrap_or((false,));

    if !row.0 {
        tracing::info!("Users table not found, running database migrations and seed data...");
        const INIT_SQL: &str = include_str!("../../database/migrations/001_init.sql");
        const SEED_SQL: &str = include_str!("../../database/migrations/002_seed.sql");
        const IMPR_SQL: &str = include_str!("../../database/migrations/003_improvements.sql");

        pool.execute(INIT_SQL).await?;
        pool.execute(SEED_SQL).await?;
        pool.execute(IMPR_SQL).await?;
        tracing::info!("Database migrations and seed completed successfully!");
    } else {
        // Run incremental improvements if not applied
        const IMPR_SQL: &str = include_str!("../../database/migrations/003_improvements.sql");
        let _ = pool.execute(IMPR_SQL).await;
    }

    Ok(())
}
