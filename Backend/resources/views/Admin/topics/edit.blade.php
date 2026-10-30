@extends('layouts.admin')

@section('content')
    @include('Admin.topics.form', ['isEditing' => true])
@endsection
