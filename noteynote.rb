require 'rubygems'
require 'sinatra'
require 'rufus/tokyo'
require 'json'
require 'haml'
require 'cgi'
require 'sinatra-authentication'

user_db_path = File.dirname(__FILE__) + '/db'

TcUserTable.cabinet_path = user_db_path

module JustusCreatedAt
  #change so it overrides []= and merges in these values before calling super(key, value)
  def created_at
    {'created_at' => Time.now.to_s, 'created_at_i' => Time.now.to_i.to_s }
  end
end

use Rack::Session::Cookie, :secret => "heyyyyyhihello"

class Note < Rufus::Tokyo::Table
  include JustusCreatedAt
  def initialize
    path = File.dirname(__FILE__)
    super(path + '/db/notes.tct')
    #upgrade tc and switch to :qgram
    set_index('body', :qgram, :keep)
    #set_index('body', :lexical, :keep)
    set_index('user_pk', :decimal, :keep)
    set_index('created_at_i', :decimal, :keep)
  end

  def []=(key, value)
    value.merge!(created_at)
    super
  end
end

class Tag < Rufus::Tokyo::Table
  include JustusCreatedAt
  def initialize
    path = File.dirname(__FILE__)
    super(path + '/db/tag.tct')
    set_index('work', :lexical, :keep)
    set_index('user_pk', :decimal, :keep)
  end

  def find_or_create_by_tag_and_owner(tag, owner)
    if tag != nil
      query_tag = self.query do |q|
        q.add 'user_pk', :numeq, owner
        q.add 'tag', :streq, tag
      end

      if query_tag != []
        self[query_tag[0].delete(:pk)] = query_tag[0].merge(created_at)
      else
        self[self.genuid.to_s] = {'user_pk' => owner, 'tag' => tag}.merge(created_at)
      end
    end
  end
end

helpers do
  def totalFromCharcodes(text)
    total = 0
    text.each_byte do |c|
      total += c
    end
    total
  end
end

get '/' do
  if logged_in?
    tag_connection = Tag.new
    #change to cabinet, use tag_connection.keys(:prefix => current_user[:pk])
    @tags = tag_connection.query do |q|
      q.add 'user_pk', :numeq, current_user[:pk]
      q.order_by 'created_at_i', :numdesc
      q.limit 50
    end
    tag_connection.close
  end

  haml :index
end

post '/notes' do
  login_required
  ##twitter posts update to twitter? #facebook posts to facebook? Only if I add that crap to sinatra-auth
  #I wish qgram worked.... :(
  tag_regexp = /(^#[^ ]*)| (#[^ ]*)/
  tags = params[:note][:body].scan(tag_regexp)
  #note_body = params[:note][:body]
  note_body = CGI.escapeHTML(params[:note][:body])
  note_body.gsub!(/(\n)/, '\1 ')

  note_connection = Note.new
  note_pk = params[:note][:pk] ? params[:note][:pk].to_s : note_connection.genuid.to_s
  note = note_connection[note_pk] = {'body' => note_body, 'user_pk' => current_user[:pk]}
  note.merge!({'pk' => note_pk})
  note_connection.close

  tag_connection = Tag.new
  tags.each do |tag|
    tag_connection.find_or_create_by_tag_and_owner(tag, current_user[:pk])
  end
  query_tags = tag_connection.query do |q|
    q.add 'user_pk', :numeq, current_user[:pk]
    q.order_by 'created_at_i', :numdesc
    q.limit 50
  end

  tag_connection.close

  {'tags' => query_tags, 'note' => note}.to_json
end

get '/notes' do
  content_type :json
  login_required

  note_connection = Note.new

  if params[:q] == ''
    @notes = note_connection.query do |q|
      q.add 'user_pk', :numeq, current_user[:pk]
      #but in rufus tokyo, with qgram index maybe... I have to include this in the query otherwise I get nil.
      q.add 'body', :strinc, ''
      q.order_by 'created_at_i', :numdesc
    end
  else
    tokens = params[:q].split(' ').join(',')

    @notes = note_connection.query do |q|
      q.add 'user_pk', :numeq, current_user[:pk]
      #this makes each tag get treated as unique. a query for #user will not bring up #user-notes.
      q.add 'body', :strand, tokens
      q.order_by 'created_at_i', :numdesc
    end

    if @notes == []
      @notes = note_connection.query do |q|
        q.add 'user_pk', :numeq, current_user[:pk]
        q.add 'body', :ftsand, tokens
        q.order_by 'created_at_i', :numdesc
      end
    end
  end

  note_connection.close

  {'notes' => @notes}.to_json
end

get '/notes/:note_pk/delete' do
  login_required

  note_connection = Note.new

  success = note_connection.delete(params[:note_pk])

  note_connection.close

  !!success
end

get '/notes/:note_pk/move' do
  login_required

  note_connection = Note.new

  note = note_connection[params[:note_pk]]
  #if params[:value]
  #  move = params[:value].to_i
  #else
  #  move = -1
  #end
  #plus or minus zero for now. So it can only be 1 0 or -1
  if note['position'].to_i >= 0
    note['position'] = -1
  else
    note['position'] = 0
  end
  puts note['position']

  success = note_connection[params[:note_pk]] = note

  note_connection.close

  !!success
end

get '/tags' do
  login_required

  tag_connection = Tag.new
  tags = tag_connection.query do |q|
    q.add 'user_pk', :numeq, current_user[:pk]
    q.add 'tag', :starts_with, params[:q] if params[:q]
    q.limit params['limit'].to_i if params['limit']
    q.limit 50 unless params['limit']
  end
  tag_connection.close
   
  tags.collect { |tag| tag['tag'] }.join("\n")
end

get '/tags/:tag_pk/delete' do
  login_required

  tag_connection = Tag.new

  success = tag_connection.delete(params[:tag_pk])

  tag_connection.close

  !!success
end

get '/instructions' do
  haml :instructions, :layout => false
end
