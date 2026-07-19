FROM redis:7-alpine

COPY bin/minio /usr/local/bin/minio
COPY bin/mc /usr/local/bin/mc

RUN chmod 0755 /usr/local/bin/minio /usr/local/bin/mc

ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
