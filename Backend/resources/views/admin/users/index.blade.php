@extends('layouts.app', ['title' => 'Quản lý người dùng | Melodify Admin'])

@section('content')
    <x-admin.shell active="users">
        <x-admin.users.page :search="$search" :status="$status" :users="$users" />
    </x-admin.shell>
@endsection
