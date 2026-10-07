@extends('layouts.admin')

@section('content')
    @include('Admin.admins.form', ['isEditing' => true])
@endsection
