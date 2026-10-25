package de.gigflow.backend.event;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public class EventAccessRequest {

    @NotNull
    private EventEditPolicy editPolicy;

    private List<Long> editorUserIds = List.of();

    public EventEditPolicy getEditPolicy() {
        return editPolicy;
    }

    public void setEditPolicy(EventEditPolicy editPolicy) {
        this.editPolicy = editPolicy;
    }

    public List<Long> getEditorUserIds() {
        return editorUserIds;
    }

    public void setEditorUserIds(List<Long> editorUserIds) {
        this.editorUserIds = editorUserIds == null ? List.of() : editorUserIds;
    }
}
