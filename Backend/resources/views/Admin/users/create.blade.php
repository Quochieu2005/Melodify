@extends('layouts.admin')

@section('content')
    @include('Admin.users.form', ['item' => null, 'isEditing' => false])
@endsection
