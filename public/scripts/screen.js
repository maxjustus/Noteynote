var tag_regexp = /(?:[^\w]|^)(#[\w-_]*)/g;
var tag_list = [];
var availableTags = [];

var app = $.sammy(function() { with(this) {
  get('', function() { with(this){
    $('#main-loading-container').show();
    var url = $('#note-form').attr('action');
    if (url !== null) {
      $.getJSON(
        $('#note-form').attr('action'),
        {'q': ''},
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
        $('#rightbar').removeClass('full_width');
        $('.form-edit-content').remove();
        $('#post').attr('value', 'post');
        $('#search').show();
        $('#date-slider-container').show();
        $('.view_all').show();
        build_list(data);
        $('#query').val(query);
        $('#query').focus();
        $('#query').setCursorPosition(0);
      }
    });
  }});
}});

function build_list(data) {
  $('#tags ul').html('');
  tag_list = [];
  availableTags = [];
  $('#main-loading-container').hide();
  var results_output = '<ul id="current">';
  var archive_output = '<ul id="archive"><li class="toggle">Archived</li>';
  var archive_note_output = '';
  notes = data.notes;

  var d = new Date();
  var slider_val = $('#date-slider').slider('value');
  date_limit = (d.getTime() / 1000) - slider_val * 604800;

  $.each(notes, function() {
    var note_style = '';
    if (this.created_at_i < date_limit && slider_val != 0) {
      note_style = 'display: none;';
    }
    var note_output = '';
    note_output += '<li id="' + this.created_at_i + '-post" style="' + note_style + '" >';
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
  archive_output += archive_note_output + '</ul>';
  $('#results').append(archive_output);
  build_tag_list();

  $('#results li').hover(function(){
    $(this).children('.options').show();
  },
  function(){
    $(this).children('.options').hide();
  });
}

function build_tag_list(data) {
  //tags = data;
  tag_list = tag_list.sort();
  //new_tag_list = tag_list;
  var tags_output = '<ul>';
  for(i = 0; i < tag_list.length; i++) {
    tag = tag_list[i];
    if (tag != tag_list[i - 1]) {
      //tags_output += '<li>' + '<a class="delete tag-delete" href="/tags/' + tag + '/delete" ></a>' + '<a class="tag' + colorClassFromString(tag) + '" href="#/notes/' + tag + '" >' + tag + '</a>' + '</li>';
      tags_output += '<li>' + '<a class="tag' + colorClassFromString(tag) + '" href="#/notes/' + tag + '" >' + tag + '</a>' + '</li>';
      availableTags.push(tag);
    }
  }
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
      if(s1 != '#') {
        tag_list.push(s1);
      }
      //$('#tags ul').append('<li>' + '<a class="delete tag-delete" href="/tags/' + s1 + '/delete" ></a>' + '<a class="tag' + colorClassFromString(s1) + '" href="#/notes/' + s1 + '" >' + s1 + '</a>' + '</li>');
      return ' <a class="tag' + colorClassFromString(s1) + '" href="#/notes/' + s1 + '">' + s1 + '</a>'
    });
    return tag_parsed_output;
  }
}

$(function() {
  $('#date-slider').slider({
    value: fetchSliderVal(),
    min: 0,
    max: 4,
    step: 1,
    slide: function(event, ui){
      $.cookie('date-slider-value', ui.value, {expires: 7});
      fetchSliderVal();
    },
    change: function(event, ui){
      hidePostsOlderThenSlider(ui.value);
    }
  });

  app.run();

  $('#toggle_tags_full_width').click(function(){
    $('#rightbar').toggleClass('full_width');
    return false;
  });

  $('#search, #post, #cancel').button();

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
    var link = this;
    $.get(
      $(this).attr('href'),
      {},
      function(data) {
        $('#main-loading-container').hide();
        var value = $('#query').val();
        //app.runRoute('get', '#/notes/' + value);
        //$('#main-loading-container').show();
        var note = $(link).closest('li');
        $(note).find('.created_at').html('just now');
        if ($(note).closest('#archive').length == 1) {
          $('#current').prepend(note);
        } else {
          $('#archive .toggle').after(note);
        }
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

    $('.view_all').hide();
    $('#search').hide();
    $('#date-slider-container').hide();
    $('#edit-pk').html(hidden_pk_text);
    $('#edit-cancel').html(cancel_button_text).find('input').button();
    $('#post').attr('value', 'update');
    $('#query').focus();
    $(window).scrollTop('#query');

    $('#bottom-buttons .cancel').click(function(){
      $('#query').val(previous_value);
      $('#post').attr('value', 'post');
      $('.view_all').show();
      $('#search').show();
      $('#date-slider-container').show();
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

  /*$('#query').autocomplete('/tags', {multiple: true, multipleSeparator: ' ', selectFirst: true, delay: 200, max: 1, width: 'auto', minChars: 3});*/

  $('a[rel*=modal]').click(function(){
    modalBox(this);
    return false;
  });

  function split( val ) {
    return val.split( /[ \n]/ );
  }
  function extractLast( term ) {
    return split( term ).pop();
  }

  function extractWordAt(text, offset) {
    var word_start = offset - 1;
    var word_end = offset - 1;

    while(text[word_end] != ' ' && text[word_end] != '\n' && word_end < text.length) {
      word_end++;
    }

    while(text[word_start - 1] != ' ' && text[word_start -1] != '\n' && word_start > 0) {
      if(text[word_start] != undefined) {
        word_start--;
      }
    }

    var word = text.slice(word_start, word_end);

    //console.log(word);
    //console.log(word_start);
    //console.log(word_end);

    return {word: word, start: word_start, end: word_end};
  }

  $("#query").autocomplete({
    source: function( request, response ) {
        // delegate back to autocomplete, but extract the last term

        var word = extractWordAt( $('#query').val(), $('#query').caret().start).word;
        if(word.indexOf('#') != -1) {
          if ((word.length == 1 || availableTags.fuzzy_has(word) == false) && (window.location.hash != '')) {
            $.get('/tags', {q: word}, function(r){
              if(r != '') {
                var tag_array = r.split(',');
                response(tag_array);
              } else {
                return false;
              }
            });
          } else {
            response($.ui.autocomplete.filter(availableTags, word));
          }
        } else {
          $('#query').autocomplete('close');
          return false;
        }
        //response($.ui.autocomplete.filter(availableTags, extractWordAt( $('#query').val(), $('#query').caret().start).word));
      },
    focus: function() {
            // prevent value inserted on focus
            return false;
          },
    select: function( event, ui ) {
            var old_value = this.value;
            var word = extractWordAt(this.value, $(this).caret().start);
            string_upto = old_value.substring(0, word.start);
            console.log(word.start);
            console.log(word.end);
            string_after = old_value.substring(word.end, old_value.length);
            new_value_upto = string_upto + ui.item.value;
            new_value = new_value_upto + string_after;
            this.value = new_value;
            $(this).setCursorPosition(new_value_upto.length);
            return false;
          }
  });

  $('#query').keyup(function(e){
    var word = extractWordAt( $('#query').val(), $('#query').caret().start).word;
    if(word.indexOf('#') != -1 && e.which != 13) {
      $('#query').autocomplete('enable');
    } else {
      $('#query').autocomplete('disable').autocomplete('close');
    }
  });

/* end document.ready */
});

function hidePostsOlderThenSlider(value) {
  var d = new Date();
  limit = (d.getTime() / 1000) - value * 604800;
  $('#results li').each(function(){
    if (value == 0) {
      $(this).attr('style', '');
    } else {
      var id = $(this).attr('id');
      if(id != '') {
        var created_at = parseInt($(this).attr('id'));
        //console.log(created_at);
        //console.log(limit);
        if (created_at > limit) {
          $(this).attr('style', '');
        } else {
          $(this).css('display', 'none');
        }
      }
    }
  });
}

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

function fetchSliderVal() {
  //I know it's not as efficient to fetch this right after setting it, but it's more DRY
  var slider_val = $.cookie('date-slider-value');
  var value_text = 'All notes';
  if(slider_val > 0) {
    if(slider_val == 1) {
      value_text = '1 week old';
    } else {
      value_text = slider_val + ' weeks old';
    }
  }

  $('#date-slider-value').text(value_text);

  if(slider_val == undefined) {
    return 0;
  } else {
    return slider_val
  }
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

Array.prototype.has = function(v) {
  for (var i = 0; i < this.length; i++){
    if (this[i] == v) return i;
  }

  return false;
}

Array.prototype.fuzzy_has = function(v) {
  v_regexp = eval('/' + v + '/gi');
  for (var i = 0; i < this.length; i++){
    console.log(this[i]);
    if (v_regexp.test(this[i])) {
      //return i;
      return true;
    }
  }

  return false;
}
