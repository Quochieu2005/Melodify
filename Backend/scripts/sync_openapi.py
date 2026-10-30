#!/usr/bin/env python3
"""Merge Laravel API routes into the checked-in OpenAPI document.

Run from any directory with: python scripts/sync_openapi.py (from Backend).
Existing hand-written operation details are preserved; route coverage, path
parameters, and auth requirements are refreshed from Laravel itself.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC_PATH = ROOT / "resources" / "api-docs" / "openapi.json"

TAG_DESCRIPTIONS = {
    "System": "Tình trạng hoạt động của API.",
    "Auth": "Đăng nhập, đăng ký, OTP, QR và xác thực mạng xã hội.",
    "Music": "Bài hát và lời bài hát.",
    "Topics": "Chủ đề nhạc công khai.",
    "Genres": "Thể loại nhạc công khai.",
    "Banners": "Banner công khai.",
    "Albums": "Album và thao tác với album.",
    "Artists": "Nghệ sĩ, theo dõi và lượt xem.",
    "Playlists": "Playlist công khai và playlist cá nhân.",
    "Favorites": "Danh sách và thao tác yêu thích.",
    "Charts": "Bảng xếp hạng và lượt chia sẻ.",
    "Discovery": "Dữ liệu trang chủ và gợi ý dành cho bạn.",
    "Library": "Thư viện cá nhân và đồng bộ dữ liệu.",
    "Uploads": "Tải lên bài hát và quản lý tệp tạm.",
    "Engagement": "Lượt nghe/xem, chia sẻ và báo cáo nội dung.",
    "Follows": "Hồ sơ người dùng và theo dõi nghệ sĩ/người dùng.",
    "VIP Payments": "Gói VIP, checkout, cổng thanh toán và giao dịch.",
    "Videos": "Danh sách video, phát, tải xuống và tương tác.",
    "Search": "Tìm kiếm nội dung Melodify.",
}

# Curated summaries for the API operations that were missing from the old spec.
SUMMARIES = {
    ("post", "/api/v1/albums/{slug}/favorite"): ("Đánh dấu hoặc bỏ yêu thích album", "Albums"),
    ("post", "/api/v1/albums/{slug}/share"): ("Ghi nhận lượt chia sẻ album", "Engagement"),
    ("get", "/api/v1/artists/trending"): ("Lấy danh sách nghệ sĩ thịnh hành", "Artists"),
    ("post", "/api/v1/artists/{identifier}/follow"): ("Theo dõi hoặc bỏ theo dõi nghệ sĩ", "Follows"),
    ("post", "/api/v1/artists/{slug}/view"): ("Ghi nhận lượt xem hồ sơ nghệ sĩ", "Engagement"),
    ("post", "/api/v1/auth/register"): ("Đăng ký tài khoản Melodify", "Auth"),
    ("post", "/api/v1/auth/social/browser/poll"): ("Kiểm tra trạng thái đăng nhập mạng xã hội trên trình duyệt", "Auth"),
    ("post", "/api/v1/auth/social/browser/start"): ("Bắt đầu đăng nhập mạng xã hội trên trình duyệt", "Auth"),
    ("post", "/api/v1/auth/social/exchange"): ("Đổi thông tin xác thực mạng xã hội lấy phiên Melodify", "Auth"),
    ("post", "/api/v1/auth/social/exchange-ticket"): ("Đổi ticket đăng nhập một lần lấy phiên Mobile", "Auth"),
    ("get", "/api/v1/charts"): ("Liệt kê các bảng xếp hạng", "Charts"),
    ("get", "/api/v1/charts/{slug}"): ("Lấy chi tiết bảng xếp hạng và danh sách bài hát", "Charts"),
    ("post", "/api/v1/charts/{slug}/share"): ("Ghi nhận lượt chia sẻ bảng xếp hạng", "Engagement"),
    ("get", "/api/v1/favorites/songs"): ("Lấy danh sách bài hát yêu thích của tài khoản", "Favorites"),
    ("post", "/api/v1/favorites/songs/reorder"): ("Sắp xếp lại danh sách bài hát yêu thích", "Favorites"),
    ("get", "/api/v1/for-you/artists"): ("Lấy nghệ sĩ gợi ý dành cho bạn", "Discovery"),
    ("get", "/api/v1/for-you/song"): ("Lấy bài hát gợi ý dành cho bạn", "Discovery"),
    ("get", "/api/v1/home/bootstrap"): ("Lấy dữ liệu khởi tạo trang chủ", "Discovery"),
    ("get", "/api/v1/home/discovery"): ("Lấy nội dung khám phá trang chủ", "Discovery"),
    ("get", "/api/v1/me/library"): ("Lấy thư viện đã đồng bộ của tài khoản", "Library"),
    ("post", "/api/v1/me/library/import"): ("Nhập thư viện vào tài khoản hiện tại", "Library"),
    ("get", "/api/v1/me/playlists"): ("Liệt kê playlist cá nhân", "Playlists"),
    ("post", "/api/v1/me/playlists"): ("Tạo playlist cá nhân", "Playlists"),
    ("post", "/api/v1/me/playlists/{playlistId}"): ("Cập nhật tên, quyền riêng tư hoặc ảnh bìa playlist", "Playlists"),
    ("delete", "/api/v1/me/playlists/{playlistId}"): ("Xóa playlist cá nhân", "Playlists"),
    ("post", "/api/v1/me/playlists/{playlistId}/songs"): ("Thêm bài hát vào playlist cá nhân", "Playlists"),
    ("get", "/api/v1/me/uploads"): ("Liệt kê bài hát người dùng đã tải lên", "Uploads"),
    ("post", "/api/v1/me/uploads"): ("Gửi bài hát tải lên để kiểm duyệt", "Uploads"),
    ("post", "/api/v1/me/uploads/stage"): ("Tải tệp audio tạm trước khi gửi bài hát", "Uploads"),
    ("delete", "/api/v1/me/uploads/stage/{uploadToken}"): ("Xóa tệp audio tạm đã tải lên", "Uploads"),
    ("post", "/api/v1/playlists/{slug}/favorite"): ("Đánh dấu hoặc bỏ yêu thích playlist", "Playlists"),
    ("post", "/api/v1/playlists/{slug}/share"): ("Ghi nhận lượt chia sẻ playlist", "Engagement"),
    ("get", "/api/v1/search"): ("Tìm bài hát, nghệ sĩ, album và playlist", "Search"),
    ("get", "/api/v1/songs/external/{externalId}/audio"): ("Phát audio theo mã bài hát ngoài", "Music"),
    ("get", "/api/v1/songs/popular"): ("Liệt kê bài hát phổ biến", "Music"),
    ("get", "/api/v1/songs/{slug}/audio"): ("Phát audio bài hát", "Music"),
    ("post", "/api/v1/songs/{slug}/favorite"): ("Đánh dấu hoặc bỏ yêu thích bài hát", "Favorites"),
    ("post", "/api/v1/songs/{slug}/report"): ("Gửi báo cáo bài hát", "Engagement"),
    ("post", "/api/v1/songs/{slug}/share"): ("Ghi nhận lượt chia sẻ bài hát", "Engagement"),
    ("post", "/api/v1/songs/{slug}/view"): ("Ghi nhận lượt nghe bài hát", "Engagement"),
    ("get", "/api/v1/subscription-plans"): ("Liệt kê các gói đăng ký VIP đang hoạt động", "VIP Payments"),
    ("get", "/api/v1/users/{identifier}"): ("Lấy hồ sơ người dùng công khai", "Follows"),
    ("post", "/api/v1/users/{identifier}/follow"): ("Theo dõi hoặc bỏ theo dõi người dùng", "Follows"),
    ("get", "/api/v1/videos"): ("Liệt kê video nhạc", "Videos"),
    ("get", "/api/v1/videos/{slug}"): ("Lấy thông tin chi tiết video", "Videos"),
    ("get", "/api/v1/videos/{slug}/download"): ("Lấy URL tải video theo quyền tài khoản", "Videos"),
    ("post", "/api/v1/videos/{slug}/favorite"): ("Đánh dấu hoặc bỏ yêu thích video", "Favorites"),
    ("post", "/api/v1/videos/{slug}/report"): ("Gửi báo cáo video", "Engagement"),
    ("post", "/api/v1/videos/{slug}/share"): ("Ghi nhận lượt chia sẻ video", "Engagement"),
    ("get", "/api/v1/videos/{slug}/stream"): ("Phát luồng video", "Videos"),
    ("post", "/api/v1/videos/{slug}/view"): ("Ghi nhận lượt xem video", "Engagement"),
    ("post", "/api/v1/vip/checkout"): ("Tạo đơn hàng mua gói VIP", "VIP Payments"),
    ("get", "/api/v1/vip/payment-methods"): ("Liệt kê cổng thanh toán đã cấu hình", "VIP Payments"),
    ("post", "/api/v1/vip/payments/momo/ipn"): ("Nhận thông báo thanh toán MoMo", "VIP Payments"),
    ("get", "/api/v1/vip/payments/momo/return"): ("Nhận trình duyệt quay về từ MoMo", "VIP Payments"),
    ("get", "/api/v1/vip/payments/vnpay/ipn"): ("Nhận thông báo thanh toán VNPay", "VIP Payments"),
    ("get", "/api/v1/vip/payments/vnpay/return"): ("Nhận trình duyệt quay về từ VNPay", "VIP Payments"),
    ("post", "/api/v1/vip/payments/zalopay/callback"): ("Nhận callback xác nhận thanh toán ZaloPay", "VIP Payments"),
    ("get", "/api/v1/vip/transactions"): ("Liệt kê giao dịch VIP của tài khoản", "VIP Payments"),
    ("get", "/api/v1/vip/transactions/{paymentCode}"): ("Lấy trạng thái giao dịch VIP", "VIP Payments"),
}


def json_request(properties: dict, required: list[str] | None = None, description: str | None = None) -> dict:
    schema = {"type": "object", "properties": properties, "additionalProperties": False}
    if required:
        schema["required"] = required
    body = {"required": bool(required), "content": {"application/json": {"schema": schema}}}
    if description:
        body["description"] = description
    return body


def request_for(method: str, path: str) -> dict | None:
    string = {"type": "string"}
    body = {
        ("post", "/api/v1/me/playlists"): json_request({
            "name": {"type": "string", "maxLength": 100},
            "visibility": {"type": "string", "enum": ["public", "private"], "default": "private"},
        }, ["name"]),
        ("post", "/api/v1/me/playlists/{playlistId}/songs"): json_request({
            "song_ids": {"type": "array", "minItems": 1, "maxItems": 500, "uniqueItems": True, "items": {"type": "string", "maxLength": 120}},
        }, ["song_ids"]),
        ("post", "/api/v1/favorites/songs/reorder"): json_request({
            "song_ids": {"type": "array", "maxItems": 500, "uniqueItems": True, "items": string},
        }, ["song_ids"], "Gửi danh sách ID bài hát yêu thích theo thứ tự mới."),
        ("post", "/api/v1/vip/checkout"): json_request({
            "plan_id": {"type": "string", "maxLength": 120},
            "method": {"type": "string", "enum": ["momo", "vnpay", "zalopay"]},
        }, ["plan_id", "method"]),
        ("post", "/api/v1/artists/{identifier}/follow"): json_request({"following": {"type": "boolean"}}, ["following"]),
        ("post", "/api/v1/users/{identifier}/follow"): json_request({"following": {"type": "boolean"}}, ["following"]),
        ("post", "/api/v1/songs/{slug}/favorite"): json_request({"favorited": {"type": "boolean", "description": "Bỏ qua để đảo trạng thái hiện tại."}}),
        ("post", "/api/v1/albums/{slug}/favorite"): json_request({"favorited": {"type": "boolean", "description": "Bỏ qua để đảo trạng thái hiện tại."}}),
        ("post", "/api/v1/playlists/{slug}/favorite"): json_request({"favorited": {"type": "boolean", "description": "Bỏ qua để đảo trạng thái hiện tại."}}),
        ("post", "/api/v1/videos/{slug}/favorite"): json_request({"favorited": {"type": "boolean", "description": "Bỏ qua để đảo trạng thái hiện tại."}}),
        ("post", "/api/v1/songs/{slug}/report"): json_request({
            "reason": {"type": "string", "enum": ["incorrect_audio", "incorrect_information", "duplicate", "inappropriate", "copyright", "other"]},
            "details": {"type": "string", "maxLength": 1000}, "visitor_id": {"type": "string", "maxLength": 120},
        }, ["reason"]),
        ("post", "/api/v1/videos/{slug}/report"): json_request({
            "reason": {"type": "string", "enum": ["incorrect_video", "incorrect_information", "duplicate", "inappropriate", "copyright", "other"]},
            "details": {"type": "string", "maxLength": 1000}, "visitor_id": {"type": "string", "maxLength": 120},
        }, ["reason"]),
        ("post", "/api/v1/songs/{slug}/view"): json_request({"visitor_id": {"type": "string", "maxLength": 120}, "source": {"type": "string", "maxLength": 30}}),
        ("post", "/api/v1/videos/{slug}/view"): json_request({"visitor_id": {"type": "string", "maxLength": 120}}),
        ("post", "/api/v1/artists/{slug}/view"): json_request({"visitor_id": {"type": "string", "maxLength": 120}}),
    }
    if (method, path) in body:
        return body[(method, path)]

    share_paths = {
        ("post", "/api/v1/albums/{slug}/share"), ("post", "/api/v1/charts/{slug}/share"),
        ("post", "/api/v1/playlists/{slug}/share"), ("post", "/api/v1/songs/{slug}/share"),
        ("post", "/api/v1/videos/{slug}/share"),
    }
    if (method, path) in share_paths:
        return json_request({"visitor_id": {"type": "string", "maxLength": 120}, "source": {"type": "string", "maxLength": 30}})

    if (method, path) == ("post", "/api/v1/me/playlists/{playlistId}"):
        return {
            "required": False,
            "description": "Các trường đều tùy chọn. Ảnh bìa tối thiểu 640×640 px.",
            "content": {"multipart/form-data": {"schema": {"type": "object", "properties": {
                "name": {"type": "string", "minLength": 1, "maxLength": 100},
                "visibility": {"type": "string", "enum": ["public", "private"]},
                "cover_image_file": {"type": "string", "format": "binary"},
            }}}},
        }
    if (method, path) == ("post", "/api/v1/me/uploads/stage"):
        return {"required": True, "content": {"multipart/form-data": {"schema": {"type": "object", "required": ["audio_file"], "properties": {"audio_file": {"type": "string", "format": "binary", "description": "Audio, tối đa 100 MiB."}}}}}}
    if (method, path) == ("post", "/api/v1/me/uploads"):
        return {"required": True, "content": {"multipart/form-data": {"schema": {"type": "object", "required": ["title", "artist_name", "genre_id", "terms_accepted", "moderation_requested", "cover_image_file"], "properties": {
            "title": {"type": "string", "maxLength": 160}, "artist_name": {"type": "string", "maxLength": 160},
            "artist_id": {"type": "string", "maxLength": 64}, "genre_id": {"type": "string", "maxLength": 64},
            "audio_file": {"type": "string", "format": "binary"}, "audio_upload_token": string,
            "cover_image_file": {"type": "string", "format": "binary", "description": "Ảnh JPG/PNG tối thiểu 640×640 px, tối đa 5 MiB."},
            "terms_accepted": {"type": "boolean"}, "moderation_requested": {"type": "boolean"},
        }}}}}

    if method == "post" and path in {
        "/api/v1/auth/register", "/api/v1/auth/social/browser/start", "/api/v1/auth/social/browser/poll",
        "/api/v1/auth/social/exchange", "/api/v1/auth/social/exchange-ticket", "/api/v1/me/library/import",
        "/api/v1/vip/payments/momo/ipn", "/api/v1/vip/payments/zalopay/callback",
    }:
        return {"required": True, "content": {"application/json": {"schema": {"type": "object", "additionalProperties": True}}},
                "description": "Payload được kiểm tra theo contract của controller/provider tương ứng."}
    return None


def success_response(method: str, path: str) -> dict:
    if path in {
        "/api/v1/vip/payments/momo/return",
        "/api/v1/vip/payments/vnpay/return",
    }:
        return {"description": "Chuyển hướng trình duyệt về trang kết quả thanh toán của Melodify.", "headers": {
            "Location": {"schema": {"type": "string", "format": "uri"}}
        }}
    if path in {
        "/api/v1/vip/payments/momo/ipn",
        "/api/v1/vip/payments/vnpay/ipn",
        "/api/v1/vip/payments/zalopay/callback",
    }:
        return {"description": "Callback được phản hồi sau khi backend xác minh dữ liệu/chữ ký nhà cung cấp.", "content": {
            "application/json": {"schema": {"type": "object", "additionalProperties": True}}
        }}
    if (method, path) == ("post", "/api/v1/vip/checkout"):
        payment_data = {
            "type": "object",
            "properties": {
                "payment_id": {"type": "string"},
                "payment_code": {"type": "string"},
                "amount": {"type": "number"},
                "currency": {"type": "string", "example": "VND"},
                "method": {"type": "string"},
                "status": {"type": "string", "example": "pending"},
                "checkout_url": {"type": "string", "format": "uri"},
                "plan": {"type": "object", "additionalProperties": True},
            },
        }
        schema = {"type": "object", "properties": {"message": {"type": "string"}, "data": payment_data}}
        return {"description": "Đã tạo giao dịch đang chờ thanh toán.", "content": {"application/json": {"schema": schema}}}
    if (method, path) in {
        ("post", "/api/v1/songs/{slug}/favorite"), ("post", "/api/v1/albums/{slug}/favorite"),
        ("post", "/api/v1/playlists/{slug}/favorite"), ("post", "/api/v1/videos/{slug}/favorite"),
    }:
        properties = {"favorited": {"type": "boolean"}}
        if path.endswith("/songs/{slug}/favorite"):
            properties["favorite_count"] = {"type": "integer"}
        schema = {"type": "object", "properties": properties}
        return {"description": "Trạng thái yêu thích sau thao tác.", "content": {"application/json": {"schema": schema}}}
    if (method, path) in {("post", "/api/v1/songs/{slug}/report"), ("post", "/api/v1/videos/{slug}/report")}:
        schema = {"type": "object", "properties": {"message": {"type": "string"}, "report_id": {"type": "string"}}}
        return {"description": "Báo cáo đã được tiếp nhận.", "content": {"application/json": {"schema": schema}}}
    if (method, path) == ("post", "/api/v1/me/playlists"):
        playlist = {"type": "object", "properties": {
            "id": {"type": "string"}, "name": {"type": "string"}, "slug": {"type": "string"},
            "cover_url": {"type": "string", "nullable": True}, "song_count": {"type": "integer"},
            "visibility": {"type": "string", "enum": ["public", "private"]},
        }}
        schema = {"type": "object", "properties": {"data": playlist}}
        return {"description": "Playlist đã được tạo.", "content": {"application/json": {"schema": schema}}}
    if method == "get" and (path.endswith("/stream") or path.endswith("/audio")):
        media_type = "audio/mpeg" if path.endswith("/audio") else "video/mp4"
        return {"description": "Luồng media hoặc chuyển hướng đến URL phát.", "content": {media_type: {"schema": {"type": "string", "format": "binary"}}}}
    return {"description": "Thao tác thành công.", "content": {"application/json": {"schema": {"type": "object", "additionalProperties": True}}}}


def route_path(uri: str) -> str:
    return "/" + uri.replace("\\", "/").strip("/")


def path_parameters(path: str) -> list[dict]:
    return [{"name": name, "in": "path", "required": True, "schema": {"type": "string"}}
            for name in re.findall(r"\{([^}]+)\}", path)]


def main() -> None:
    route_output = subprocess.check_output(
        ["php", "artisan", "route:list", "--path=api/v1", "--json"], cwd=ROOT, text=True
    )
    routes = json.loads(route_output)
    spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    spec.setdefault("paths", {})
    spec.setdefault("components", {}).setdefault("securitySchemes", {}).setdefault("bearerAuth", {
        "type": "http", "scheme": "bearer", "bearerFormat": "opaque"
    })
    documented_before = sum(1 for path, item in spec["paths"].items() for method in item if method in {"get", "post", "put", "patch", "delete"})
    missing = []

    for route in routes:
        path = route_path(route["uri"])
        middleware = route.get("middleware", [])
        verbs = [verb.lower() for verb in route["method"].split("|") if verb != "HEAD"]
        for method in verbs:
            path_item = spec["paths"].setdefault(path, {})
            operation = path_item.get(method)
            if operation is None:
                summary, tag = SUMMARIES.get((method, path), (route["name"] or route["action"], "Music"))
                operation = {
                    "operationId": re.sub(r"[^A-Za-z0-9]+", "_", f"{method}_{route.get('name') or path}").strip("_"),
                    "summary": summary,
                    "tags": [tag],
                    "responses": {},
                }
                body = request_for(method, path)
                if body:
                    operation["requestBody"] = body
                missing.append((method.upper(), path))
                path_item[method] = operation

            if (route.get("name") or "").startswith("api.v1.vip.payments."):
                if path.endswith("/return"):
                    operation["description"] = "Điểm quay về trình duyệt sau thanh toán. Route public, không dùng Bearer; backend xác minh dữ liệu trước khi cập nhật kết quả và chuyển hướng về frontend."
                else:
                    operation["description"] = "Callback server-to-server. Route public, không dùng Bearer; backend phải xác minh chữ ký và dữ liệu giao dịch từ nhà cung cấp."

            # OpenAPI requires every path-template variable to be declared.
            existing_parameters = operation.setdefault("parameters", [])
            existing_names = {(item.get("in"), item.get("name")) for item in existing_parameters}
            for parameter in path_parameters(path):
                if ("path", parameter["name"]) not in existing_names:
                    existing_parameters.append(parameter)

            # Reflect Laravel middleware: callbacks are provider-authenticated;
            # optional-auth routes may be called anonymously or with a token.
            if (route.get("name") or "").startswith("api.v1.vip.payments."):
                operation["security"] = []
            elif "api.user" in middleware:
                operation["security"] = [{"bearerAuth": []}]
            elif "api.user.optional" in middleware:
                operation["security"] = [{}, {"bearerAuth": []}]
            else:
                operation["security"] = []

            if not operation.get("responses"):
                status = "302" if path.endswith("/return") and path.startswith("/api/v1/vip/payments/") else "201" if (method, path) in {
                    ("post", "/api/v1/auth/register"), ("post", "/api/v1/me/playlists"),
                    ("post", "/api/v1/me/uploads"), ("post", "/api/v1/me/uploads/stage"),
                    ("post", "/api/v1/songs/{slug}/report"), ("post", "/api/v1/videos/{slug}/report"),
                } else "200"
                operation["responses"][status] = success_response(method, path)
                if "api.user" in middleware:
                    operation["responses"]["401"] = {"description": "Thiếu hoặc không hợp lệ Bearer token."}
                if method in {"post", "put", "patch"} and operation.get("requestBody"):
                    operation["responses"].setdefault("422", {"description": "Dữ liệu gửi lên không hợp lệ."})

            if path in {
                "/api/v1/vip/payments/momo/ipn",
                "/api/v1/vip/payments/momo/return",
                "/api/v1/vip/payments/vnpay/ipn",
                "/api/v1/vip/payments/vnpay/return",
                "/api/v1/vip/payments/zalopay/callback",
            }:
                callback_status = "302" if path.endswith("/return") else "200"
                operation["responses"] = {callback_status: success_response(method, path)}

            if "api.user" in middleware:
                operation.setdefault("responses", {}).setdefault("401", {"description": "Thiếu hoặc không hợp lệ Bearer token."})
            if method in {"post", "put", "patch"} and operation.get("requestBody"):
                operation.setdefault("responses", {}).setdefault("422", {"description": "Dữ liệu gửi lên không hợp lệ."})

            # Document search filters as query parameters without changing any
            # existing hand-authored request/response contracts.
            if method == "get" and path == "/api/v1/search":
                params = operation["parameters"]
                for name, schema, required in [
                    ("q", {"type": "string", "minLength": 1}, True),
                    ("type", {"type": "string", "enum": ["all", "songs", "artists", "albums", "playlists"]}, False),
                    ("page", {"type": "integer", "minimum": 1}, False),
                    ("per_page", {"type": "integer", "minimum": 1, "maximum": 50}, False),
                ]:
                    if ("query", name) not in {(p.get("in"), p.get("name")) for p in params}:
                        params.append({"name": name, "in": "query", "required": required, "schema": schema})

    for name, description in TAG_DESCRIPTIONS.items():
        existing_tag = next((tag for tag in spec.get("tags", []) if tag.get("name") == name), None)
        if existing_tag is None:
            spec.setdefault("tags", []).append({"name": name, "description": description})
        else:
            existing_tag["description"] = description

    # Remove empty path items left by a previous incomplete spec generation.
    spec["paths"] = {path: item for path, item in spec["paths"].items() if item}

    # Give every operation a stable, unique ID for Swagger tooling and clients.
    used_operation_ids = set()
    for path, path_item in spec["paths"].items():
        for method, operation in path_item.items():
            if method not in {"get", "post", "put", "patch", "delete"}:
                continue
            operation_id = operation.get("operationId")
            if not operation_id or operation_id in used_operation_ids:
                base_id = re.sub(r"[^A-Za-z0-9]+", "_", f"{method}_{path}").strip("_")
                operation_id = base_id
                suffix = 2
                while operation_id in used_operation_ids:
                    operation_id = f"{base_id}_{suffix}"
                    suffix += 1
                operation["operationId"] = operation_id
            used_operation_ids.add(operation_id)

    spec["info"]["description"] = (
        "Tài liệu OpenAPI cho các route API đang được đăng ký trong Laravel. "
        "Route đồng bộ bằng Backend/scripts/sync_openapi.py. Các API có Bearer tùy chọn "
        "hỗ trợ cá nhân hóa khi đăng nhập; API chỉnh sửa dữ liệu cá nhân yêu cầu Bearer token."
    )
    SPEC_PATH.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    documented_after = sum(1 for path, item in spec["paths"].items() for method in item if method in {"get", "post", "put", "patch", "delete"})
    print(f"OpenAPI operations before sync: {documented_before}; after sync: {documented_after}; added: {len(missing)}")
    print(f"Added {len(missing)} route operations; spec written to {SPEC_PATH}")


if __name__ == "__main__":
    main()
