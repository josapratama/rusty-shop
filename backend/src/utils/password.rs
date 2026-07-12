use bcrypt::{hash, verify, DEFAULT_COST};

pub fn hash_password(password: &str) -> anyhow::Result<String> {
    let hashed = hash(password, DEFAULT_COST)?;
    Ok(hashed)
}

pub fn verify_password(password: &str, hash: &str) -> anyhow::Result<bool> {
    let valid = verify(password, hash)?;
    Ok(valid)
}
