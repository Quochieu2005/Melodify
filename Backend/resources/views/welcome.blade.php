@extends('layouts.admin')

@section('content')
    <section class="admin-page">
        <div class="admin-page-header">
            <div>
                <h1 class="admin-page-title">Melodify Admin</h1>
                <p class="admin-page-description">Vui lòng truy cập bảng điều khiển quản trị để tiếp tục.</p>
            </div>
            <a href="{{ route('admin.dashboard') }}" class="ant-btn ant-btn-primary">Mở dashboard</a>
        </div>
    </section>
@endsection
