use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PaginationMeta {
    pub page: i64,
    pub per_page: i64,
    pub total: i64,
    pub total_pages: i64,
}

impl PaginationMeta {
    pub fn new(page: i64, per_page: i64, total: i64) -> Self {
        let total_pages = if per_page > 0 {
            (total as f64 / per_page as f64).ceil() as i64
        } else {
            0
        };
        Self { page, per_page, total, total_pages }
    }
}
