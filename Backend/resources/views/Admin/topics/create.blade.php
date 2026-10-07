@extends('layouts.admin')

@section('content')
    @include('Admin.topics.form', ['item' => null, 'isEditing' => false])
@endsection
