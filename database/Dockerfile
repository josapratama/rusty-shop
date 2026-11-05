# ============================================================
# Online Shop - PostgreSQL Docker Image
# ============================================================
FROM postgres:16-alpine

# Label
LABEL maintainer="Online Shop"
LABEL description="PostgreSQL database for Online Shop"

# Set timezone
ENV TZ=Asia/Jakarta

# Copy init scripts — PostgreSQL akan menjalankan semua file
# *.sql dan *.sh di /docker-entrypoint-initdb.d/ secara urut
# saat container pertama kali dibuat (database belum ada).
COPY migrations/001_init.sql /docker-entrypoint-initdb.d/001_init.sql
COPY migrations/002_seed.sql /docker-entrypoint-initdb.d/002_seed.sql
COPY migrations/003_improvements.sql /docker-entrypoint-initdb.d/003_improvements.sql

# Expose port default PostgreSQL
EXPOSE 5432
