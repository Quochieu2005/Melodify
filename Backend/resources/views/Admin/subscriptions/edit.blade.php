@extends('layouts.admin')

@section('content')
    @include('Admin.subscriptions.form', ['isEditing' => true])
@endsection
