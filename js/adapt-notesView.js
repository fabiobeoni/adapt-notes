define(function(require) {

    var Backbone = require('backbone');
    var Adapt = require('coreJS/adapt');
    var Base64 = require('./base64');

    var $Notes = function (Adapt,selector) {

        var _notesExtConfig={};
        var _notes = [];
        var _note = null;

        var BASE64_PREFIX = 'data:;base64,';
        var STORAGE_KEY = ('adaptNotes-'+Adapt.config.attributes._id);


        var ui = {
            noteItemTemplate:null,
            $main:function () {
                return $(selector);
            },
            $notesList:function () {
                return this.$main().find('[data-notes-list]');
            },
            $noteItemTemplate:function () {
                if(!this.noteItemTemplate){
                    this.noteItemTemplate = this.$main().find('[data-note-template]').html();
                    this.$main().find('[data-note-template]').remove();
                }

                return $(this.noteItemTemplate);
            },
            $noteEditor:function () {
                return this.$main().find('[data-note-editor]');
            },
            $noteTitle:function () {
                return ui.$noteEditor().find('[data-note-title]');
            },
            $noteText:function () {
                return ui.$noteEditor().find('[data-note-text]');
            },
            $saveBtn:function () {
                return ui.$noteEditor().find('[data-note-save]');
            },
            $deleteBtn:function () {
                return ui.$noteEditor().find('[data-note-delete]');
            },
            $cancelBtn:function () {
                return ui.$noteEditor().find('[data-note-cancel]');
            },
            $newBtn:function () {
                return ui.$main().find('[data-note-new]');
            },
            $exportBtn:function () {
                return ui.$main().find('[data-note-export]');
            },
            $importBtn:function () {
                return ui.$main().find('[data-note-import]');
            },
            $toDocumentBtn:function () {
                return ui.$main().find('[data-note-to-document]');
            },
            $notesCommandBar:function () {
                return ui.$main().find('[data-notes-bar]');
            },
            $search:function () {
                return ui.$main().find('[data-note-search]');
            },
            $infoMessage:function () {
                return ui.$main().find('[data-notes-note]');
            },
            $fileUpload:function () {
                return ui.$main().find('#file-upload');
            }
        };


        function constructor(){

            //gets the adaptNotes config
            _notesExtConfig = Adapt.course.get('_notes');

            //checks requirements
            if(!window.FileReader || !window.localStorage)
            {
                alert(_notesExtConfig.browserWarn);
                return;
            }

            //add button listeners
            ui.$newBtn().on('click',_stateNewNote);
            ui.$cancelBtn().on('click',_stateList);
            ui.$saveBtn().on('click',_onSave);
            ui.$deleteBtn().on('click',_onDelete);
            ui.$exportBtn().on('click',_onExport);
            ui.$toDocumentBtn().on('click',_onExportToDocument);
            ui.$search().on('change',_onSearch);
            ui.$fileUpload().on('change',_onUpload);

            //reads teh tmp and removes it
            ui.$noteItemTemplate();

            //default
            ui.$exportBtn().hide();
            ui.$toDocumentBtn().hide();
            ui.$notesList().hide();

            //creates UI, list of notes if any
            _stateList();
        }

        function _stateList(){
            _note = null;
            _readData(function () {
                ui.$noteEditor().hide();
                ui.$noteEditor().find('form')[0].reset();
                ui.$newBtn().show();
                ui.$importBtn().show();
                ui.$notesCommandBar().show();

                if(_notes.length>0){
                    ui.$exportBtn().show();
                    ui.$toDocumentBtn().show();
                    ui.$notesList().show();
                    ui.$search().show();
                    ui.$infoMessage().hide();

                    _renderNotes(_notes);
                }
                else{
                    ui.$exportBtn().hide();
                    ui.$toDocumentBtn().hide();
                    ui.$notesList().hide();
                    ui.$search().hide();
                    ui.$infoMessage().show();
                }
            });
        }

        function _stateNewNote() {
            _note = null;
            ui.$noteEditor().show();
            ui.$notesCommandBar().hide();
            ui.$notesList().hide();
        }

        function _stateEditNote(ev) {
            _note = ev.data.note;
            ui.$noteTitle().val(_note.title);
            ui.$noteText().val(_note.text);

            ui.$noteEditor().show();
            ui.$notesCommandBar().hide();
            ui.$notesList().hide();
        }

        function _onSave(){

            var title = ui.$noteTitle().val();
            var text = ui.$noteText().val();

           if(
               title && title.trim().length>0 &&
               text && text.trim().length>0
           ){
               if(_note) //updates
                   _notes[_note.index] = {
                       title:ui.$noteTitle().val(),
                       text:ui.$noteText().val()
                   };
               else //add new one
                   _notes.push({
                       id:_notes.length,
                       title:ui.$noteTitle().val(),
                       text:ui.$noteText().val()
                   });

               _saveData(_stateList);
           }
           else
               alert(_notesExtConfig.validationWarn);
        }

        function _onDelete() {
            if(_note){
                _notes.splice(_note.index,1);
                _saveData(_stateList);
            }
        }

        function _onExport() {
            var href = ui.$exportBtn().attr('data-href');

            //preserves white spaces in text
            var content = escape(JSON.stringify(_notes));

            href = href.replace('@content', content);

            ui.$exportBtn().attr('href', href);
        }
        
        function _onExportToDocument() {
            var href = ui.$toDocumentBtn().attr('data-href');

            var content = '';
            $(_notes).each(function (i,note) {
                content += '<h3>'+(i+1)+'. '+note.title+'</h3>';
                content += '<p>'+note.text+'</p><br/>';
            });

            //preserves spaces in text
            content = escape(content);

            href = href.replace('@content', content);
            ui.$toDocumentBtn().attr('href', href);
        }

        function _onSearch() {
            var searchValue = ui.$search().val();
            if(searchValue){
                var keys = searchValue.split(' ');

                var results = [];
                $(keys).each(function (i,key) {
                    var filtered = $.grep(_notes,function (note,i) {
                        return (
                            note.title.toLowerCase().indexOf(key.toLowerCase())!==-1 ||
                            note.text.toLowerCase().indexOf(key.toLowerCase())!==-1
                        );
                    });
                    if(filtered && filtered.length>0)
                        results = results.concat(filtered);
                });

                if(results.length>0)
                    _renderNotes(results);
            }
            else
                _renderNotes(_notes);
        }

        function _onUpload(){
            var files = ui.$fileUpload()[0].files;
            if (files && files[0]) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    try{
                        if(e.target.result && e.target.result.trim().length>0){
                            var content = e.target.result.replace(BASE64_PREFIX,'');
                            content = Base64.decode(content);
                            content = JSON.parse(content);
                            _notes = content;
                            _saveData(_stateList);
                        }
                    }
                    catch (err){
                        alert(_notesExtConfig.fileReadError);
                    }
                };

                reader.readAsDataURL(files[0]);
            }
        }

        function _renderNotes(notesList) {
            ui.$notesList().empty();
            $(notesList).each(function (i,note) {
                var $noteItem = ui.$noteItemTemplate();
                $noteItem.attr('data-notes-index', i);
                $noteItem.find('[data-note-title]').text(note.title);
                $noteItem.find('[data-note-text]').text(note.text);

                //add custom field
                note.index = i;

                $noteItem.on('click',{note:note},_stateEditNote);
                ui.$notesList().append($noteItem);
            });
        }

        function _readData(callback) {
            var storedNotes = localStorage.getItem(STORAGE_KEY);
            _notes = JSON.parse(storedNotes) || [];
            return callback();
        }

        function _saveData(callback) {
            localStorage.setItem(STORAGE_KEY,JSON.stringify(_notes));
            return callback();
        }


        constructor();
    };


    return Backbone.View.extend({
        className: "adaptNotes",

        initialize: function() {
            this.listenTo(Adapt, 'remove', this.remove);
            this.render();
        },

        render: function() {
            this.$el.html(Handlebars.templates["notes"]());
            _.defer(_.bind(this.postRender, this));
            return this;
        },

        postRender: function() {
            this.listenTo(Adapt, 'drawer:triggerCustomView', this.remove);
            $Notes(Adapt,('.'+this.className));
        }
    });
});
