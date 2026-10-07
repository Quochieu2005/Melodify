<?php

namespace App\Http\Controllers\AdminController;

use App\Models\SubscriptionPlan;

class SubscriptionController extends CrudResourceController
{
    protected string $model = SubscriptionPlan::class;

    protected string $resource = 'subscriptions';

    protected string $title = 'gói đăng ký';

    protected string $viewDirectory = 'Admin.subscriptions';

    protected array $columns = ['name' => 'Tên gói', 'price' => 'Giá', 'duration_days' => 'Số ngày', 'status' => 'Trạng thái'];

    protected array $fields = [
        'name' => ['label' => 'Tên gói', 'required' => true],
        'code' => ['label' => 'Mã gói', 'required' => true],
        'slug' => ['label' => 'Slug', 'required' => true],
        'price' => ['label' => 'Giá', 'type' => 'number', 'required' => true],
        'duration_days' => ['label' => 'Thời hạn (ngày)', 'type' => 'number', 'required' => true],
        'description' => ['label' => 'Mô tả', 'type' => 'textarea'],
        'offline_download' => ['label' => 'Cho phép tải offline', 'type' => 'checkbox'],
        'ads_enabled' => ['label' => 'Hiển thị quảng cáo', 'type' => 'checkbox'],
        'unlimited_skip' => ['label' => 'Bỏ qua không giới hạn', 'type' => 'checkbox'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm dừng']],
    ];
}
