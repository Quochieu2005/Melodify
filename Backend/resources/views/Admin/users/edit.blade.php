@extends('layouts.admin')

@section('content')
    @include('Admin.users.form', ['isEditing' => true])
@endsection
