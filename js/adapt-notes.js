/**
 * This plugin registers an extension for Adapt
 * providing a notes editor to the students taking
 * the course.
 * The editor list notes, edit them and search
 * for them. Notes are stored in the browser
 * localStorage, can be exported on text file
 * on the device.
 *
 * Here is all about configuring the Adapt
 * drawer object with minimum required
 * data.
 */
define([
    'backbone',
    'coreJS/adapt',
    './adapt-notesView',
], function(Backbone, Adapt, NotesView) {

    //waits for data ready to be able to access
    //plugin configuration into the course
    Adapt.once('app:dataReady', function() {

        //reads the config of this plugin that
        //the course author can change
        var notesExtConfig = Adapt.course.get('_notes');
        if(notesExtConfig._isEnabled === false) return;

        //sets up the drawer with config title and description
        //shown to the student
        var drawerObject = {
            title: notesExtConfig.title,
            description: notesExtConfig.description,
            className: 'notes-drawer'
        };

        // Syntax for adding a Drawer item
        Adapt.drawer.addItem(drawerObject, 'adaptNotes:showContentObjects');

        //registers the event listener to display
        //the plugin custom UI into the drawer
        //NotesView is initialized only when the
        //drawer displays, to the view HTML is
        //available.
        Adapt.on('adaptNotes:showContentObjects', function() {
            Adapt.drawer.triggerCustomView(new NotesView().$el);
        });
    });

});
