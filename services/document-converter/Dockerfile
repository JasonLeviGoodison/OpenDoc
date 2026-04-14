FROM debian:bookworm-slim AS google-fonts

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        ca-certificates \
        git \
        python3 \
        python3-pip \
    && pip3 install --no-cache-dir --break-system-packages fonttools \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth=1 --filter=blob:none --sparse https://github.com/google/fonts /tmp/google-fonts \
    && cd /tmp/google-fonts \
    && git sparse-checkout set \
        apache/robotoslab \
        ofl/barlow \
        ofl/cabin \
        ofl/dmsans \
        ofl/firasans \
        ofl/inter \
        ofl/lato \
        ofl/merriweather \
        ofl/montserrat \
        ofl/nunito \
        ofl/nunitosans \
        ofl/opensans \
        ofl/oswald \
        ofl/playfairdisplay \
        ofl/poppins \
        ofl/ptserif \
        ofl/ptsans \
        ofl/quicksand \
        ofl/raleway \
        ofl/roboto \
        ofl/robotocondensed \
        ofl/robotomono \
        ofl/rubik \
        ofl/sourcecodepro \
        ofl/sourcesans3 \
        ofl/sourceserif4 \
        ofl/worksans \
        ufl/ubuntu \
    && mkdir -p /google-fonts \
    && find /tmp/google-fonts \
        \( -name '*.ttf' -o -name '*.otf' \) \
        -type f \
        -exec cp {} /google-fonts/ \; \
    && python3 - <<'PY'
import glob
from fontTools.ttLib import TTFont

for path in glob.glob('/google-fonts/*.ttf'):
    try:
        font = TTFont(path)
        if 'fpgm' in font:
            del font['fpgm']
        if 'prep' in font:
            del font['prep']
        if 'cvt ' in font:
            del font['cvt ']
        if 'maxp' in font:
            font['maxp'].maxSizeOfInstructions = 0
        if 'glyf' in font:
            for glyph_name in font.getGlyphOrder():
                glyph = font['glyf'][glyph_name]
                if hasattr(glyph, 'program'):
                    glyph.program = None
        font.save(path)
    except Exception as error:
        print(f'Warning: could not dehint {path}: {error}')
PY

FROM gotenberg/gotenberg:8.30.1-libreoffice

USER root

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        fontconfig \
        fonts-dejavu \
        fonts-freefont-ttf \
        fonts-liberation \
        fonts-noto-core \
        fonts-noto-extra \
    && rm -rf /var/lib/apt/lists/*

COPY --from=google-fonts /google-fonts/ /usr/share/fonts/google/

RUN fc-cache -f

USER gotenberg

ENV PORT=3000 \
    API_PORT_FROM_ENV=PORT \
    API_TIMEOUT=180s \
    API_BODY_LIMIT=100MB \
    API_DISABLE_DOWNLOAD_FROM=true \
    LIBREOFFICE_AUTO_START=true

EXPOSE 3000
