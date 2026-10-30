@extends('layouts.admin')

@section('content')
    @include('Admin.admins.form', ['item' => null, 'isEditing' => false])
@endsection
