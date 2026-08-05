use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserRole { User, Admin }

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub email: String,
    pub role: UserRole,
    pub exp: usize,
    pub iat: usize,
}

fn main() {
    let secret = "ganti-dengan-secret-yang-kuat-min-32-karakter";
    let claims = Claims {
        sub: "test-id".to_string(),
        email: "test@test.com".to_string(),
        role: UserRole::Admin,
        exp: 9999999999,
        iat: 0,
    };

    match jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(secret.as_bytes()),
    ) {
        Ok(t)  => println!("JWT OK: {}...", &t[..40]),
        Err(e) => println!("JWT ERROR: {:?}", e),
    }
}
