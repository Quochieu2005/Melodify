@extends('layouts.admin')

@section('content')
    @include('Admin.videos.form', ['isEditing' => true])
@endsection
