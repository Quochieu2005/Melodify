@extends('layouts.admin')

@section('content')
    @include('Admin.subscriptions.form', ['item' => null, 'isEditing' => false])
@endsection
