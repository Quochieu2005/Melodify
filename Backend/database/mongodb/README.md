# Melodify MongoDB Atlas

`atlas-init.js` chuyển schema SQL hiện tại thành 28 MongoDB collections và các indexes chính.

Chạy bằng Mongo Shell:

```bash
mongosh "mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority" --file atlas-init.js
```

Trong `Backend/.env`:

```env
DB_CONNECTION=mongodb
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=melodify
```

File SQL hiện chỉ có `CREATE TABLE`, không có `INSERT`, nên script tạo schema/indexes nhưng chưa có dữ liệu mẫu.
