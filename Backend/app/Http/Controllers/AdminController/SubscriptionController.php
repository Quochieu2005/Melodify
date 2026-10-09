<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Rules\PlainText;
use Illuminate\Http\Request;
use Illuminate\View\View;

class SubscriptionController extends CrudResourceController
{
    protected string $model = SubscriptionPlan::class;

    protected string $resource = 'subscriptions';

    protected string $title = 'gói đăng ký';

    protected string $viewDirectory = 'Admin.subscriptions';

    protected array $columns = ['name' => 'Tên gói', 'price' => 'Giá', 'billing_cycle' => 'Chu kỳ', 'billing_months' => 'Thời hạn', 'status' => 'Trạng thái'];

    protected array $searchable = ['name', 'code', 'slug', 'billing_cycle', 'status'];

    protected array $fields = [
        'name' => ['label' => 'Tên gói', 'required' => true],
        'code' => ['label' => 'Mã gói', 'required' => true],
        'slug' => ['label' => 'Slug', 'required' => true],
        'price' => ['label' => 'Giá', 'type' => 'number', 'required' => true],
        'billing_cycle' => ['label' => 'Chu kỳ thanh toán', 'type' => 'select', 'required' => true, 'options' => ['monthly' => 'Theo tháng', 'yearly' => 'Theo năm']],
        'billing_months' => ['label' => 'Số tháng hiệu lực', 'type' => 'number', 'required' => true],
        'description' => ['label' => 'Mô tả', 'type' => 'textarea'],
        'offline_download' => ['label' => 'Cho phép tải offline', 'type' => 'checkbox'],
        'ads_enabled' => ['label' => 'Hiển thị quảng cáo', 'type' => 'checkbox'],
        'unlimited_skip' => ['label' => 'Bỏ qua không giới hạn', 'type' => 'checkbox'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm dừng']],
    ];

    public function index(?Request $request = null): View
    {
        $request ??= request();
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100', new PlainText()],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $query = SubscriptionPlan::query();

        if ($search !== '') {
            $query->where(function ($nestedQuery) use ($search): void {
                foreach (['name', 'code', 'slug', 'billing_cycle', 'status'] as $index => $field) {
                    $method = $index === 0 ? 'where' : 'orWhere';
                    $nestedQuery->{$method}($field, 'like', "%{$search}%");
                }
            });
        }

        $items = $query->latest()->paginate(10)->withQueryString();
        $planIds = $items->getCollection()->map(fn (SubscriptionPlan $plan): string => (string) $plan->getKey())->values()->all();
        $subscriberCounts = $planIds === []
            ? []
            : Subscription::query()
                ->whereIn('plan_id', $planIds)
                ->where('status', 'active')
                ->get(['plan_id'])
                ->groupBy(fn (Subscription $subscription): string => (string) $subscription->plan_id)
                ->map(fn ($subscriptions): int => $subscriptions->count())
                ->all();

        return view('Admin.subscriptions.index', $this->viewData(compact('items', 'subscriberCounts', 'search')));
    }

    protected function normalize(array $data, mixed $ignoreId = null): array
    {
        $data['billing_cycle'] = $data['billing_cycle'] ?? 'monthly';
        $data['billing_months'] = max(1, (int) ($data['billing_months'] ?? 1));
        // Giữ duration_days để các luồng gia hạn hiện tại vẫn tương thích với gói mới.
        $data['duration_days'] = $data['billing_months'] * 30;

        return parent::normalize($data, $ignoreId);
    }
}
