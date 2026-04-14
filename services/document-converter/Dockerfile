FROM gotenberg/gotenberg:8.30.1-libreoffice

USER root

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        fontconfig \
        fonts-dejavu \
        fonts-freefont-ttf \
        fonts-liberation \
        fonts-noto-core \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

USER gotenberg

ENV PORT=3000 \
    API_PORT_FROM_ENV=PORT \
    API_TIMEOUT=180s \
    API_BODY_LIMIT=100MB \
    API_DISABLE_DOWNLOAD_FROM=true \
    LIBREOFFICE_AUTO_START=true

EXPOSE 3000
