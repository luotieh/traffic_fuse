FROM golang:1.26-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -ldflags "-X my-biz-backend/boot.BuildTime=$(date '+%Y-%m-%d %H:%M:%S')" -o server ./cmd/server

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app

COPY --from=builder /build/server .
COPY --from=builder /build/config.toml .

EXPOSE 8090

CMD ["./server"]
