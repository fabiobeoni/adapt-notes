define([
    'backbone',
    'coreJS/adapt',
    './adapt-notesView',
], function(Backbone, Adapt, notesView) {

    Adapt.once('app:dataReady', function() {

        var notesExtConfig = Adapt.course.get('_notes');

        if(notesExtConfig._isEnabled === false) return;

        var drawerObject = {
            title: notesExtConfig.title,
            description: notesExtConfig.description,
            className: 'notes-drawer'
        };

        // Syntax for adding a Drawer item
        Adapt.drawer.addItem(drawerObject, 'adaptNotes:showContentObjects');

        Adapt.on('adaptNotes:showContentObjects', function() {
            Adapt.drawer.triggerCustomView(new notesView().$el);
        });
    });

});
