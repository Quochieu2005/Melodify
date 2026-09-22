@extends('layouts.app', ['title' => 'Quản lý người dùng | Melodify Admin'])

@section('content')
    <x-admin.shell active="users" :preview="$preview ?? false">
        <x-admin.users.page :preview="$preview ?? false" :search="$search" :status="$status" :users="$users" />
    </x-admin.shell>
@endsection
