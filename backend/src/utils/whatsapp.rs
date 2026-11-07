use serde::Serialize;

#[derive(Serialize)]
struct WhatsAppPayload<'a> {
    phone: &'a str,
    to: &'a str,
    message: &'a str,
    text: &'a str,
}

pub fn send_whatsapp_async(wabridge_url: Option<String>, phone: String, message: String) {
    let url = match wabridge_url {
        Some(u) if !u.trim().is_empty() => u,
        _ => return, // WhatsApp integration not enabled
    };

    tokio::spawn(async move {
        let client = match reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("Failed to build reqwest client for WhatsApp: {:?}", e);
                return;
            }
        };

        let payload = WhatsAppPayload {
            phone: &phone,
            to: &phone,
            message: &message,
            text: &message,
        };

        match client.post(&url).json(&payload).send().await {
            Ok(res) if res.status().is_success() => {
                tracing::info!("WhatsApp notification successfully dispatched to {}", phone);
            }
            Ok(res) => {
                tracing::warn!(
                    "WhatsApp dispatch to {} returned non-success status: {}",
                    phone,
                    res.status()
                );
            }
            Err(e) => {
                tracing::warn!("Failed to dispatch WhatsApp message to {}: {:?}", phone, e);
            }
        }
    });
}

