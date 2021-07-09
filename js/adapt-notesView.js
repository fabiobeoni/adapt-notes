/**
 * This view displays the NoteEditor.
 * Normally this class should be a
 * Backbone component, but since I
 * want to reuse a notes editor I
 * have already coded in JQuery,
 * I'm just wrapping it into this
 * Backbone view. Since it works
 * independently from the Backbone
 * view lifecycle, it runs on
 * postRender event, when the
 * Backbone template has been loaded
 * and injected into the drawer view.
 */
define(function(require) {

    var Backbone = require('backbone');
    var Adapt = require('coreJS/adapt');
    var Base64 = require('./base64');

    /**
     * Initializes the notes editor component
     * that manages the all editing and presenting
     * of notes.
     * @param Adapt {object} the adapt configuration
     * @param selector {string}
     * @constructor
     */
    var NotesEditor = function (Adapt,selector) {

        var BASE64_PREFIX = 'data:;base64,';

        /**
         * The key in use to store notes in
         * the browser local storage
         * @type {string}
         */
        var STORAGE_KEY = ('adaptNotes-'+Adapt.config.attributes._id);

        /**
         * AdaptNotes plugin configuration object
         * set by the course author by the authoring
         * tool.
         * @type {object}
         * @private
         */
        var _notesExtConfig={};

        /**
         * List of notes stored on device
         * and displayed on view
         * @type {Array}
         * @private
         */
        var _notes = [];

        /**
         * The current selected note from
         * the user, ready to edit.
         * @type {object}
         * @private
         */
        var _note = null;

        /**
         * All view elements managed by the
         * editor like notes list, buttons and so on
         * @type {{noteItemTemplate: null, $main: $main, $notesList: $notesList, $noteItemTemplate: $noteItemTemplate, $noteEditor: $noteEditor, $noteTitle: $noteTitle, $noteText: $noteText, $saveBtn: $saveBtn, $deleteBtn: $deleteBtn, $cancelBtn: $cancelBtn, $newBtn: $newBtn, $exportBtn: $exportBtn, $importBtn: $importBtn, $toDocumentBtn: $toDocumentBtn, $notesCommandBar: $notesCommandBar, $search: $search, $infoMessage: $infoMessage, $fileUpload: $fileUpload}}
         */
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

        /**
         * Sets the view on state "display notes list".
         * Loads the notes from local storage and renders
         * the notes. Then updates all ui element accordingly.
         * @private
         */
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

        /**
         * Sets the view on editing state
         * by displaying the editor form,
         * and hiding the list of notes.
         * @private
         */
        function _stateNewNote() {
            _note = null;
            ui.$noteEditor().show();
            ui.$notesCommandBar().hide();
            ui.$notesList().hide();
        }

        /**
         * Sets the view on editing state
         * by displaying the editor form,
         * and hiding the list of notes.
         * @private
         */
        function _stateEditNote(ev) {
            _note = ev.data.note;
            ui.$noteTitle().val(_note.title);
            ui.$noteText().val(_note.text);

            ui.$noteEditor().show();
            ui.$notesCommandBar().hide();
            ui.$notesList().hide();
        }

        /**
         * Validates the form data and
         * add/update the editing note.
         * Then reload the list of notes.
         * @private
         */
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

               //saved, now reloads the list of notes
               _saveData(_stateList);
           }
           else
               alert(_notesExtConfig.validationWarn);
        }

        /**
         * Deletes the current editing
         * note from the local storage
         * @private
         */
        function _onDelete() {
            if(_note){
                _notes.splice(_note.index,1);
                _saveData(_stateList);
            }
        }

        /**
         * Converts the notes object to text
         * string and saves it into a link
         * url in the view. The link is set
         * to force the download of the
         * resource, so the string content
         * gets downloaded by the user as
         * a text file (backup purposes)
         * @private
         */
        function _onExport() {
            var href = ui.$exportBtn().attr('data-href');

            //preserves white spaces in text
            var content = encodeURIComponent(JSON.stringify(_notes));

            href = href.replace('@content', content);

            ui.$exportBtn().attr('href', href);
        }

        /**
         * Converts the notes object to HTML
         * code string, and saves it into a link
         * url in the view. The link is set
         * to force the download of the
         * resource, so the string content
         * gets downloaded by the user as
         * an HTML file (for printing)
         * @private
         */
        function _onExportToDocument() {
            var href = ui.$toDocumentBtn().attr('data-href');

            var content = '';
            $(_notes).each(function (i,note) {
                content += '<h3>'+(i+1)+'. '+note.title+'</h3>';
                content += '<p>'+note.text+'</p><br/>';
            });

            //preserves spaces in text
            content = encodeURIComponent(content);

            href = href.replace('@content', content);
            ui.$toDocumentBtn().attr('href', href);
        }

        /**
         * Filters the list of notes displayed
         * on view by the searching keys.
         * Keys must be separated by white space,
         * search is performed in all note fields
         * and it is case-insensitive.
         * @private
         */
        function _onSearch() {

            //when keys are available runs the search
            var searchValue = ui.$search().val();
            if(searchValue){
                var keys = searchValue.split(' ');

                //makes a list of filtered notes
                //and displays them instead of the
                //original once, if the filter
                //returns some value.
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
            //when no keys, resets the filter
            // and displays all notes
            else
                _renderNotes(_notes);
        }

        /**
         * This function is invoked when the user
         * requests to "upload" a notes backup file
         * from the device. Any existing note will
         * be replaced with the backup.
         * @private
         */
        function _onUpload(){
            //reads the file from user device
            var files = ui.$fileUpload()[0].files;
            if (files && files[0]) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    try{
                        if(e.target.result && e.target.result.trim().length>0){
                            //decodes the base64 content of the backup
                            //updates teh notes in the local storage
                            //and on view
                            var content = e.target.result.replace(BASE64_PREFIX,'').replace('data:application/octet-stream;base64,','');
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

        /**
         * Renders the list of given notes
         * to the view template and registers
         * an event listener on each note item
         * to display the note editing form
         * on selection.
         * @param notesList {object[]}
         * @private
         */
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

        /**
         * Reads notes from the browser local storage.
         * @param callback {function}
         * @return {function}
         * @private
         */
        function _readData(callback) {
            try{
                var storedNotes = localStorage.getItem(STORAGE_KEY);
                _notes = JSON.parse(storedNotes) || [];
                return callback();
            }
            catch (err){
                alert('Error reading the notes on browser storage.');
                console.error(err);
            }
        }

        /**
         * Saves the notes on browser local storage.
         * @param callback {function}
         * @return {function}
         * @private
         */
        function _saveData(callback) {
            try{
                localStorage.setItem(STORAGE_KEY,JSON.stringify(_notes));
                return callback();
            }
            catch (err){
                alert('Could not save notes to browser storage. Please check the storage quota.');
                console.error(err);
            }
        }


        constructor();
    };

    //acts just as a wrapper around the
    //NoteEditor done with JQuery
    return Backbone.View.extend({
        className: "adaptNotes",

        //basic ini available for all plugins
        //like this one
        initialize: function() {
            this.listenTo(Adapt, 'remove', this.remove);
            this.render();
        },

        //loads the UI template from .hbs file
        //and renders it.
        render: function() {
            this.$el.html(Handlebars.templates["notes"]());
            _.defer(_.bind(this.postRender, this));
            return this;
        },

        //Here actually make the plugin working
        //since the NotesEditor object is the one
        //that hosts all the logic needed.
        postRender: function() {
            this.listenTo(Adapt, 'drawer:triggerCustomView', this.remove);
            NotesEditor(Adapt,('.'+this.className));
        }
    });
});
