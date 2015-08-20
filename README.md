# editable_datatable
A plug in for jquery DataTables to enable inline editing

# Basic Usage

```js
$('#my-table').DataTable().editable_table();
```

# Options

## beforeEditStart

Callback invoked before beginning to edit a row.  The order of execution is:

1. user clicks a row to edit
2. any rows currently being edited (any `tr` with class `beingEdited`) are saved (DataTables internal data is updated with the contents of the input fields).
3. `beforeEditStart` is called, if present.
4. `beingEdited` class is applied to the `tr` to be edited
5. input fields are created
6. `afterEditStart` is called, if present.
 
If `beforeEditStart` returns `false`, then editing does not start.

```js
$('#my-table').DataTable().editable_table({
  beforeEditStart: function() {
    if (cant_edit_right_now) { return false; }
    console.log('Editing starting.');
  }
});
```

## afterEditStart

Callback invoked after the user begins editing a row (after the input fields have been created).
```js
$('#my-table').DataTable().editable_table({
  afterEditStart: function(aData, tr) {
    $tr.addClass('edit-highlight');
    aData.modified = true;
  }
});
```
  
# Commands

## close

Use this command to end editing.  Input fields are removed, and user input is copied to DataTables' internal data.

```js
$('#my-table').DataTable().editable_table('close');
```
