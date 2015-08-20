//
// Copyright (C) 2012-2013 Valuation Metrics, Inc.
// All Rights Reserved
//

// TODO: retrofit portfolios.js to use this

(function($) {
  'use strict';

  $.fn.editable_table = function(command, user_options) {
    var that = this,
        $dt = $(that).dataTable(),
        options = {};

    $('th', '.dataTables_scrollHead').on('click', function() {
      $('#save-list-button').removeAttr('disabled');
    });

    var deleteRow = function(e) {
      var $row = $(e.target).closest('tr')[0];
      $dt.fnDeleteRow($row, null, true);
      $('#save-list-button').removeAttr('disabled');
      return false;
    };

    var createCombobox = function($td, aData, colId, portfolioId) {
      var initialValue = aData[colId] || '';
      $('<input>')
        .appendTo($td.empty())
        .val(initialValue)
        .addClass('variable-' + colId)
        .contact_combobox({
          portfolioId: portfolioId,
          initialValue: initialValue
        });
    };

    // `this` will be the TR html element
    var editRow = function() {
      var $row = $(this);
      if (!!$row.closest('.subTable').length) {
        return false;
      }

      var aData = $dt.fnGetData($row[0]),
          $cells = $row.children('td'),
          columns = $dt.fnSettings().aoColumns;

      $('tr.beingEdited', that).each(saveRow);

      if (options.beforeEditStart) {
        if (options.beforeEditStart() === false) { return false; }
      }

      $row.addClass('beingEdited');

      $.each($cells, function(i, cell) {
        var abs_i = $dt.fnGetPosition(cell)[2],
            col = columns[abs_i],
            $control = null,
            $cell = $(cell);

        if (col.bEditable) {
          var value = (col.mDataProp in aData) ? aData[col.mDataProp] : '';
          if (col.std_format === 'contactsLink' && (aData.portfolioId || aData.portfolio_id)) {
            createCombobox($cell, aData, col.mDataProp, (aData.portfolioId || aData.portfolio_id));
          } else if (col.autocomplete) {
            var cellText = $.trim($cell.text()),
                $cellDiv;

            $.each(['select', 'source', 'focus', 'close'], function(i, fn) {
              // modify autocomplete widget's call of the callback to add in
              // the row's aData.  caller specifies `autocomplete.dt_source` and
              // it will be chained from autocomplete's `source`, etc.
              if (col.autocomplete["dt_" + fn]) {
                col.autocomplete[fn] = function() {
                  var args = Array.prototype.slice.call(arguments);
                  args.push($dt.fnGetData($row[0]));
                  return col.autocomplete["dt_" + fn].apply($('input', $cell)[0], args);
                };
              }
            });
            $cellDiv = $('<div></div>').css({width: '100%'})
                .appendTo($cell.empty());
            $control = $('<input type="text">')
              .attr('value', cellText)
              .addClass('variable-' + col.mDataProp)
              .css({margin: '0 auto 0 2px', 'box-sizing': 'border-box', width: '100%'})
              .appendTo($cellDiv);
            if (col.autocomplete.showAllButton) {
              var $button = $('<button>').css({padding: '3px 3px',
                                               margin: '0',
                                               'box-sizing': 'border-box',
                                               height: $control.outerHeight() + 'px',
                                               width: '17px',
                                               position: 'absolute',
                                               right: '0',
                                               overflow: 'hidden'})
                                         .attr('title', 'Show All')
                                         .attr('type', 'button')
                                         .addClass("ui-widget ui-button ui-state-default ui-corner-all")
                                         .html('<i class="fa fa-angle-double-down"></i>')
                                         .appendTo($cellDiv)
                                         .on('click', function() {
                                           var $self = $(this);
                                           if ($self.data('autocomplete_opened')) {
                                             $self.data('autocomplete_opened', false);
                                             return false;
                                           }

                                           $control.autocomplete('search', '')
                                             .focus();
                                            return false;
                                         })
                                         .on('mousedown', function(e) {
                                           $(this).data('autocomplete_opened',
                                             $control.autocomplete('widget').is(':visible'));
                                         });
              $cell.css('position', 'relative');
              $control.css({'margin-right': '17px', 'width': 'auto'});
            }
            $control.autocomplete(col.autocomplete);

            if (col.autocomplete._renderItem) {
              $control.data('ui-autocomplete')._renderItem = col.autocomplete._renderItem;
            }
          } else if (col.std_format === 'date' || col.std_format === 'datetime') {
            $control = $('<input type="text" readonly="readonly">').val(value).addClass('table-edit-date-field');
            $control.datetimepicker({
              dateFormat: 'yy-mm-dd',
              separator: 'T',
              timeFormat: 'HH:mm:ssz',
              controlType: 'select',
              showTimezone: true,
              timezoneIso8601: true,
              stepMinute: 15
            }).change();
            $cell.empty().append($control);
            $control.css('width', ($cell.width() - 16) + 'px');
          } else {
            $control = $('<input>')
              .attr({class: 'inline table-edit-text-field', type: 'text', value: value})
              .addClass('variable-' + col.mDataProp)
              .css({margin: '0x 2px', 'box-sizing': 'border-box', width: '100%'})
              .appendTo($cell.empty());
          }
        }
      });

      if (options.afterEditStart) {
        options.afterEditStart(aData, this);
      }

      return false;
    };

    var saveRow = function() {
      if (!!$(this).closest('.subTable').length) {
        return false;
      }
      var aData = $dt.fnGetData(this),
          $cells = $(this).children('td'),
          changedOne = false,
          columns = $dt.fnSettings().aoColumns,
          getCol = function(cell) { return columns[$dt.fnGetPosition(cell)[2]]; };

      // update aData for all editable fields that are text inputs.
      // autocompletes are updated immediately upon user selection
      $.each($cells, function(i, cell) {
        var col = getCol(cell),
            mDataProp = (typeof col.mData === 'string') ? col.mData : col.mDataProp;

        if (col.bEditable && mDataProp) {
          var $cell = $(cell);
          if (col.autocomplete) {
            if (!aData[mDataProp] && col.autocomplete.noneSelected) {
              // user hasn't selected anything
              col.autocomplete.noneSelected($cell, aData);
            }
            $cell.find('input').autocomplete('destroy');
          } else {
            var oldValue = aData[mDataProp],
                newValue = $.trim($('input', cell).val());

            if (!(typeof oldValue === 'undefined' && newValue === '')) {
              if (oldValue !== newValue) {
                // if updating a numeric column, coerce into a number if
                // input looks numeric
                if ((typeof oldValue === 'number') && (+newValue === newValue)) {
                  newValue = +newValue;
                }
                aData[mDataProp] = newValue;
                changedOne = true;
              }
            }
          }
        }
      });

      var rerenderRow = true;
      if (options.beforeRerenderRow) {
        rerenderRow = false !== options.beforeRerenderRow(aData, this);
      }

      if (rerenderRow) {
        $.each($cells, function(i, cell) {
          var col = getCol(cell),
              mDataProp = (typeof col.mData === 'string') ? col.mData : col.mDataProp,
              $cell = $(cell),
              formatted;

          if (col.mRender) {
            formatted = col.mRender(aData[mDataProp], 'display', aData);
          } else if (col.fnRender) { // deprecated
            formatted = col.fnRender({aData: aData}, aData[col.mDataProp]);
          } else if (formatters[col.std_format]) {
            formatted = formatters[col.std_format]({aData: aData}, aData[col.mDataProp]);
          } else {
            formatted = aData[mDataProp];
          }

          $cell.empty().append(formatted);
        });

        changedOne && $('#save-list-button').removeAttr('disabled');
        $(this).removeClass('beingEdited');
      }
    };

    if (typeof command === "object") {
      user_options = command;
      command = null;
    }

    $.extend(options, user_options);

    if (command === 'close') {
      $('tr.beingEdited', that).each(saveRow);
    } else {
      that.addClass('editable-table');
      $('tbody', that)
        .on('click', 'input[type="checkbox"]:not(.row-picker)', function(e) {
          var $target = $(e.target),
              $tr = $target.closest('tr'),
              aData = $dt.fnGetData($tr[0]),
              colIndex = $dt.fnGetPosition($target.closest('td')[0])[1];
          $dt.fnUpdate($target.is(':checked'), $tr[0], colIndex, true, false);
          return false;
        })
        .on('click', 'tr:not(.beingEdited, .sub-table-row)', function(e) {
          var $target = $(e.target);
          if (!$target.is('a, i, input[type="checkbox"], .dataTables_empty')) {
            return editRow.apply(e.currentTarget);
          }
        })
        // caller must add an element with this class to serve as the delete trigger
        .on('click', '.delete-row-icon', deleteRow);
    }

    return this;
  };
})(jQuery);
