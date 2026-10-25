package de.gigflow.backend.event;

import java.util.List;

public class EventAccessResponse {

    private EventEditPolicy editPolicy;
    private List<Long> editorUserIds;

    public EventAccessResponse(EventEditPolicy editPolicy, List<Long> editorUserIds) {
        this.editPolicy = editPolicy;
        this.editorUserIds = editorUserIds;
    }

    public EventEditPolicy getEditPolicy() {
        return editPolicy;
    }

    public List<Long> getEditorUserIds() {
        return editorUserIds;
    }

}
