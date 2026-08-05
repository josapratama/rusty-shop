//! Email notification service using lettre + SMTP.
//!
//! All public functions spawn a background task and return immediately —
//! email failures are logged but never propagate to the caller.
//! If SMTP is not configured (SMTP_HOST not set), all sends are no-ops.

use lettre::{
    message::{header::ContentType, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use rust_decimal::Decimal;

use crate::config::AppConfig;

// ── Transport builder ─────────────────────────────────────────────────────────

/// Build an SMTP transport from config. Returns None if SMTP_HOST is not set.
fn build_transport(config: &AppConfig) -> Option<AsyncSmtpTransport<Tokio1Executor>> {
    let host = config.smtp_host.as_deref()?;

    let mut builder = if config.smtp_port == 465 {
        AsyncSmtpTransport::<Tokio1Executor>::relay(host)
    } else {
        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(host)
    }
    .ok()?
    .port(config.smtp_port);

    if let (Some(user), Some(pass)) = (
        config.smtp_username.as_deref(),
        config.smtp_password.as_deref(),
    ) {
        builder = builder.credentials(Credentials::new(user.to_string(), pass.to_string()));
    }

    Some(builder.build())
}

// ── Internal send helper ──────────────────────────────────────────────────────

/// Spawn a background task to send the email. Never blocks, never panics.
fn spawn_send(
    transport: AsyncSmtpTransport<Tokio1Executor>,
    message: Message,
    description: &'static str,
) {
    tokio::spawn(async move {
        match transport.send(message).await {
            Ok(_) => tracing::info!("Email sent: {}", description),
            Err(e) => tracing::warn!("Email send failed ({}): {:?}", description, e),
        }
    });
}

// ── HTML template helper ──────────────────────────────────────────────────────

fn base_html(app_name: &str, title: &str, body_html: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
    <!-- Header -->
    <div style="background:#4f46e5;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">🛍️ {app_name}</h1>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      {body_html}
    </div>
    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;font-size:12px;color:#6b7280;">
      Email ini dikirim otomatis, mohon tidak membalas.<br>
      © {app_name}
    </div>
  </div>
</body>
</html>"#,
        title = title,
        app_name = app_name,
        body_html = body_html,
    )
}

fn format_idr(amount: Decimal) -> String {
    // Simple IDR formatting: Rp 1.234.567
    let amount_str = amount.round_dp(0).to_string();
    let digits: String = amount_str.chars().filter(|c| c.is_ascii_digit()).collect();
    let formatted: String = digits
        .chars()
        .rev()
        .enumerate()
        .flat_map(|(i, c)| {
            if i > 0 && i % 3 == 0 {
                vec!['.', c]
            } else {
                vec![c]
            }
        })
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    format!("Rp {}", formatted)
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Send "order confirmed" email to user after successful checkout.
pub fn send_order_confirmed(
    config: &AppConfig,
    to_email: &str,
    to_name: &str,
    order_number: &str,
    total: Decimal,
    payment_method: &str,
    frontend_url: &str,
    order_id: &str,
) {
    let Some(transport) = build_transport(config) else { return };

    let payment_label = if payment_method == "bank_transfer" {
        "Transfer Bank"
    } else {
        "Bayar di Tempat (COD)"
    };

    let order_url = format!("{}/orders/{}", frontend_url, order_id);

    let body_html = format!(
        r#"<h2 style="color:#111;margin-top:0;">Pesanan Diterima! 🎉</h2>
<p style="color:#374151;">Halo <strong>{to_name}</strong>,</p>
<p style="color:#374151;">Terima kasih telah berbelanja. Pesanan Anda telah kami terima dan sedang diproses.</p>
<div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#6b7280;padding:4px 0;">Nomor Pesanan</td><td style="font-weight:bold;text-align:right;">{order_number}</td></tr>
    <tr><td style="color:#6b7280;padding:4px 0;">Total Pembayaran</td><td style="font-weight:bold;color:#4f46e5;text-align:right;">{total}</td></tr>
    <tr><td style="color:#6b7280;padding:4px 0;">Metode Pembayaran</td><td style="font-weight:bold;text-align:right;">{payment_label}</td></tr>
  </table>
</div>
{bank_note}
<div style="text-align:center;margin-top:24px;">
  <a href="{order_url}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
    Lihat Detail Pesanan
  </a>
</div>"#,
        to_name = to_name,
        order_number = order_number,
        total = format_idr(total),
        payment_label = payment_label,
        bank_note = if payment_method == "bank_transfer" {
            format!(
                r#"<div style="border:1px solid #fbbf24;background:#fffbeb;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="color:#92400e;margin:0;"><strong>⚠ Instruksi Pembayaran</strong></p>
  <p style="color:#92400e;margin:8px 0 0;">Silakan transfer sebesar <strong>{}</strong> ke rekening yang tertera, lalu upload bukti transfer di halaman pesanan.</p>
</div>"#,
                format_idr(total)
            )
        } else {
            String::new()
        },
        order_url = order_url,
    );

    let html = base_html(&config.app_name, "Pesanan Diterima", &body_html);
    let subject = format!("[{}] Pesanan {} Diterima", config.app_name, order_number);

    if let Ok(msg) = build_message(config, to_email, to_name, &subject, &html) {
        spawn_send(transport, msg, "order_confirmed");
    }
}

/// Send "order status updated" email to user.
pub fn send_order_status_updated(
    config: &AppConfig,
    to_email: &str,
    to_name: &str,
    order_number: &str,
    new_status: &str,
    frontend_url: &str,
    order_id: &str,
) {
    let Some(transport) = build_transport(config) else { return };

    let (status_label, status_desc, status_color) = match new_status {
        "paid" => ("Pembayaran Dikonfirmasi ✅", "Pembayaran Anda telah dikonfirmasi. Pesanan sedang kami siapkan.", "#059669"),
        "processing" => ("Pesanan Diproses 📦", "Pesanan Anda sedang dalam proses pengemasan.", "#7c3aed"),
        "shipped" => ("Pesanan Dikirim 🚚", "Pesanan Anda sedang dalam perjalanan ke alamat Anda.", "#2563eb"),
        "completed" => ("Pesanan Selesai 🎉", "Pesanan Anda telah diterima. Terima kasih sudah berbelanja!", "#16a34a"),
        "cancelled" => ("Pesanan Dibatalkan ❌", "Pesanan Anda telah dibatalkan.", "#dc2626"),
        _ => ("Status Pesanan Diperbarui", "Status pesanan Anda telah diperbarui.", "#374151"),
    };

    let order_url = format!("{}/orders/{}", frontend_url, order_id);

    let body_html = format!(
        r#"<h2 style="color:{status_color};margin-top:0;">{status_label}</h2>
<p style="color:#374151;">Halo <strong>{to_name}</strong>,</p>
<p style="color:#374151;">{status_desc}</p>
<div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#6b7280;padding:4px 0;">Nomor Pesanan</td><td style="font-weight:bold;text-align:right;">{order_number}</td></tr>
    <tr><td style="color:#6b7280;padding:4px 0;">Status Terbaru</td><td style="font-weight:bold;color:{status_color};text-align:right;">{status_label}</td></tr>
  </table>
</div>
<div style="text-align:center;margin-top:24px;">
  <a href="{order_url}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
    Lihat Detail Pesanan
  </a>
</div>"#,
        status_color = status_color,
        status_label = status_label,
        to_name = to_name,
        status_desc = status_desc,
        order_number = order_number,
        order_url = order_url,
    );

    let html = base_html(&config.app_name, status_label, &body_html);
    let subject = format!(
        "[{}] Update Pesanan {} — {}",
        config.app_name, order_number, status_label
    );

    if let Ok(msg) = build_message(config, to_email, to_name, &subject, &html) {
        spawn_send(transport, msg, "order_status_updated");
    }
}

/// Send "welcome" email after registration.
pub fn send_welcome(
    config: &AppConfig,
    to_email: &str,
    to_name: &str,
    frontend_url: &str,
) {
    let Some(transport) = build_transport(config) else { return };

    let body_html = format!(
        r#"<h2 style="color:#111;margin-top:0;">Selamat Datang, {to_name}! 🎉</h2>
<p style="color:#374151;">Akun Anda di <strong>{app_name}</strong> berhasil dibuat.</p>
<p style="color:#374151;">Sekarang Anda bisa mulai belanja produk pilihan kami.</p>
<div style="text-align:center;margin-top:24px;">
  <a href="{frontend_url}/catalog" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
    Mulai Belanja
  </a>
</div>"#,
        to_name = to_name,
        app_name = config.app_name,
        frontend_url = frontend_url,
    );

    let html = base_html(&config.app_name, "Selamat Datang", &body_html);
    let subject = format!("Selamat Datang di {}!", config.app_name);

    if let Ok(msg) = build_message(config, to_email, to_name, &subject, &html) {
        spawn_send(transport, msg, "welcome");
    }
}

// ── Internal message builder ──────────────────────────────────────────────────

fn build_message(
    config: &AppConfig,
    to_email: &str,
    to_name: &str,
    subject: &str,
    html: &str,
) -> Result<Message, lettre::error::Error> {
    let from = format!("{} <{}>", config.app_name, config.email_from);
    let to = format!("{} <{}>", to_name, to_email);

    Message::builder()
        .from(from.parse().map_err(|_| lettre::error::Error::MissingFrom)?)
        .to(to.parse().map_err(|_| lettre::error::Error::MissingTo)?)
        .subject(subject)
        .multipart(
            MultiPart::alternative().singlepart(
                SinglePart::builder()
                    .header(ContentType::TEXT_HTML)
                    .body(html.to_string()),
            ),
        )
}
