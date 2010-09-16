var tag_regexp = /(#[^ ]*)/g;

var app = $.sammy(function() { with(this) {
  get('', function() { with(this){
    $('#main-loading-container').show();
    var url = $('#note-form').attr('action');
    if (url !== null) {
      $.getJSON(
        $('#note-form').attr('action'),
        {'q': $('#query').val()},
        build_list
      );
    }
  }});

  get('#/notes/:q', function(){ with(this) {
    var query = unescape(params['q']);
    $('#main-loading-container').show();
    $.ajax({
      /* /notes doesn't repopulate the tag bar, it should if the data is available */
      dataType: 'json',
      url: '/notes',
      data: {'q': query},
      async: false,
      success: function(data){
        /* this stuff doesn't belong here... */
        $('.form-edit-content').remove();
        $('#post').attr('value', 'post');
        $('#search').show();
        $('#view_all').show();
        build_list(data);
        $('#query').val(query);
        $('#query').focus();
        $('#query').setCursorPosition(0);
      }
    });
  }});
}});

function build_list(data) {
  $('#main-loading-container').hide();
  var results_output = '<ul>';
  var archive_output = '<ul id="archive"><li class="toggle">Archived</li>';
  var archive_note_output = '';
  notes = data.notes;
  $.each(notes, function() {
    note_output = ''
    note_output += '<li>';
    note_output += '<input type="hidden" class="note_pk" value="' + this.pk + '" />';
    note_output += '<div class="options">';
    note_output += '<a class="delete" href="/notes/' + this.pk + '/delete" ></a>';
    note_output += '<a class="edit" href="/notes" ></a>';
    note_output += '<a class="archive" href="/notes/' + this.pk + '/move" ></a>';
    note_output += '</div>';
    note_output += '<span class="text">' + parse_text(this.body) + '</span>' + ' <span class="created_at">' + prettyDate(this.created_at) +'</span>' + '</li>';
    if(this.position == 0 || this.position == undefined) {
      results_output += note_output;
    } else {
      archive_note_output += note_output;
    }
  });
  results_output += '</ul>';
  $('#results').html(results_output);
  if(archive_note_output != '') {
    archive_output += archive_note_output + '</ul>';
    $('#results').append(archive_output);
  }

  $('#results li').hover(function(){
    $(this).children('.options').show();
  },
  function(){
    $(this).children('.options').hide();
  });

  /*$('#results li .options').toggle(function(){
    $(this).children().show(100);
    return true;
  },
  function(){
    $(this).children().hide(100);
    return true;
  });*/
}

function build_tag_list(data) {
  tags = data.tags;
  var tags_output = '<ul>';
  $.each(tags, function() {
    tags_output += '<li>' + '<a class="delete tag-delete" href="/tags/' + this.pk + '/delete" ></a>' + '<a class="tag' + colorClassFromString(this.tag) + '" href="#/notes/' + this.tag + '" >' + this.tag + '</a>' + '</li>';
  });
  tags_output += '</ul>';
  $('#tags').html(tags_output);
}

function parse_text(text) {
  return parse_tags(parse_links(text));

  function parse_links(input) {
      return input
      .replace(/(ftp|http|https|file):\/\/[\S]+(\b|$)/gim,
  '<a href="$&" class="my_link" target="_blank">$&</a>')
      .replace(/([^\/])(www[\S]+(\b|$))/gim,
  '$1<a href="http://$2" class="my_link" target="_blank">$2</a>');
  } 

  function parse_tags(input) {
    /*fix for newlines */
    newlines_replaced_output = input.replace(/\n/gi, '<br />');
    tag_parsed_output = newlines_replaced_output.replace(tag_regexp, function(str, s1, offset, s) {
      /* mod 7 for 8 color variations */
      return ' <a class="tag' + colorClassFromString(s1) + '" href="#/notes/' + s1 + '">' + s1 + '</a>'
    });
    return tag_parsed_output;
  }
}

$(document).ready(function() {
  app.run();
/*
  $(document).keyup(function(){
    text = $('#query').val();
    text = text.replace(/\* (.*)\n/gin, '<li><input type="checkbox"></input>$1</li>');
    $('#preview_pane').html(text);
  });
*/

  $('#query').expandable({duration: 0, interval: 100});

  $('.delete').live('click', function(){
    if(confirm('Are you sure?')) {
      $('#main-loading-container').show();
      element = this;
      $.get(
        $(this).attr('href'),
        {},
        function(data) {
          $('#main-loading-container').hide();
          if ($(element).hasClass('tag-delete')) {
            $(element).parent().remove();
          } else {
            $(element).parent().parent().remove();
          }
        }
      );
    }
    return false;
  });

  $('.archive').live('click', function(){
    $('#main-loading-container').show();
    element = this;
    $.get(
      $(this).attr('href'),
      {},
      function(data) {
        $('#main-loading-container').hide();
        var value = $('#query').val();
        //app.runRoute('get', '#/notes/' + value);
        $('#main-loading-container').show();
        $.ajax({
          /* /notes doesn't repopulate the tag bar, it should if the data is available */
          dataType: 'json',
          url: '/notes',
          data: {'q': value},
          async: false,
          success: function(data){
            /* this stuff doesn't belong here... */
            build_list(data);
          }
        });
      }
    );
    return false;
  });

  $('.edit').live('click', function(){
    note_text_element = $(this).parent().parent().children('.text').clone()
    note_text_current_html = note_text_element.html().replace(/<br> /g, '\n')
    note_text_element.html(note_text_current_html)
    note_text = note_text_element.text().replace(/^ */gm, '').replace(/ +/ig, ' ');
    list_element = $(this).parent().parent();
    /* list_element.children('.text').hide(); */
    /* form_text = '<div class="edit_note">';
    form_text += '<form method="post" action="' + $(this).attr('href') + '">'; */

    hidden_pk_text = '<input type="hidden" class="form-edit-content" name="note[pk]" value="' + $(list_element).children('.note_pk').attr('value') + '" />';
    cancel_button_text = '<input type="button" class="cancel form-edit-content" value="Cancel" />'

    /* form_text += '<textarea class="edit_text" name="note[body]"></textarea>';
    form_text += '</form>';
    form_text += '</div>'; */
    previous_value = $('#query').val();
    $('#query').val(note_text);

    $('#view_all').hide();
    $('#search').hide();
    $('#edit-pk').html(hidden_pk_text);
    $('#edit-cancel').html(cancel_button_text);
    $('#post').attr('value', 'update');
    $('#query').focus();
    $(window).scrollTop('#query');

    $('#bottom-buttons .cancel').click(function(){
      $('#query').val(previous_value);
      $('#post').attr('value', 'post');
      $('#view_all').show();
      $('#search').show();
      $('.form-edit-content').remove();
    });
    /*
    $('#query').val(note_text);
    element = this;
    $('#query').focus();
    $('#query').setCursorPosition(0);
    $.get(
          $(this).attr('href'),
          {},
          function(data) {
            $(element).parent().remove();
          }
    ); */
    return false;
  });

  $('.tag').live('click', function(e){
    if (e.shiftKey) {
      e.preventDefault();
      if (window.location.hash != '') {
        app.setLocation(window.location + ' ' + $(this).text());
      } else {
        app.setLocation('#/notes/ ' + $(this).text());
      }
      return false;
    } else {
      if (escape(window.location.hash) == escape('#/notes/ ' + $(this).text())) {
        app.runRoute('#/notes/ ' + $(this).text());
      } else {
        app.setLocation('#/notes/ ' + $(this).text());
      }
      return false;
    }
  });

  $('#query').bind('keydown', 'Ctrl+return', function(e){
    e.preventDefault();
    $('#note-form').submit();
    $('#query').blur().focus();
  });

  $(document).bind('keydown', 'Alt+p', function(e){
    e.preventDefault();
    $(window).scrollTop('#query');
    $('#query').focus();
    $('#query').setCursorPosition(0);
  });

  $(document).bind('keydown', 'Meta+p', function(e){
    e.preventDefault();
    $('#query').focus();
    $('#query').setCursorPosition(0);
  });

  $('#query').bind('keydown', 'Alt+return', function(e){
    e.preventDefault();
    $('#post').click();
    $('#query').blur().focus();
  });

  $('#query').bind('keydown', 'Meta+return', function(e){
    e.preventDefault();
    $('#post').click();
    $('#query').blur().focus();
  });

  $(document).bind('keydown', 'Meta+a', function(e){
    e.preventDefault();
    app.setLocation('/');
  });

  $('#query').bind('keydown', 'Alt+a', function(e){
    e.preventDefault();
    app.setLocation('/');
  });

  $(document).bind('keydown', 'Alt+a', function(e){
    e.preventDefault();
    app.setLocation('/');
  });

  $(document).bind('keydown', 'esc', function(e){
    $('#query').blur();
  });

  /* I should change this to be sammy too, because then I can get all the postback data from the server */
  $('#note-form').submit(function() {
    var value = $('#query').val();
    app.setLocation('#/notes/' + value);
    return false;
  });

  $('#post').click(function() {
    if($('#query').val() != '') {
      $('#main-loading-container').show();
      var value = $('#query').val();
      var post_data = $('#note-form').serialize();
      var tags_match = value.match(tag_regexp);
      if (tags_match != null) {
        var tags = ' ' + tags_match.join(' ');
      } else {
        var tags = '';
      }
      $.ajax({
        /* /notes doesn't repopulate the tag bar, it should if the data is available */
        dataType: 'json',
        type: 'POST',
        url: $(this).parent().parent().attr('action'),
        data: post_data,
        async: false,
        success: function(data){
          build_tag_list(data);
          if (escape(window.location.hash) == escape('#/notes/' + tags)) {
            app.runRoute('get', '#/notes/' + tags);
          } else {
            app.setLocation('#/notes/' + tags);
          }
        }
      });
    }
    return false;
  });

  /* autocomplete_tags = [];
  $('#tags .tag').each(function(){
    autocomplete_tags.push($(this).html());
  }); */
  /* $('#query').autocomplete('/tags', {multiple: true, multipleSeparator: ' ', selectFirst: true, delay: 200, max: 1, width: 'auto', minChars: 3}); */

  $('a[rel*=modal]').click(function(){
    modalBox(this);
    return false;
  });

/* end document.ready */
});

function prettyDate(time) {
  var date = new Date(time || ""),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);
      
  if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
    return date.toDateString();
      
  return day_diff == 0 && (
    diff < 60 && "just now" ||
    diff < 120 && "1 minute ago" ||
    diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
    diff < 7200 && "1 hour ago" ||
    diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
    day_diff == 1 && "Yesterday" ||
    day_diff < 7 && day_diff + " days ago" ||
    day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
}

function modalBox(element) {
  url = $(element).attr('href');
  $('#modalbox .loading').show();
  $('#modalbox #content').hide();
  $('#modalbox').centerScreen();
  $('#modalbox').show()
  $.get(url, {}, function(data) {
    $('#modalbox .loading').hide();
    $('#modalbox #content').html(data + '<a href="#" class="close-modalbox">Close</a>');
    $('#modalbox #content').show();
    $('#modalbox').centerScreen();
    $('.close-modalbox').click(function(){
      $('#modalbox').hide();
      return false;
    });
  });
}

function colorClassFromString(text) {
  var total = 0
  for (var i = 0; i < text.length; i++) {
    total += text.charCodeAt(i);
  }

  return (' color-' + total % 7);
}

/* from http://groups.google.com/group/jquery-en/browse_thread/thread/a890828a14d86737?pli=1 */
/* really cool how it animates on window resize! */
$(document).ready(function() {
  jQuery.fn.centerScreen = function(loaded) {
    var obj = this;
    if(!loaded) {
      obj.css('top', $(window).height()/2 - this.height()/2);
      obj.css('left', $(window).width()/2 - this.width()/2);
      $(window).resize(function() {
        obj.centerScreen(!loaded);
      });
    } else {
      obj.stop();
      obj.animate(
        {
          top: $(window).height()/2 - this.height()/2,
          left: $(window).width()/2-this.width()/2
        },
        200,
        'linear'
      );
    }
  }
}); 

jQuery.fn.setCursorPosition = function(pos) {
  if ($(this).get(0).setSelectionRange) {
    $(this).get(0).setSelectionRange(pos, pos);
  } else if ($(this).get(0).createTextRange) {
    var range = $(this).get(0).createTextRange();
    range.collapse(true);
    range.moveEnd('character', pos);
    range.moveStart('character', pos);
    range.select();
  }
}
